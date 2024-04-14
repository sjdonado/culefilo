import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { MagnifyingGlassIcon, MapPinIcon } from '@heroicons/react/24/outline';

import { ValidatedForm, validationError } from 'remix-validated-form';
import { withZod } from '@remix-validated-form/with-zod';

import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/cloudflare';
import {
  Link,
  redirect,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from '@remix-run/react';

import { DONE_JOB_MESSAGE, SearchJobStage, SearchJobState } from '~/constants/job';

import { SearchSchema } from '~/schemas/search';
import type { SearchJobSerialized } from '~/schemas/job';

import { createSearchJob } from '~/jobs/search.server';

import { getKVRecord } from '~/services/cloudflare.server';

import Input from '~/components/Input';
import SubmitButton from '~/components/SubmitButton';
import PlaceCard from '~/components/PlaceCard';
import AutocompletePlacesInput from '~/components/AutocompletePlacesInput';
import Logs from '~/components/Logs';

const validator = withZod(SearchSchema);

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const fieldValues = await validator.validate(await request.formData());

  if (fieldValues.error) {
    console.error(fieldValues.error);
    return validationError(fieldValues.error);
  }

  const { favoriteMealName, address, coordinates } = fieldValues.data;

  const key = await createSearchJob(context, favoriteMealName, address, {
    coordinates,
  });

  return redirect(`/search?id=${key}`);
};

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('id');

  const searchJob = jobId ? await getKVRecord<SearchJobSerialized>(context, jobId) : null;
  const autocompleteApiKey = context.cloudflare.env.AUTOCOMPLETE_API_KEY;

  return { jobId, searchJob, autocompleteApiKey };
};

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const revalidator = useRevalidator();
  const { jobId, searchJob, autocompleteApiKey } = useLoaderData<typeof loader>();

  const [jobState, setJobState] = useState<
    { time: string; percentage: string; message: string } | undefined
  >();

  const retry = Boolean(searchParams.get('retry'));

  const startSearchJob = useCallback(async () => {
    if (
      (searchJob?.state === SearchJobState.Created &&
        searchJob?.stage === SearchJobStage.Initial) ||
      (retry && searchJob?.state === SearchJobState.Failure)
    ) {
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
  }, [jobId, searchJob, revalidator, retry]);

  useEffect(() => {
    startSearchJob();
  }, [startSearchJob]);

  return (
    <div className="flex flex-col gap-6">
      <ValidatedForm validator={validator} method="post" className="flex flex-col gap-6">
        <div className="rounded-lg border bg-base-200/30 p-4 md:p-6">
          <div className="flex flex-wrap gap-4 [&>div]:min-w-52 [&>div]:flex-1">
            <Input
              name="favoriteMealName"
              label="Meal/Dish/Food"
              type="text"
              placeholder="Currywurst"
              icon={<MagnifyingGlassIcon className="form-input-icon" />}
              defaultValue={searchJob?.input.favoriteMealName}
              disabled={!!searchJob}
            />
            <AutocompletePlacesInput
              name="address"
              label="Where to eat"
              placeholder="Berlin, Germany"
              icon={<MapPinIcon className="form-input-icon" />}
              defaultValue={searchJob?.input.address}
              disabled={!!searchJob}
              autocompleteApiKey={autocompleteApiKey}
            />
          </div>
        </div>
        <SubmitButton className="w-full" message="Submit" disabled={!!searchJob} />
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
      {searchJob?.state === SearchJobState.Failure && !retry && (
        <div className="my-12 flex flex-col items-center justify-center gap-6">
          <div className="flex flex-col gap-2">
            <h4 className="text-center text-sm">
              Oops! It seems like something went wrong
            </h4>
            <p className="text-center text-xs">
              Click the button below to retry or resume the search from the last
              checkpoint.
            </p>
          </div>
          <Link
            to={`/search?id=${jobId}&retry=1`}
            className="btn btn-primary btn-sm !h-10 rounded-lg text-base-100"
          >
            Retry
          </Link>
        </div>
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
      {[SearchJobState.Success].includes(searchJob?.state as SearchJobState) && (
        <Link to="/" className="link !h-10 w-full text-center">
          Go to new search
        </Link>
      )}
      {[SearchJobState.Success, SearchJobState.Failure].includes(
        searchJob?.state as SearchJobState
      ) && <Logs logs={searchJob?.logs ?? []} />}
    </div>
  );
}
