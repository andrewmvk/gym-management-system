import { z } from 'zod';

export const MedicationsSchema = z.array(z.string().trim().min(1)).default([]);
export type Medications = z.infer<typeof MedicationsSchema>;

// FR-12 lists "any other free-form relevant info" with no dedicated column in docs/05-data-model.md
// (flagged as a doc gap, see prompts/P-11-onboarding-data-capture.md context) - stored as otherNotes
// inside this schema instead of changing the data model.
export const PhysicalConditionsSchema = z.object({
  conditions: z.array(z.string().trim().min(1)).default([]),
  otherNotes: z.string().trim().min(1).optional(),
});
export type PhysicalConditions = z.infer<typeof PhysicalConditionsSchema>;

export const ExamAttachmentPathsSchema = z.array(z.string());
export type ExamAttachmentPaths = z.infer<typeof ExamAttachmentPathsSchema>;

const OnboardingAttachmentSchema = z.object({
  filename: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  base64: z.string().min(1),
});

export const OnboardingSubmitInputSchema = z.object({
  medications: MedicationsSchema,
  physicalConditions: PhysicalConditionsSchema,
  goals: z.string().trim().min(1, 'Goals are required'),
  attachments: z.array(OnboardingAttachmentSchema).default([]),
});
export type OnboardingSubmitInput = z.input<typeof OnboardingSubmitInputSchema>;
