import { z } from 'zod';

import { ALL_SEARCH_JOB_STATES } from '~/constants/job';

import { SearchSchema } from './search';
import { PlaceGeoDataSchema, PlaceParsedSchema, PlaceSchema } from './place';

export const SearchJobSchema = z.object({
  input: SearchSchema,
  geoData: PlaceGeoDataSchema,
  state: z.enum(ALL_SEARCH_JOB_STATES),
  places: z.array(PlaceParsedSchema).optional(),
  logs: z.array(z.string()).optional(),
  createdAt: z.number(),
});

export const SearchJobSerializedSchema = SearchJobSchema.pick({
  input: true,
  state: true,
  createdAt: true,
})
  .extend({
    id: z.string(),
    places: z.array(PlaceSchema),
  })
  .transform(({ ...data }) => ({
    ...data,
    createdAt: new Date(data.createdAt).toLocaleString('en-US'),
  }));

export type SearchJob = z.infer<typeof SearchJobSchema>;
export type SearchJobSerialized = z.infer<typeof SearchJobSerializedSchema>;
