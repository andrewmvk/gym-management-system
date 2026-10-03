import { z } from 'zod';

export const MetricsRangeInputSchema = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .refine((range) => range.from <= range.to, {
    message: 'The start date must not be after the end date',
    path: ['to'],
  });

export type MetricsRangeInput = z.input<typeof MetricsRangeInputSchema>;
