import { LoaderFunctionArgs } from '@remix-run/cloudflare';

import { SearchJob, SearchJobSerializedSchema } from '~/schemas/job';

import { getAllKVRecords } from '~/services/cloudfare.server';

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const records = await getAllKVRecords<SearchJob>(context);

  const searches = records.map(record =>
    SearchJobSerializedSchema.parse({
      id: record.id,
      input: record.input,
      state: record.state,
      places: record.places,
    })
  );

  return { searches };
};

export default function HistoryPage() {
  return <div className="flex flex-col gap-6"></div>;
}
