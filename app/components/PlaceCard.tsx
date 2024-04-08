import type { Place } from '~/schemas/place';

export default function PlaceCard({ place }: { place: Place }) {
  return (
    <div className="border-base-custom flex flex-col gap-2 rounded-lg border p-4">
      <div className="mb-1 flex flex-wrap items-center gap-4">
        <a href={place.url} className="link flex-1" target="_blank" rel="noreferrer">
          {place.name}
        </a>
        <div className="flex gap-2">
          <div className="badge badge-ghost">
            <span className="text-xs font-bold">★{place.rating}</span>
          </div>
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
      <p className="text-justify">{place.description}</p>
    </div>
  );
}
