import { z } from 'zod';

import { PriceLevel } from '~/services/places.server';

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
    priceLevel: z.string().optional(),
    isOpen: z.boolean().nullable(),
  })
  .transform(data => ({
    ...data,
    rating: `${data.rating.number} (${data.rating.count})`,
    price: parsePlacePriceLevel(data.priceLevel ?? ''),
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

export const parsePlacePriceLevel = (priceLevel: string) => {
  switch (priceLevel) {
    case PriceLevel.Free:
      return 'For free';
    case PriceLevel.Moderate:
      return '$';
    case PriceLevel.Expensive:
      return '$$';
    case PriceLevel.VeryExpensive:
      return '$$$';
    default:
      return null;
  }
};

export type Place = z.infer<typeof PlaceSchema>;
export type PlaceGeoData = z.infer<typeof PlaceGeoDataSchema>;
