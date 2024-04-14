import { z } from 'zod';

import { ALL_SEARCH_JOB_STAGES, ALL_SEARCH_JOB_STATES } from '~/constants/job';

import { SearchSchema } from './search';
import { PlaceLocationSchema, PlaceParsedSchema, PlaceSchema } from './place';

export const SearchJobSchema = z.object({
  input: SearchSchema.pick({
    favoriteMealName: true,
    address: true,
  }),
  location: PlaceLocationSchema,
  state: z.enum(ALL_SEARCH_JOB_STATES),
  stage: z.enum(ALL_SEARCH_JOB_STAGES),
  placesFetched: z.record(z.any()),
  descriptions: z.array(z.object({ id: z.string(), description: z.string() })),
  thumbnails: z.array(z.object({ id: z.string(), thumbnail: z.string() })),
  places: z.array(PlaceSchema).optional(),
  logs: z.array(z.string()).optional(),
  createdAt: z.number(),
});

export const SearchJobParsedSchema = SearchJobSchema.extend({
  places: z.array(PlaceParsedSchema).optional(),
});

export const SearchJobSerializedSchema = SearchJobSchema.pick({
  input: true,
  state: true,
  stage: true,
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
