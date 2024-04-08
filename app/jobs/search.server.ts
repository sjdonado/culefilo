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
import { getPlacesByTextAndCoordinates } from '~/services/places.server';

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

        console.log(`[${startOrCheckSearchJob.name}] (${key}) LLM suggestions started`);
        sendEvent('Looking for your favorite meal...');

        // TODO: remove this placeholder line - simulates the response time of the LLM request
        await new Promise(resolve => setTimeout(resolve, 5000));
        // const mdListResponse = await runLLMRequest(
        //   context,
        //   `other names for "${job.input.favoriteMealName}" (return answer in a CSV format, comma delimiter, max 6 items)`,
        //   context.cloudflare.env.AI_DEFAULT_INSTRUCTION
        // );
        //
        // const suggestions = mdListResponse
        //   .split(',')
        //   .filter(item => item.trim().replace(/\n/g, '') !== '');
        //
        // // Parse the markdown list to an array
        // if (suggestions.length === 0) {
        //   throw new Error(
        //     `[${startOrCheckSearchJob.name}] No results found for ${job.input.favoriteMealName}`
        //   );
        // }

        await putKVRecord(
          context,
          key,
          SearchJobSchema.parse({
            ...job,
            suggestions: [],
          })
        );

        console.log(`[${startOrCheckSearchJob.name}] (${key}) places search started`);
        sendEvent('Looking for places...');

        const places = await getPlacesByTextAndCoordinates(
          context,
          job.input.favoriteMealName,
          job.geoData.coordinates
        );

        sendEvent('Almost done! processing results...');

        const placesWithDescriptions = await Promise.all(
          (places ?? []).slice(0, 3).map(async place => {
            const name = place.displayName.text;
            const address = place.formattedAddress;
            const url = place.googleMapsUri;
            const reviews = place.reviews.map(review => review.text.text);

            const description = await runSummarizationRequest(context, name, reviews);

            return {
              name,
              description,
              address,
              url,
              isOpen: place.currentOpeningHours?.openNow ?? null,
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

        // TODO: remove this placeholder line - simulates the time it takes to get places with multiple requests
        await new Promise(resolve => setTimeout(resolve, 3000));

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
