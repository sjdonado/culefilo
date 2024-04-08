import { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';

import { SearchJob, SearchJobSerializedSchema } from '~/schemas/job';

import { getAllKVRecords } from '~/services/cloudfare.server';

import SearchCard from '~/components/SearchCard';

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const records = await getAllKVRecords<SearchJob>(context);

  const searches = await Promise.all(
    records.map(async record => {
      // TEMPFIX: safeParse ignores previous results with different schema (it can be removed if KV is purged)
      const result = await SearchJobSerializedSchema.safeParseAsync({
        id: record.id,
        input: record.input,
        state: record.state,
        places: record.places,
      });

      if (result.success) {
        return result.data;
      }
    })
  );

  return {
    searches: searches.filter(Boolean), // TEMPFIX: didn't find a way to purge the KV local cache
  };
};

export default function HistoryPage() {
  const { searches } = useLoaderData<typeof loader>();

  console.log(searches);

  return (
    <div className="flex flex-col gap-6">
      {searches.map(search => (
        <SearchCard key={search.id} search={search} />
      ))}
    </div>
  );
}
