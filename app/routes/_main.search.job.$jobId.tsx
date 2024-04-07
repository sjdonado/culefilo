import invariant from 'tiny-invariant';

import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { startOrCheckSearchJob } from '~/jobs/search.server';

export const action = async ({ params, context }: ActionFunctionArgs) => {
  invariant(params.jobId, 'Missing jobId param');

  const job = await getKVRecord<SearchJob>(context, key);

  try {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // if job has been executed
        if (job.state !== SearchJobState.Created) {
          console.log(
            `[${startOrCheckSearchJob.name}] (${key}) is already running or finished`
          );
          controller.enqueue(
            encoder.encode('Job started somewhere else, reload the page\n')
          );

          return;
        }

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
        controller.enqueue(encoder.encode('Looking for your favorite meal...\n'));

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
        controller.enqueue(encoder.encode('Looking for places...\n'));

        const places = await getPlacesByTextAndCoordinates(
          context,
          job.input.favoriteMealName,
          job.geoData.coordinates
        );

        await putKVRecord(
          context,
          key,
          SearchJobSchema.parse({
            ...job,
            state: SearchJobState.Success,
            places,
          })
        );

        // TODO: remove this placeholder line - simulates the time it takes to get places with multiple requests
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log(`[${startOrCheckSearchJob.name}] (${key}) finished`);
      },
    });

    return stream;
  } catch (error) {
    console.error(`[${startOrCheckSearchJob.name}] Job ${key} failed`, error);

    await putKVRecord(context, key, {
      ...job,
      state: SearchJobState.Failure,
    });

    throw error;
  }

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
};
