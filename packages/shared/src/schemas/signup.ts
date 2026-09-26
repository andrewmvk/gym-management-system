import { z } from 'zod';

export const StartSignupInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().min(1, 'Phone is required'),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid e-mail')),
  birthdate: z.iso.date('Enter a valid date'),
});
export type StartSignupInput = z.input<typeof StartSignupInputSchema>;

export const SavePhotoInputSchema = z.object({
  userId: z.uuid(),
  imageBase64: z.string().min(1, 'A photo is required'),
  mimeType: z.string().min(1, 'A photo is required'),
});
export type SavePhotoInput = z.input<typeof SavePhotoInputSchema>;
