import { z } from 'zod';

export const SearchSchema = z.object({
  favoriteMealName: z.string(),
  zipCode: z.number().min(10000).max(99999),
});
