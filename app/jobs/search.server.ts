import { AppLoadContext } from '@remix-run/cloudflare';

import { SearchState } from '~/config/search';
import { SearchResultSchema } from '~/schemas/search';

import { putKVRecord, runLLMRequest } from '~/services/cloudfare.server';
import { GeoData } from '~/services/opendatasoft.server';
import { getPlacesByTextAndCoordinates } from '~/services/places.server';

export async function searchJob(
  context: AppLoadContext,
  favoriteMealName: string,
  geoData: GeoData
) {
  const key = crypto.randomUUID();

  const initState = SearchResultSchema.parse({
    input: {
      favoriteMealName,
      zipCode: geoData.zipCode,
    },
    state: SearchState.InProgress,
  });

  await putKVRecord(context, key, initState);

  runLLMRequest(
    context,
    `other names for "${favoriteMealName}" (return answer in a CSV format, comma delimiter, max 6 items)`,
    context.cloudflare.env.AI_DEFAULT_INSTRUCTION
  )
    .then(async mdListResponse => {
      const suggestions = mdListResponse
        .split(',')
        .filter(item => item.trim().replace(/\n/g, '') !== '');

      // Parse the markdown list to an array
      if (suggestions.length === 0) {
        throw new Error(
          `[${runLLMRequest.name}] No results found for ${favoriteMealName}`
        );
      }

      await putKVRecord(
        context,
        key,
        SearchResultSchema.parse({
          ...initState,
          suggestions,
        })
      );
    })
    .catch(async error => {
      console.error(error);
      await putKVRecord(context, key, {
        ...initState,
        state: SearchState.Failure,
      });
    });

  await getPlacesByTextAndCoordinates(context, favoriteMealName, geoData.coordinates)
    .then(async places => {
      await putKVRecord(
        context,
        key,
        SearchResultSchema.parse({
          ...initState,
          state: SearchState.Success,
          places,
        })
      );
    })
    .catch(async error => {
      console.error(error);
      await putKVRecord(context, key, {
        ...initState,
        state: SearchState.Failure,
      });
    });

  return key;
}
