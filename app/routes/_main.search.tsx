import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';

import { ValidatedForm, validationError } from 'remix-validated-form';
import { withZod } from '@remix-validated-form/with-zod';

import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { redirect, useLoaderData } from '@remix-run/react';

import { SearchResult, SearchSchema } from '~/schemas/search';

import getLocationDataFromZipCode from '~/services/opendatasoft.server';
import { getKVRecord, putKVRecord, runLLMRequest } from '~/services/cloudfare.server';

import Input from '~/components/Input';
import SubmitButton from '~/components/SubmitButton';

const validator = withZod(SearchSchema);

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const fieldValues = await validator.validate(await request.formData());

  if (fieldValues.error) {
    return validationError(fieldValues.error);
  }

  const { favoriteMealName, zipCode } = fieldValues.data;

  const location = await getLocationDataFromZipCode(zipCode);

  const mdListResponse = await runLLMRequest(
    context,
    `List 6 other names for this meal "${favoriteMealName}" in this place "${location.country}"?`
  );

  // Parse the markdown list to an array
  const restaurants = mdListResponse.split(/\d+\.\s/).filter(item => item.trim() !== '');

  const key = crypto.randomUUID();

  await putKVRecord(context, key, {
    input: {
      favoriteMealName,
      zipCode,
    },
    location,
    restaurants,
  });

  return redirect(`/search?id=${key}`);
};

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  const key = url.searchParams.get('id');

  const search = await getKVRecord<SearchResult>(context, key ?? '');

  return { search };
};

export default function SearchPage() {
  const { search } = useLoaderData<typeof loader>();

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
      <div>{JSON.stringify(search, null, 2)}</div>
    </ValidatedForm>
  );
}
