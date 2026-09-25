import { z } from 'zod';

export const LoginInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid e-mail')),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginInput = z.input<typeof LoginInputSchema>;
