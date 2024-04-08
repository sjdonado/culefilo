import { z } from 'zod';

import { ALL_SEARCH_JOB_STATES } from '~/constants/job';

import { SearchSchema } from './search';
import { PlaceGeoDataSchema, PlaceSchema } from './place';

export const SearchJobSchema = z.object({
  input: SearchSchema,
  geoData: PlaceGeoDataSchema,
  state: z.enum(ALL_SEARCH_JOB_STATES),
  places: z.array(PlaceSchema).optional(),
  logs: z.array(z.string()).optional(),
});

export type SearchJob = z.infer<typeof SearchJobSchema>;
