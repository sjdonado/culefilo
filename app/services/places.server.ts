import type { AppLoadContext } from '@remix-run/cloudflare';
import { createRectangleFromCenter } from '~/utils/geo.server';

export enum PriceLevel {
  Unspecified = 'PRICE_LEVEL_UNSPECIFIED',
  Free = 'PRICE_LEVEL_FREE',
  Inexpensive = 'PRICE_LEVEL_INEXPENSIVE',
  Moderate = 'PRICE_LEVEL_MODERATE',
  Expensive = 'PRICE_LEVEL_EXPENSIVE',
  VeryExpensive = 'PRICE_LEVEL_VERY_EXPENSIVE',
}

export type PlaceAPIResponse = {
  places: {
    id: string;
    formattedAddress: string;
    location: {
      latitude: number;
      longitude: number;
    };
    rating: number;
    googleMapsUri: string;
    priceLevel: PriceLevel;
    userRatingCount: number;
    displayName: {
      text: string;
      languageCode: string;
    };
    currentOpeningHours:
      | {
          openNow: boolean;
          weekdayDescriptions: string[];
        }
      | undefined;
    reviews:
      | {
          text: { text: string; languageCode: string };
        }[]
      | undefined;
    photos: {
      name: string;
      widthPx: number;
      heightPx: number;
      authorAttributions: {
        displayName: string;
        uri: string;
        photoUri: string;
      }[];
    }[];
  }[];
};

export async function getPlacesByTextAndCoordinates(
  context: AppLoadContext & { cloudflare: { request?: Request } },
  text: string,
  coordinates: { latitude: number; longitude: number }
) {
  // search within 150 km2
  const viewport = createRectangleFromCenter(coordinates, 150);

  const payload = {
    textQuery: text,
    includedType: 'restaurant',
    maxResultCount: 3,
    // locationRestriction does not support a circle viewport
    locationRestriction: {
      rectangle: {
        low: {
          latitude: viewport.sw.latitude,
          longitude: viewport.sw.longitude,
        },
        high: {
          latitude: viewport.ne.latitude,
          longitude: viewport.ne.longitude,
        },
      },
    },
  };

  const response = await fetch(context.cloudflare.env.PLACES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: context.cloudflare.request?.headers.get('host') ?? 'localhost',
      'X-Goog-Api-Key': context.cloudflare.env.PLACES_API_KEY,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.location,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.reviews,places.photos',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json<PlaceAPIResponse>();

  console.log(
    `[${getPlacesByTextAndCoordinates.name}] ${JSON.stringify(
      {
        payload,
        results: (data.places ?? []).map(place => ({
          id: place.id,
          name: place.displayName.text,
        })),
      },
      null,
      2
    )}`
  );

  return data.places;
}

export async function downloadPlacePhoto(
  context: AppLoadContext & { cloudflare: { request?: Request } },
  photoName: string
) {
  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=200`,
    {
      headers: {
        Referer: context.cloudflare.request?.headers.get('host') ?? 'localhost',
        'X-Goog-Api-Key': context.cloudflare.env.PLACES_API_KEY,
      },
    }
  );

  const arrayBuffer = await response.arrayBuffer();

  const uint8Array = new Uint8Array(arrayBuffer);
  const binary = Array.from(uint8Array);

  return binary;
}
