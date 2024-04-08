import { Link } from '@remix-run/react';
import { SearchJobSerialized } from '~/schemas/job';

export default function SearchCard({ search }: { search: SearchJobSerialized }) {
  return (
    <div className="border-base-custom flex flex-col gap-4 rounded-lg border p-4">
      <div className="mb-1 flex w-full flex-col justify-center gap-4">
        <Link to={`/search?id=${search.id}`} className="link">
          {search.input.favoriteMealName}
        </Link>
      </div>
      <p className="text-justify">{(search.places ?? []).join(', ')}</p>
      {/* <div className="flex flex-wrap justify-end"> */}
      {/*   <p className="text-sm text-gray-500">{place.address}</p> */}
      {/* </div> */}
    </div>
  );
}
