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

export type Place = z.infer<typeof PlaceSchema>;
