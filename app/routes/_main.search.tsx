import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';

import { ValidatedForm, validationError } from 'remix-validated-form';
import { withZod } from '@remix-validated-form/with-zod';

import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { redirect, useLoaderData } from '@remix-run/react';

import { SearchResult, SearchResultSchema, SearchSchema } from '~/schemas/search';

import getLocationDataFromZipCode from '~/services/opendatasoft.server';
import { getKVRecord, putKVRecord, runLLMRequest } from '~/services/cloudfare.server';
import { getPlacesByTextAndCoordinates } from '~/services/places.server';

import Input from '~/components/Input';
import SubmitButton from '~/components/SubmitButton';
import PlaceCard from '~/components/PlaceCard';

const validator = withZod(SearchSchema);

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const fieldValues = await validator.validate(await request.formData());

  if (fieldValues.error) {
    return validationError(fieldValues.error);
  }

  const { favoriteMealName, zipCode } = fieldValues.data;

  // TODO: component asking for it (maybe a cute flag)
  const countryCode = 'DE';

  const location = await getLocationDataFromZipCode(context, countryCode, zipCode);

  if (!location) {
    throw new Error(
      `[${getLocationDataFromZipCode.name}] No results found for ${zipCode}`
    );
  }

  const mdListResponse = await runLLMRequest(
    context,
    `other names for "${favoriteMealName}" (return answer in a CSV format, comma delimiter, max 6 items)`,
    context.cloudflare.env.AI_DEFAULT_INSTRUCTION
  );

  // Parse the markdown list to an array
  const restaurants = mdListResponse
    .split(',')
    .filter(item => item.trim().replace(/\n/g, '') !== '');

  if (restaurants.length === 0) {
    throw new Error(`[${runLLMRequest.name}] No results found for ${favoriteMealName}`);
  }

  const places = await getPlacesByTextAndCoordinates(
    context,
    favoriteMealName,
    location.coordinates
  );

  console.log('results', { location, restaurants, places });

  const key = crypto.randomUUID();

  await putKVRecord(
    context,
    key,
    SearchResultSchema.parse({
      input: {
        favoriteMealName,
        zipCode,
      },
      places,
    })
  );

  return redirect(`/search?id=${key}`);
};

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  const key = url.searchParams.get('id');

  const search = key ? await getKVRecord<SearchResult>(context, key) : null;

  return { search };
};

export default function SearchPage() {
  const { search } = useLoaderData<typeof loader>();

  console.log('search', search);

  return (
    <ValidatedForm validator={validator} method="post">
      <div className="border-base-custom rounded-lg border bg-base-200/30 p-4 md:p-6">
        <div className="flex gap-4">
          <Input
            className="flex-1"
            name="favoriteMealName"
            label="Your favorite meal"
            type="text"
            placeholder="Burger with fries"
            icon={<MagnifyingGlassIcon className="form-input-icon" />}
          />
          <Input
            name="zipCode"
            label="Zip code"
            type="number"
            placeholder="080001"
            icon={<MapPinIcon className="form-input-icon" />}
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <SubmitButton message="Save" />
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {(search?.places ?? []).map(place => (
          <PlaceCard key={place.name} place={place} />
        ))}
      </div>
    </ValidatedForm>
  );
}
