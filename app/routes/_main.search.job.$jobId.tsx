import invariant from 'tiny-invariant';

import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { startOrCheckSearchJob } from '~/jobs/search.server';

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  invariant(params.jobId, 'Missing jobId param');

  const stream = await startOrCheckSearchJob(context, params.jobId);

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
};
