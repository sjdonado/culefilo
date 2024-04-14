import type { AppLoadContext } from '@remix-run/cloudflare';
import { DONE_JOB_MESSAGE, SearchJobStage, SearchJobState } from '~/constants/job';

import type { SearchJob, SearchJobParsed } from '~/schemas/job';
import { SearchJobParsedSchema } from '~/schemas/job';
import type { PlaceLocation } from '~/schemas/place';

import {
  getKVRecord,
  putKVRecord,
  runImageToTextRequest,
  runLLMRequest,
  runSummarizationRequest,
} from '~/services/cloudflare.server';

import {
  downloadPlacePhoto,
  getPlacesByTextAndCoordinates,
  type PlaceAPIResponse,
} from '~/services/places.server';

export async function createSearchJob(
  context: AppLoadContext,
  favoriteMealName: string,
  address: string,
  location: PlaceLocation
) {
  const key = crypto.randomUUID();

  const initState = SearchJobParsedSchema.parse({
    input: {
      favoriteMealName,
      address,
    },
    location,
    state: SearchJobState.Created,
    stage: SearchJobStage.Initial,
    createdAt: Date.now(),
    placesFetched: {},
    descriptions: [],
    thumbnails: [],
  });

  await putKVRecord(context, key, initState);

  return key;
}

