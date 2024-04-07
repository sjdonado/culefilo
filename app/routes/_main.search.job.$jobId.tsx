import invariant from 'tiny-invariant';

import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { startOrCheckSearchJob } from '~/jobs/search.server';

export const action = async ({ params, context }: ActionFunctionArgs) => {
  invariant(params.jobId, 'Missing jobId param');

  await startOrCheckSearchJob(context, params.jobId);
};
