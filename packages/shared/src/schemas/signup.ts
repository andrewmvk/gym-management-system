import { z } from 'zod';

export const GENDER_OPTIONS = ['female', 'male', 'prefer_not_to_say'] as const;

export const BasicInfoInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().min(1, 'Phone is required'),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid e-mail')),
  birthdate: z.iso.date('Enter a valid date'),
  gender: z.enum(GENDER_OPTIONS).optional(),
});
export type BasicInfoInput = z.input<typeof BasicInfoInputSchema>;

export const CheckEmailInputSchema = z.object({
  email: BasicInfoInputSchema.shape.email,
});
export type CheckEmailInput = z.input<typeof CheckEmailInputSchema>;

export const SignupPhotoSchema = z.object({
  imageBase64: z.string().min(1, 'A photo is required'),
  mimeType: z.string().min(1, 'A photo is required'),
});

// FR-46: the single source of truth for which wording of the LGPD consent text is current. Bump this
// whenever the consent copy changes; past consent rows keep recording whichever version was shown.
export const CONSENT_VERSION = '2026-09-26';
