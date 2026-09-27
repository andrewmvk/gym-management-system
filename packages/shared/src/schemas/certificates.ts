import { z } from 'zod';

export const CertificateUploadInputSchema = z.object({
  userId: z.uuid(),
  filename: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  base64: z.string().min(1),
});
export type CertificateUploadInput = z.input<typeof CertificateUploadInputSchema>;

export const CERTIFICATE_REVIEW_RESULTS = ['confirm', 'cleared', 'not_cleared'] as const;

export const CertificateReviewInputSchema = z.object({
  certificateId: z.uuid(),
  result: z.enum(CERTIFICATE_REVIEW_RESULTS),
});
export type CertificateReviewInput = z.input<typeof CertificateReviewInputSchema>;
