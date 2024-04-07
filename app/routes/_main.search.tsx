import { useCallback, useEffect } from 'react';
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';

import { ValidatedForm, validationError } from 'remix-validated-form';
import { withZod } from '@remix-validated-form/with-zod';

import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { redirect, useLoaderData } from '@remix-run/react';

import { SearchJobState } from '~/constants/job';

import { SearchSchema } from '~/schemas/search';
import { SearchJob } from '~/schemas/job';

import { createSearchJob } from '~/jobs/search.server';

import { getKVRecord } from '~/services/cloudfare.server';
import getLocationDataFromZipCode from '~/services/opendatasoft.server';

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

  const key = await createSearchJob(context, favoriteMealName, location);

  return redirect(`/search?id=${key}`);
};

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('id');

  const searchJob = jobId ? await getKVRecord<SearchJob>(context, jobId) : null;

  return { jobId, searchJob };
};

export default function SearchPage() {
  const { jobId, searchJob } = useLoaderData<typeof loader>();

  const startSearchJob = useCallback(async () => {
    if (searchJob?.state === SearchJobState.Created) {
      // TODO: return stream and update state with progress
      await fetch(`/search/job/${jobId}`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  }, [jobId, searchJob]);

  useEffect(() => {
    startSearchJob();
  }, [startSearchJob]);

  console.log('search', searchJob);

  return (
    <div className="flex flex-col gap-6">
      <ValidatedForm validator={validator} method="post" className="flex flex-col gap-6">
        <div className="border-base-custom rounded-lg border bg-base-200/30 p-4 md:p-6">
          <div className="flex gap-4">
            <Input
              className="flex-1"
              name="favoriteMealName"
              label="Your favorite meal"
              type="text"
              placeholder="Burger with fries"
              icon={<MagnifyingGlassIcon className="form-input-icon" />}
              defaultValue={searchJob?.input.favoriteMealName}
            />
            <Input
              name="zipCode"
              label="Zip code"
              type="number"
              placeholder="080001"
              icon={<MapPinIcon className="form-input-icon" />}
              defaultValue={searchJob?.input.zipCode}
            />
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <SubmitButton message="Submit" />
        </div>
      </ValidatedForm>
      {searchJob?.state === SearchJobState.Created ||
        (searchJob?.state === SearchJobState.Running && (
          <p className="text-center text-sm">Looking for your favorite meal...</p>
        ))}
      {searchJob?.state === SearchJobState.Failure && (
        <p className="text-center text-sm">Something went wrong, please try again</p>
      )}
      {searchJob?.state === SearchJobState.Success && (
        <div className="flex flex-col gap-4">
          {(searchJob?.places ?? []).map(place => (
            <PlaceCard key={place.name} place={place} />
          ))}
        </div>
      )}
    </div>
  );
}
