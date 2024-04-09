import type { AppLoadContext } from '@remix-run/cloudflare';
import { DONE_JOB_MESSAGE, SearchJobState } from '~/constants/job';

import type { SearchJob } from '~/schemas/job';
import { SearchJobParsedSchema } from '~/schemas/job';
import type { PlaceGeoData } from '~/schemas/place';

import {
  getKVRecord,
  putKVRecord,
  runImageToTextRequest,
  runLLMRequest,
  runSummarizationRequest,
} from '~/services/cloudflare.server';

import type { PlaceAPIResponse } from '~/services/places.server';
import {
  downloadPlacePhoto,
  getPlacesByTextAndCoordinates,
} from '~/services/places.server';

export async function createSearchJob(
  context: AppLoadContext,
  favoriteMealName: string,
  geoData: PlaceGeoData
) {
  const key = crypto.randomUUID();

  const initState = SearchJobParsedSchema.parse({
    input: {
      favoriteMealName,
      zipCode: geoData.zipCode,
    },
    state: SearchJobState.Created,
    geoData,
    createdAt: Date.now(),
  });

  await putKVRecord(context, key, initState);

  return key;
}

export async function startOrCheckSearchJob(context: AppLoadContext, key: string) {
  const job = await getKVRecord<SearchJob>(context, key);

  const encoder = new TextEncoder();

  const encodeMessage = (message: string, percentage: number, time = Date.now()) =>
    encoder.encode(`data: ${time},${(percentage * 100).toFixed(1)},${message}\n\n`);

  // if job has been executed
  if (job.state !== SearchJobState.Created) {
    console.log(
      `[${startOrCheckSearchJob.name}] (${key}) is already running or finished`
    );

    return encodeMessage(DONE_JOB_MESSAGE, 1);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const logs: string[] = [];
      let progress = 0;

      const sendEvent = (message: string, percentage: number) => {
        const time = Date.now();

        controller.enqueue(encodeMessage(message, percentage, time));
        logs.push(`[${time}] ${message}`);
      };

      const increaseProgress = (increment: number) => (progress += increment);

      try {
        console.log(`[${startOrCheckSearchJob.name}] (${key}) started`);
        sendEvent('Search started...', progress);

        await putKVRecord(
          context,
          key,
          SearchJobParsedSchema.parse({
            ...job,
            state: SearchJobState.Running,
          })
        );

        const allPlaces = new Map<string, PlaceAPIResponse['places'][0]>();

        const originalQuery = job.input.favoriteMealName;
        const coordinates = job.geoData.coordinates;

        async function searchAndAppendToAllPlaces(query: string, baseProgress = 0.01) {
          console.log(
            `[${startOrCheckSearchJob.name}] (${key}) places search - query ${query}`
          );
          sendEvent(
            `Looking for nearby places with "${query}"...`,
            increaseProgress(baseProgress)
          );

          const places = await getPlacesByTextAndCoordinates(context, query, coordinates);

          (places ?? []).forEach(place => {
            allPlaces.set(place.id, place);
          });
        }

        await searchAndAppendToAllPlaces(originalQuery, 0.1);

        if (allPlaces.size < 3) {
          console.log(`[${startOrCheckSearchJob.name}] (${key}) LLM suggestions started`);
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

          await putKVRecord(
            context,
            key,
            SearchJobParsedSchema.parse({
              ...job,
              suggestions,
            })
          );

          if (suggestions.length === 0) {
            console.error(
              `[${startOrCheckSearchJob.name}] No suggestions found for ${originalQuery}: ${response}`
            );
          }

          console.log(
            `[${startOrCheckSearchJob.name}] (${key}) LLM suggestions: ${suggestions}`
          );

          while (allPlaces.size < 3 && suggestions.length > 0) {
            const query = suggestions.shift();
            await searchAndAppendToAllPlaces(query!);
          }
        }

        if (allPlaces.size > 3) {
          sendEvent(
            'Summarizing results...',
            increaseProgress(progress < 0.4 ? 0.4 - progress : 0)
          );
        }

        const topPlaces = Array.from(allPlaces.values()).slice(0, 3);

        const placesDescriptionsPromise = Promise.all(
          topPlaces.map(async place => {
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
          topPlaces.map(async place => {
            const photosWithCaptions = new Map<
              number,
              { image: string; caption: string }
            >();

            sendEvent(
              `Fetching photos for "${place.displayName.text}"...`,
              increaseProgress(progress < 0.6 ? 0.6 - progress : 0)
            );

            await Promise.all(
              (place.photos ?? []).slice(0, 5).map(async (photo, photoIdx) => {
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

        const [placesDescriptions, placesThumbnails] = await Promise.all([
          placesDescriptionsPromise,
          placesThumbnailsPromise,
        ]);

        sendEvent(
          `Almost done! Parsing results...`,
          increaseProgress(progress < 0.8 ? 0.8 - progress : 0)
        );

        const places = topPlaces.map(place => {
          const id = place.id;
          const name = place.displayName.text;
          const address = place.formattedAddress;
          const url = place.googleMapsUri;
          const isOpen = place.currentOpeningHours?.openNow;

          const description =
            placesDescriptions.find(p => p?.id === id)?.description ?? null;

          const thumbnail = placesThumbnails.find(p => p?.id === id)?.thumbnail ?? null;

          return {
            id,
            name,
            description,
            address,
            url,
            thumbnail,
            rating: { number: place.rating, count: place.userRatingCount },
            price: place.priceLevel,
            isOpen,
          };
        });

        const duration = ((Date.now() - job.createdAt) / 1000).toFixed(1);

        sendEvent(`Search completed successfully in ${duration}s`, 0.99);

        await putKVRecord(
          context,
          key,
          SearchJobParsedSchema.parse({
            ...job,
            state: SearchJobState.Success,
            places,
            logs,
          })
        );

        sendEvent(DONE_JOB_MESSAGE, 1);
        console.log(`[${startOrCheckSearchJob.name}] (${key}) finished`);
      } catch (error) {
        console.error(`[${startOrCheckSearchJob.name}] Job ${key} failed`, error);

        await putKVRecord(context, key, {
          ...job,
          state: SearchJobState.Failure,
          logs,
        });

        throw error;
      }

      controller.close();
    },
  });

  return stream;
}
