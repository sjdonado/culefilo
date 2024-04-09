import { CSSProperties, useCallback, useEffect, useState } from 'react';
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';

import { ValidatedForm, validationError } from 'remix-validated-form';
import { withZod } from '@remix-validated-form/with-zod';

import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { Link, redirect, useLoaderData, useRevalidator } from '@remix-run/react';

import { DONE_JOB_MESSAGE, SearchJobState } from '~/constants/job';

import { SearchSchema } from '~/schemas/search';
import { SearchJob } from '~/schemas/job';

import { createSearchJob } from '~/jobs/search.server';

import { getKVRecord } from '~/services/cloudflare.server';
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
  const revalidator = useRevalidator();
  const { jobId, searchJob } = useLoaderData<typeof loader>();

  const [jobState, setJobState] = useState<
    { time: string; percentage: string; message: string } | undefined
  >();

  const startSearchJob = useCallback(async () => {
    if (searchJob?.state === SearchJobState.Created) {
      const eventSource = new EventSource(`/search/job/${jobId}`);

      eventSource.onmessage = event => {
        const [time, percentage, message] = event.data.split(',');
        console.log({ time, percentage, message });

        if (message === DONE_JOB_MESSAGE) {
          eventSource.close();
          revalidator.revalidate();

          setJobState(undefined);
          return;
        }

        setJobState({ time, percentage, message });
      };

      return () => {
        eventSource.close();
      };
    }
  }, [jobId, searchJob]);

  useEffect(() => {
    startSearchJob();
  }, [startSearchJob]);

  console.log('search', searchJob, 'jobState', jobState);

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
              disabled={!!searchJob}
            />
            <Input
              name="zipCode"
              label="Zip code"
              type="number"
              placeholder="080001"
              icon={<MapPinIcon className="form-input-icon" />}
              defaultValue={searchJob?.input.zipCode}
              disabled={!!searchJob}
            />
          </div>
        </div>
        <SubmitButton className="w-full" message="Submit" disabled={!!searchJob} />
      </ValidatedForm>
      {jobState && (
        <div className="flex flex-col justify-center items-center gap-4 mx-auto my-12">
          <div
            className="radial-progress"
            style={{ '--value': jobState.percentage } as CSSProperties}
            role="progressbar"
          >
            {jobState.percentage}%
          </div>
          <p className="text-center text-sm">{jobState.message}</p>
        </div>
      )}
      {searchJob?.state === SearchJobState.Failure && (
        <p className="text-center text-sm">Something went wrong, please try again</p>
      )}
      {searchJob?.state === SearchJobState.Success && (
        <div className="flex flex-col gap-4">
          {(searchJob?.places ?? []).length === 0 && (
            <p className="text-center my-12">No results found :(</p>
          )}
          {(searchJob?.places ?? []).map(place => (
            <PlaceCard key={place.name} place={place} />
          ))}
        </div>
      )}
      {[SearchJobState.Success, SearchJobState.Failure].includes(
        searchJob?.state as SearchJobState
      ) && (
        <Link to="/" className="btn btn-accent btn-sm w-full !h-10" type="reset">
          New search
        </Link>
      )}
      {[SearchJobState.Success, SearchJobState.Failure].includes(
        searchJob?.state as SearchJobState
      ) && (
        <div className="flex flex-col justify-center gap-4 mb-4">
          <h3 className="text-lg">Search logs</h3>
          <div className="flex flex-col items-start gap-2 w-full">
            {(searchJob?.logs ?? []).map(log => (
              <p key={log} className="text-sm text-gray-500">
                {log}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
