import { z } from 'zod';
import { PlaceAPIResponse } from '~/services/places.server';

export const PlaceSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    address: z.string(),
    url: z.string(),
    rating: z.object({
      number: z.number(),
      count: z.number(),
    }),
    priceLevel: z.string(),
    isOpen: z.boolean().nullable(),
  })
  .transform(data => ({
    ...data,
    rating: `${data.rating.number} (${data.rating.count})`,
    priceLevel: parsePlacePriceLevel(
      data.priceLevel as PlaceAPIResponse['places'][0]['priceLevel']
    ),
    isOpen: data.isOpen ?? null,
  }));

export const PlaceGeoDataSchema = z.object({
  zipCode: z.string(),
  country: z.string(),
  city: z.string(),
  state: z.string(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

export const parsePlacePriceLevel = (
  priceLevel: PlaceAPIResponse['places'][0]['priceLevel']
) => {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
      return 'For free';
    case 'PRICE_LEVEL_MODERATE':
      return 'Moderate';
    case 'PRICE_LEVEL_EXPENSIVE':
      return 'Expensive';
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return 'Very expensive';
    default:
      return null;
  }
};

export type Place = z.infer<typeof PlaceSchema>;
export type PlaceGeoData = z.infer<typeof PlaceGeoDataSchema>;
