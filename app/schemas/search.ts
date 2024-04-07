import { z } from 'zod';
import { PlaceSchema } from './place';

export const SearchSchema = z.object({
  favoriteMealName: z
    .string()
    .min(1, { message: 'Required field' })
    .max(30, { message: 'Too long' }),
  zipCode: z.string().regex(/^[0-9]{5,6}$/, 'Invalid zip code format'),
});

export const SearchResultSchema = z.object({
  input: SearchSchema,
  places: z.array(PlaceSchema),
});

export type Search = z.infer<typeof SearchSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
