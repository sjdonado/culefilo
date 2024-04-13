import { Link } from '@remix-run/react';
import type { SearchJobSerialized } from '~/schemas/job';

export default function SearchCard({ search }: { search: SearchJobSerialized }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="mb-1 flex flex-wrap justify-between gap-4">
        <Link to={`/search?id=${search.id}`} className="link">
          {search.input.favoriteMealName} - {search.input.address}
        </Link>
        <div className="badge badge-ghost">
          <span className="text-xs font-bold">{search.state}</span>
        </div>
      </div>
      <p className="text-sm text-gray-500">{search.createdAt}</p>
      <p className="text-justify">{(search.places ?? []).map(p => p.name).join(', ')}</p>
    </div>
  );
}
