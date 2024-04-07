import { z } from 'zod';

export const PlaceSchema = z
  .object({
    formattedAddress: z.string(),
    googleMapsUri: z.string(),
    displayName: z.object({
      text: z.string(),
      languageCode: z.string(),
    }),
    currentOpeningHours: z
      .object({
        openNow: z.boolean(),
        weekdayDescriptions: z.array(z.string()),
      })
      .optional(),
  })
  .transform(({ formattedAddress, googleMapsUri, displayName, currentOpeningHours }) => ({
    address: formattedAddress,
    name: displayName.text,
    url: googleMapsUri,
    isOpenNow: currentOpeningHours?.openNow ?? null,
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

export type Place = z.infer<typeof PlaceSchema>;
export type PlaceGeoData = z.infer<typeof PlaceGeoDataSchema>;
