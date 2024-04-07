import { AppLoadContext } from '@remix-run/cloudflare';
import { createRectangleFromCenter } from '~/utils/geo.server';

type PlaceAPIResponse = {
  places: {
    formattedAddress: string;
    location: {
      latitude: number;
      longitude: number;
    };
    rating: number;
    googleMapsUri: string;
    priceLevel:
      | 'PRICE_LEVEL_UNSPECIFIED'
      | 'PRICE_LEVEL_FREE'
      | 'PRICE_LEVEL_INEXPENSIVE'
      | 'PRICE_LEVEL_MODERATE'
      | 'PRICE_LEVEL_EXPENSIVE'
      | 'PRICE_LEVEL_VERY_EXPENSIVE';
    userRatingCount: number;
    displayName: {
      text: string;
      languageCode: string;
    };
    currentOpeningHours: {
      openNow: boolean;
      weekdayDescriptions: string[];
    };
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
  console.log(
    `[${getPlacesByTextAndCoordinates.name}] ${text} (${JSON.stringify(coordinates)})`
  );

  const viewport = createRectangleFromCenter(coordinates, 100);

  const payload = {
    textQuery: text,
    includedType: 'restaurant',
    maxResultCount: 6,
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

  console.log(
    `[${getPlacesByTextAndCoordinates.name}] ${JSON.stringify(payload, null, 2)}`
  );

  const host = context.cloudflare.request?.headers.get('host')!;

  const response = await fetch(context.cloudflare.env.PLACES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: host,
      'X-Goog-Api-Key': context.cloudflare.env.PLACES_API_KEY,
      'X-Goog-FieldMask':
        'places.displayName,places.formattedAddress,places.googleMapsUri,places.location,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours,places.photos',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json<PlaceAPIResponse>();

  return data.places;
}
