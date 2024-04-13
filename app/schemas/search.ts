import { z } from 'zod';

export const SearchSchema = z.object({
  favoriteMealName: z
    .string()
    .min(1, { message: 'Required field' })
    .max(30, { message: 'Too long' }),
  zipCode: z
    .string()
    .transform(value => value.match(/\d+/)?.[0] || '')
    .pipe(z.string().min(3).max(6)),
  latitude: z
    .string()
    .transform(value => parseFloat(value))
    .pipe(z.number().min(-90).max(90))
    .transform(value => String(value)),
  longitude: z
    .string()
    .transform(value => parseFloat(value))
    .pipe(z.number().min(-180).max(180))
    .transform(value => String(value)),
});

export type Search = z.infer<typeof SearchSchema>;
