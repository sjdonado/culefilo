import { z } from 'zod';

export const SearchSchema = z.object({
  favoriteMealName: z.string().min(1, { message: 'Required field' }),
  zipCode: z.string().regex(/^[0-9]{5,6}$/, 'Invalid zip code format'),
});
