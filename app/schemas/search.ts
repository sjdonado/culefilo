import { z } from 'zod';

export const SearchSchema = z.object({
  favoriteMealName: z
    .string()
    .min(1, { message: 'Required field' })
    .max(30, { message: 'Too long' }),
  zipCode: z.string().regex(/^[0-9]{5,6}$/, 'Invalid zip code format'),
});

export type Search = z.infer<typeof SearchSchema>;
