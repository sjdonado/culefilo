import type { Place } from '~/schemas/place';

export default function PlaceCard({ place }: { place: Place }) {
  return (
    <div className="border-base-custom flex flex-col gap-2 rounded-lg border p-4">
      <div className="mb-1 flex w-full flex-col justify-center gap-4">
        <a href={place.url} className="link" target="_blank" rel="noreferrer">
          {place.name}
        </a>
        <div className="flex gap-2">
          <div className="badge badge-ghost">
            <span className="text-xs font-bold">
              {place.isOpen ? 'Open now' : 'Closed now'}
            </span>
          </div>
        </div>
      </div>
      <p>{place.description}</p>
      <div className="flex flex-wrap justify-end gap-4">
        <p className="text-sm text-gray-500">{place.address}</p>
      </div>
    </div>
  );
}
