import { z } from 'zod';

import { ALL_SEARCH_JOB_STATES } from '~/constants/job';

import { SearchSchema } from './search';
import { PlaceGeoDataSchema, PlaceSchema } from './place';

export const SearchJobSchema = z.object({
  input: SearchSchema,
  geoData: PlaceGeoDataSchema,
  state: z.enum(ALL_SEARCH_JOB_STATES),
  suggestions: z.array(z.string()).optional(),
  places: z.array(PlaceSchema).optional(),
});

export type SearchJob = z.infer<typeof SearchJobSchema>;
