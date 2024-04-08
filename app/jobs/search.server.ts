import { AppLoadContext } from '@remix-run/cloudflare';
import { SearchJobState } from '~/constants/job';

import { SearchJob, SearchJobSchema } from '~/schemas/job';
import { PlaceGeoData, PlaceSchema } from '~/schemas/place';

import {
  getKVRecord,
  putKVRecord,
  runLLMRequest,
  runSummarizationRequest,
} from '~/services/cloudfare.server';
import {
  PlaceAPIResponse,
  getPlacesByTextAndCoordinates,
} from '~/services/places.server';

export async function createSearchJob(
  context: AppLoadContext,
  favoriteMealName: string,
  geoData: PlaceGeoData
) {
  const key = crypto.randomUUID();

  const initState = SearchJobSchema.parse({
    input: {
      favoriteMealName,
      zipCode: geoData.zipCode,
    },
    state: SearchJobState.Created,
    geoData,
  });

  await putKVRecord(context, key, initState);

  return key;
}

export async function startOrCheckSearchJob(context: AppLoadContext, key: string) {
  const job = await getKVRecord<SearchJob>(context, key);

  const encoder = new TextEncoder();

  // if job has been executed
  if (job.state !== SearchJobState.Created) {
    console.log(
      `[${startOrCheckSearchJob.name}] (${key}) is already running or finished`
    );

    return encoder.encode('done');
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const sendEvent = (data: string) => {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        console.log(`[${startOrCheckSearchJob.name}] (${key}) started`);

        await putKVRecord(
          context,
          key,
          SearchJobSchema.parse({
            ...job,
            state: SearchJobState.Running,
          })
        );

        const allPlaces = new Map<string, PlaceAPIResponse['places'][0]>();

        await putKVRecord(
          context,
          key,
          SearchJobSchema.parse({
            ...job,
            suggestions: [],
          })
        );

        const originalQuery = job.input.favoriteMealName;
        const coordinates = job.geoData.coordinates;

        async function searchAndAppendToAllPlaces(query: string) {
          console.log(
            `[${startOrCheckSearchJob.name}] (${key}) places search - query ${query}`
          );
          sendEvent(`Looking for nearby places with "${query}"...`);

          const places = await getPlacesByTextAndCoordinates(context, query, coordinates);

          (places ?? []).forEach(place => {
            allPlaces.set(place.id, place);
          });
        }

        await searchAndAppendToAllPlaces(originalQuery);

        if (allPlaces.size < 3) {
          console.log(`[${startOrCheckSearchJob.name}] (${key}) LLM suggestions started`);
          sendEvent('Looking for suggestions...');

          const response = await runLLMRequest(
            context,
            `Other names for this meal: "${originalQuery}" (return each name in quotes, no explanation)`,
            context.cloudflare.env.AI_DEFAULT_INSTRUCTION
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

          while (allPlaces.size < 3 && suggestions.length > 0) {
            const query = suggestions.shift();
            await searchAndAppendToAllPlaces(query!);
          }
        }

        sendEvent('Almost done! summarizing results...');

        const placesWithDescriptions = await Promise.all(
          Array.from(allPlaces.values())
            .slice(0, 3)
            .map(async place => {
              const name = place.displayName.text;
              const address = place.formattedAddress;
              const url = place.googleMapsUri;

              const rating = { number: place.rating, count: place.userRatingCount };
              const priceLevel = place.priceLevel;
              const isOpen = place.currentOpeningHours?.openNow;

              const reviews = (place.reviews ?? []).map(review => review.text.text);

              console.log(
                `[${startOrCheckSearchJob.name}] place ${JSON.stringify(
                  {
                    name,
                    address,
                    url,
                    reviews,
                    rating,
                    priceLevel,
                    isOpen,
                  },
                  null,
                  2
                )}`
              );

              const description = await runSummarizationRequest(context, reviews);

              return {
                name,
                description,
                address,
                url,
                rating,
                priceLevel,
                isOpen,
              };
            })
        );

        await putKVRecord(
          context,
          key,
          SearchJobSchema.parse({
            ...job,
            state: SearchJobState.Success,
            places: placesWithDescriptions,
          })
        );

        console.log(`[${startOrCheckSearchJob.name}] (${key}) finished`);

        sendEvent('done');
      } catch (error) {
        console.error(`[${startOrCheckSearchJob.name}] Job ${key} failed`, error);

        await putKVRecord(context, key, {
          ...job,
          state: SearchJobState.Failure,
        });

        throw error;
      }

      controller.close();
    },
  });

  return stream;
}
