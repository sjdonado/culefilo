import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';

import { ValidatedForm, validationError } from 'remix-validated-form';
import { withZod } from '@remix-validated-form/with-zod';

import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import { Link, redirect, useLoaderData, useRevalidator } from '@remix-run/react';

import { DONE_JOB_MESSAGE, SearchJobState } from '~/constants/job';

import { SearchSchema } from '~/schemas/search';
import type { SearchJobSerialized } from '~/schemas/job';

import { createSearchJob } from '~/jobs/search.server';

import { getKVRecord } from '~/services/cloudflare.server';

import Input from '~/components/Input';
import SubmitButton from '~/components/SubmitButton';
import PlaceCard from '~/components/PlaceCard';
import AutocompletePlacesInput from '~/components/AutocompletePlacesInput';

const validator = withZod(SearchSchema);

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const fieldValues = await validator.validate(await request.formData());

  if (fieldValues.error) {
    return validationError(fieldValues.error);
  }

  const { favoriteMealName, zipCode, latitude, longitude } = fieldValues.data;

  const coordinates = {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
  };
  const location = { zipCode, coordinates };

  const key = await createSearchJob(context, favoriteMealName, location);

  return redirect(`/search?id=${key}`);
};

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('id');

  const searchJob = jobId ? await getKVRecord<SearchJobSerialized>(context, jobId) : null;
  const placesApiKey = context.cloudflare.env.PLACES_API_KEY;

  return { jobId, searchJob, placesApiKey };
};

export default function SearchPage() {
  const revalidator = useRevalidator();
  const { jobId, searchJob, placesApiKey } = useLoaderData<typeof loader>();

  const [jobState, setJobState] = useState<
    { time: string; percentage: string; message: string } | undefined
  >();

  const [coordinates, setCoordinates] = useState<
    { latitude:  number; longitude: number } | undefined
  >();

  const startSearchJob = useCallback(async () => {
    if (searchJob?.state === SearchJobState.Created) {
      const eventSource = new EventSource(`/search/job/${jobId}`);

      eventSource.onmessage = event => {
        const [time, percentage, message] = event.data.split(',');

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
  }, [jobId, searchJob, revalidator]);

  useEffect(() => {
    startSearchJob();
  }, [startSearchJob]);

  const onCoordinatesChange =
    (coordinates: { latitude: number; longitude: number }) => {
      setCoordinates(coordinates);
    };

  console.log('search', searchJob, 'jobState', jobState);

  return (
    <div className="flex flex-col gap-6">
      <ValidatedForm id="searchForm" validator={validator} method="post" className="flex flex-col gap-6">
        <div className="rounded-lg border bg-base-200/30 p-4 md:p-6">
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
            <AutocompletePlacesInput
              name="zipCode"
              label="Zip code"
              placeholder="080001"
              icon={<MapPinIcon className="form-input-icon" />}
              defaultValue={searchJob?.input.zipCode}
              disabled={!!searchJob}
              placesApiKey={placesApiKey}
              onCoordinatesChange={onCoordinatesChange}
            />
          </div>
        </div>
        <SubmitButton
          className="w-full"
          message="Submit"
          disabled={!!searchJob || (!coordinates)}
        />
      </ValidatedForm>
      {jobState && (
        <div className="mx-auto my-12 flex flex-col items-center justify-center gap-4">
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
            <p className="my-12 text-center">No results found :(</p>
          )}
          {(searchJob?.places ?? []).map(place => (
            <PlaceCard key={place.name} place={place} />
          ))}
        </div>
      )}
      {[SearchJobState.Success, SearchJobState.Failure].includes(
        searchJob?.state as SearchJobState
      ) && (
        <Link to="/" className="btn btn-primary btn-sm !h-10 w-full text-base-100">
          Go to new search
        </Link>
      )}
      {[SearchJobState.Success, SearchJobState.Failure].includes(
        searchJob?.state as SearchJobState
      ) && (
        <div className="mb-4 flex flex-col justify-center gap-4">
          <h3 className="text-lg">Search logs</h3>
          <div className="flex w-full flex-col items-start gap-2">
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