export async function startOrCheckSearchJob(context: AppLoadContext, key: string) {
  const job = await getKVRecord<SearchJob>(context, key);

  const encoder = new TextEncoder();

  const encodeMessage = (message: string, percentage: number, time = Date.now()) =>
    encoder.encode(`data: ${time},${(percentage * 100).toFixed(1)},${message}\n\n`);

  // check if job is not running or completed
  if ([SearchJobState.Running, SearchJobState.Success].includes(job.state)) {
    console.log(
      `[${startOrCheckSearchJob.name}] (${key}) already running or completed: ${job.state}`
    );

    return encodeMessage(DONE_JOB_MESSAGE, 1);
  }

  const stream = new ReadableStream({
    async start(controller) {
      let inMemoryJob: SearchJobParsed = job;
      const logs: string[] = [];
      let progress = 0;

      const sendEvent = (message: string, percentage: number) => {
        const time = Date.now();

        controller.enqueue(encodeMessage(message, percentage, time));
        logs.push(`[${time}] ${message}`);
      };

      const increaseProgress = (increment: number) => (progress += increment);

      const updateSearchJobState = async (
        newSearchJob: SearchJobParsed,
        remote = false
      ) => {
        inMemoryJob = newSearchJob;

        if (remote) {
          await putKVRecord(context, key, newSearchJob);
        }
      };

      try {
        if (inMemoryJob.stage === SearchJobStage.Initial) {
          console.log(`[${startOrCheckSearchJob.name}] (${key}) started`);
          sendEvent('Search started...', progress);

          await updateSearchJobState(
            SearchJobParsedSchema.parse({
              ...inMemoryJob,
              state: SearchJobState.Running,
            })
          );

          const placesFetched: Record<string, PlaceAPIResponse['places'][0]> = {};

          const originalQuery = inMemoryJob.input.favoriteMealName;
          const coordinates = inMemoryJob.location.coordinates;

          async function searchAndAppendToAllPlaces(query: string, baseProgress = 0.01) {
            console.log(
              `[${startOrCheckSearchJob.name}] (${key}) places search - query ${query}`
            );
            sendEvent(
              `Looking for nearby places with "${query}"...`,
              increaseProgress(baseProgress)
            );

            const places = await getPlacesByTextAndCoordinates(
              context,
              query,
              coordinates
            );

            (places ?? []).forEach(place => {
              placesFetched[place.id] = place;
            });
          }

          await searchAndAppendToAllPlaces(originalQuery, 0.1);

          if (Object.keys(placesFetched).length < 3) {
            console.log(
              `[${startOrCheckSearchJob.name}] (${key}) LLM suggestions started`
            );

            sendEvent('Looking for suggestions...', increaseProgress(0.2));

            const response = await runLLMRequest(
              context,
              `Other names for this meal: "${originalQuery}"`,
              'return each name in quotes, omit explanations'
            );

            const suggestionsList =
              response.match(/"([^"]+)"/g)?.map(item => item.replace(/"/g, '')) ?? [];

            // remove duplicates
            const suggestions = Array.from(
              new Set(
                suggestionsList.map(s => s.toLowerCase()).filter(s => s !== originalQuery)
              )
            );

            if (suggestions.length === 0) {
              console.error(
                `[${startOrCheckSearchJob.name}] No suggestions found for ${originalQuery}: ${response}`
              );
            }

            console.log(
              `[${startOrCheckSearchJob.name}] (${key}) LLM suggestions: ${suggestions}`
            );

            while (Object.keys(placesFetched).length < 3 && suggestions.length > 0) {
              const query = suggestions.shift();
              await searchAndAppendToAllPlaces(query!);
            }
          }

          await updateSearchJobState(
            SearchJobParsedSchema.parse({
              ...inMemoryJob,
              stage: SearchJobStage.PlacesFetched,
              placesFetched,
            })
          );
        }

        if (inMemoryJob.stage === SearchJobStage.PlacesFetched) {
          if (Object.keys(inMemoryJob.placesFetched).length >= 3) {
            sendEvent(
              'Summarizing results...',
              increaseProgress(progress < 0.4 ? 0.4 - progress : 0)
            );
          }

          const topPlaces = Object.values(inMemoryJob.placesFetched).slice(0, 3);

          const placesDescriptionsPromise = Promise.all(
            topPlaces.map(async (place: PlaceAPIResponse['places'][0]) => {
              const id = place.id;

              sendEvent(
                `Summarizing "${place.displayName.text}"...`,
                increaseProgress(0.01)
              );

              const reviews = (place.reviews ?? []).map(review => review.text.text);

              if (!reviews.length) {
                return;
              }

              const description = await runSummarizationRequest(context, reviews);

              return {
                id,
                description,
              };
            })
          );

          const placesThumbnailsPromise = Promise.all(
            topPlaces.map(async (place: PlaceAPIResponse['places'][0]) => {
              const photosWithCaptions = new Map<
                number,
                { image: string; caption: string }
              >();

              sendEvent(
                `Fetching photos for "${place.displayName.text}"...`,
                increaseProgress(0.05)
              );

              await Promise.all(
                (place.photos ?? []).slice(0, 4).map(async (photo, photoIdx) => {
                  const binary = await downloadPlacePhoto(context, photo.name);
                  const caption = await runImageToTextRequest(context, binary);

                  sendEvent(
                    `Image #${photoIdx + 1} for "${place.displayName.text}" to text...`,
                    increaseProgress(0.01)
                  );

                  photosWithCaptions.set(photoIdx, {
                    image: `data:image/jpeg;base64,${btoa(
                      String.fromCharCode.apply(null, binary)
                    )}`,
                    caption,
                  });
                })
              );

              if (photosWithCaptions.size === 0) {
                return;
              }

              const captionsList = Array.from(photosWithCaptions.entries())
                .map(([idx, { caption }]) => {
                  return `${idx + 1}. ${caption}`;
                })
                .join('\n');

              sendEvent(
                `Choosing thumbnail for "${place.displayName.text}"...`,
                increaseProgress(0.05)
              );

              const response = await runLLMRequest(
                context,
                `Which of these captions best describes "${place.displayName.text}"? '${captionsList}'`,
                'only return the number of the best caption, omit explanations'
              );

              const choosedCaption = parseInt(response.match(/\d+/)?.[0] ?? '1') - 1;
              const thumbnail = photosWithCaptions.get(choosedCaption)?.image;

              return {
                id: place.id,
                thumbnail,
              };
            })
          );

          // Not supported by workers in the free plan https://developers.cloudflare.com/workers/platform/limits/#simultaneous-open-connections
          // const [placesDescriptions, placesThumbnails] = await Promise.all([
          //   placesDescriptionsPromise,
          //   placesThumbnailsPromise,
          // ]);
          const placesDescriptions = await placesDescriptionsPromise;
          const placesThumbnails = await placesThumbnailsPromise;

          sendEvent(
            `Almost done! Parsing results...`,
            increaseProgress(progress < 0.8 ? 0.8 - progress : 0)
          );

          await updateSearchJobState(
            SearchJobParsedSchema.parse({
              ...inMemoryJob,
              state: SearchJobState.Running,
              stage: SearchJobStage.Parsing,
              descriptions: placesDescriptions,
              thumbnails: placesThumbnails,
            })
          );
        }

        if (inMemoryJob.stage === SearchJobStage.Parsing) {
          const places = Object.values(inMemoryJob.placesFetched)
            .slice(0, 3)
            .map(place => {
              const id = place.id;
              const name = place.displayName.text;
              const address = place.formattedAddress;
              const url = place.googleMapsUri;

              const description =
                inMemoryJob.descriptions.find(p => p?.id === id)?.description ?? null;

              const thumbnail =
                inMemoryJob.thumbnails.find(p => p?.id === id)?.thumbnail ?? null;

              return {
                id,
                name,
                description,
                address,
                url,
                thumbnail,
                rating: { number: place.rating, count: place.userRatingCount },
                price: place.priceLevel,
              };
            });

          const duration = ((Date.now() - inMemoryJob.createdAt) / 1000).toFixed(1);

          sendEvent(`Search completed successfully in ${duration}s`, 0.99);

          await updateSearchJobState(
            SearchJobParsedSchema.parse({
              ...inMemoryJob,
              state: SearchJobState.Success,
              places,
              logs,
              placesFetched: {},
              descriptions: [],
              thumbnails: [],
            }),
            true
          );
        }

        sendEvent(DONE_JOB_MESSAGE, 1);
        console.log(`[${startOrCheckSearchJob.name}] (${key}) finished`);
      } catch (error) {
        console.error(`[${startOrCheckSearchJob.name}] Job ${key} failed`, error);

        await updateSearchJobState(
          {
            ...inMemoryJob,
            state: SearchJobState.Failure,
            logs,
          },
          true
        );

        throw error;
      }

      controller.close();
    },
  });

  return stream;
}
