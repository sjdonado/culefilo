import type { Place } from '~/schemas/place';

export default function PlaceCard({ place }: { place: Place }) {
  return (
    <div className="border-base-custom flex flex-col gap-2 rounded-lg border p-4">
      <div className="mb-1 flex w-full items-center justify-between gap-2">
        <a href={place.url} target="_blank" rel="noreferrer">
          {place.name}
        </a>
      </div>
      <div className="flex flex-wrap justify-end gap-4">
        <p>{place.address}</p>
      </div>
    </div>
  );
}
