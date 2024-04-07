import { AppLoadContext } from '@remix-run/cloudflare';
import { SearchJobState } from '~/constants/job';

import { SearchJob, SearchJobSchema } from '~/schemas/job';
import { PlaceGeoData } from '~/schemas/place';

import { getKVRecord, putKVRecord, runLLMRequest } from '~/services/cloudfare.server';
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
    state: SearchJobState.Running,
    geoData,
  });

  await putKVRecord(context, key, initState);

  return key;
}

export async function startOrCheckSearchJob(context: AppLoadContext, key: string) {
  const job = await getKVRecord<SearchJob>(context, key);

  if (job.state === SearchJobState.Running) {
    return job;
  }

  try {
    const mdListResponse = await runLLMRequest(
      context,
      `other names for "${job.input.favoriteMealName}" (return answer in a CSV format, comma delimiter, max 6 items)`,
      context.cloudflare.env.AI_DEFAULT_INSTRUCTION
    );

    const suggestions = mdListResponse
      .split(',')
      .filter(item => item.trim().replace(/\n/g, '') !== '');

    // Parse the markdown list to an array
    if (suggestions.length === 0) {
      throw new Error(
        `[${runLLMRequest.name}] No results found for ${job.input.favoriteMealName}`
      );
    }

    await putKVRecord(
      context,
      key,
      SearchJobSchema.parse({
        ...job,
        suggestions,
      })
    );

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
  } catch (error) {
    console.error(error);
    await putKVRecord(context, key, {
      ...job,
      state: SearchJobState.Failure,
    });
  }

  return key;
}
