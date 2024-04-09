import type { Place } from '~/schemas/place';

export default function PlaceCard({ place }: { place: Place }) {
  return (
    <div className="border-base-custom flex gap-4 rounded-lg border p-4">
      {place.thumbnail && (
        <div className="avatar m-auto pt-1">
          <div className="h-32 rounded-lg">
            <img src={place.thumbnail} alt={place.name} className="bg-gray-200" />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col gap-2">
        <div className="mb-1 flex flex-wrap items-center gap-4">
          <a href={place.url} className="link flex-1" target="_blank" rel="noreferrer">
            {place.name}
          </a>
          <div className="flex gap-2">
            {place.rating && (
              <div className="badge badge-ghost">
                <span className="text-xs font-bold">★{place.rating}</span>
              </div>
            )}
            {place.isOpen !== null && (
              <div className="badge badge-ghost">
                <span className="text-xs font-bold">
                  {place.isOpen ? 'Open now' : 'Closed now'}
                </span>
              </div>
            )}
            {place.price !== null && (
              <div className="badge badge-ghost">
                <span className="text-xs font-bold">{place.price}</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500">{place.address}</p>
        <p className="text-justify">{place.description ?? 'No reviews found.'}</p>
      </div>
    </div>
  );
}
