import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';

import type { SearchJob } from '~/schemas/job';
import { SearchJobSerializedSchema } from '~/schemas/job';

import { getAllKVRecords } from '~/services/cloudflare.server';

import SearchCard from '~/components/SearchCard';

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const records = await getAllKVRecords<SearchJob>(context);

  const searches = await Promise.all(
    records.map(async record => {
      const result = await SearchJobSerializedSchema.safeParseAsync(record);

      if (result.success) {
        return result.data;
      }
    })
  );

  const sortedSearches = searches
    .filter(Boolean)
    .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime());

  return {
    searches: sortedSearches,
  };
};

export default function HistoryPage() {
  const { searches } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-6">
      {searches.length === 0 && <p className="my-12 text-center">No results found :(</p>}
      {searches.map(search => (
        <SearchCard key={search.id} search={search} />
      ))}
    </div>
  );
}
