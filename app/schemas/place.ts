import { z } from 'zod';

import { PriceLevel } from '~/services/places.server';

export const PlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  address: z.string(),
  url: z.string(),
  thumbnail: z.string().nullable(),
  rating: z.string(),
  price: z.string().nullable(),
});

export const PlaceParsedSchema = PlaceSchema.pick({
  id: true,
  name: true,
  description: true,
  address: true,
  url: true,
  thumbnail: true,
})
  .extend({
    rating: z.object({
      number: z.number().optional(),
      count: z.number().optional(),
    }),
    priceLevel: z.string().optional(),
  })
  .transform(({ rating, priceLevel, ...data }) => ({
    ...data,
    rating:
      !!rating.number && !!rating.count ? `${rating.number} (${rating.count})` : null,
    price: parsePlacePriceLevel(priceLevel ?? ''),
  }));

export const PlaceLocationSchema = z.object({
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
export type PlaceLocation = z.infer<typeof PlaceLocationSchema>;
