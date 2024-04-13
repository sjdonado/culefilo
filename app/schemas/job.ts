import { z } from 'zod';

import { ALL_SEARCH_JOB_STAGES, ALL_SEARCH_JOB_STATES } from '~/constants/job';

import { SearchSchema } from './search';
import { PlaceLocationSchema, PlaceParsedSchema, PlaceSchema } from './place';

const PlaceAPIResponseSchema = z.object({
  id: z.string(),
  formattedAddress: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  rating: z.number(),
  googleMapsUri: z.string(),
  priceLevel: z.enum(['FREE', 'INEXPENSIVE', 'MODERATE', 'EXPENSIVE', 'VERY_EXPENSIVE']),
  userRatingCount: z.number(),
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
  reviews: z
    .array(
      z.object({
        text: z.object({
          text: z.string(),
          languageCode: z.string(),
        }),
      })
    )
    .optional(),
  photos: z.array(
    z.object({
      name: z.string(),
      widthPx: z.number(),
      heightPx: z.number(),
      authorAttributions: z.array(
        z.object({
          displayName: z.string(),
          uri: z.string(),
          photoUri: z.string(),
        })
      ),
    })
  ),
});

export const SearchJobSchema = z.object({
  input: SearchSchema.pick({
    favoriteMealName: true,
    address: true,
  }),
  location: PlaceLocationSchema,
  state: z.enum(ALL_SEARCH_JOB_STATES),
  stage: z.enum(ALL_SEARCH_JOB_STAGES),
  allPlaces: z.record(PlaceAPIResponseSchema),
  descriptions: z.array(z.object({ id: z.string(), description: z.string() })).optional(),
  thumbnails: z.array(z.object({ id: z.string(), thumbnail: z.string() })).optional(),
  logs: z.array(z.string()).optional(),
  createdAt: z.number(),
});

export const SearchJobParsedSchema = SearchJobSchema.extend({
  places: z.array(PlaceParsedSchema).optional(),
});

export const SearchJobSerializedSchema = SearchJobSchema.pick({
  input: true,
  state: true,
  logs: true,
  createdAt: true,
})
  .extend({
    id: z.string(),
    places: z.array(PlaceSchema),
  })
  .transform(data => ({
    ...data,
    createdAt: new Date(data.createdAt).toLocaleString('en-US'),
  }));

export type SearchJob = z.infer<typeof SearchJobSchema>;
export type SearchJobParsed = z.infer<typeof SearchJobParsedSchema>;
export type SearchJobSerialized = z.infer<typeof SearchJobSerializedSchema>;
