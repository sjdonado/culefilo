import { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';

import { SearchJob, SearchJobParsedSchema } from '~/schemas/job';

import { getAllKVRecords } from '~/services/cloudflare.server';

import SearchCard from '~/components/SearchCard';

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const records = await getAllKVRecords<SearchJob>(context);

  const searches = await Promise.all(
    records.map(async record => {
      // TEMPFIX: safeParse ignores previous results with different schema (it can be removed if KV is purged)
      const result = await SearchJobParsedSchema.safeParseAsync({
        id: record.id,
        input: record.input,
        state: record.state,
        places: record.places,
        createdAt: record.createdAt,
      });

      if (result.success) {
        return result.data;
      }
    })
  );

  const sortedSearches = searches
    .filter(Boolean) // TEMPFIX: didn't find a way to purge the KV local cache
    .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());

  return {
    searches: sortedSearches,
  };
};

export default function HistoryPage() {
  const { searches } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-6">
      {searches.length === 0 && <p className="text-center my-12">No results found :(</p>}
      {searches.map(search => (
        <SearchCard key={search.id} search={search} />
      ))}
    </div>
  );
}
