import { z } from 'zod';

import { ALL_SEARCH_JOB_STATES } from '~/constants/job';

import { SearchSchema } from './search';
import { PlaceLocationSchema, PlaceParsedSchema, PlaceSchema } from './place';

export const SearchJobSchema = z.object({
  input: SearchSchema.pick({
    favoriteMealName: true,
    address: true,
  }),
  location: PlaceLocationSchema,
  state: z.enum(ALL_SEARCH_JOB_STATES),
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
