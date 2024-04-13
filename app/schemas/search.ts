import { z } from 'zod';

export const SearchSchema = z.object({
  favoriteMealName: z
    .string()
    .min(1, { message: 'Required field' })
    .max(30, { message: 'Too long' }),
  address: z.string().min(1, { message: 'Required field' }),
  coordinates: z.preprocess(
    val => JSON.parse(val && typeof val === 'string' ? val : 'null'),
    z.object(
      {
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      },
      {
        required_error: 'Required field',
        invalid_type_error: 'Invalid address, select another location',
      }
    )
  ),
});

export type Search = z.infer<typeof SearchSchema>;
