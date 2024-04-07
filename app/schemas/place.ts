import { z } from 'zod';

export const PlaceSchema = z.object({
  name: z.string(),
  description: z.string(),
  address: z.string(),
  url: z.string(),
  isOpen: z.boolean().nullable(),
});

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

export type Place = z.infer<typeof PlaceSchema>;
export type PlaceGeoData = z.infer<typeof PlaceGeoDataSchema>;
