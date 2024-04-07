import { z } from 'zod';

export const SearchSchema = z.object({
  favoriteMealName: z.string().min(1, { message: 'Required field' }),
  zipCode: z.string().regex(/^[0-9]{5,6}$/, 'Invalid zip code format'),
});

export const SearchPlaceSchema = z.object({
  name: z.string(),
  image: z.string(),
  url: z.string(),
});

export const SearchResultSchema = z.object({
  input: SearchSchema,
  results: z.array(SearchPlaceSchema),
});

export type Search = z.infer<typeof SearchSchema>;
export type SearchPlace = z.infer<typeof SearchPlaceSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
