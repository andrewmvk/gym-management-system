import { z } from 'zod';

export const HEIGHT_CM_RANGE = { min: 100, max: 250 } as const;
export const WEIGHT_KG_RANGE = { min: 30, max: 300 } as const;

export const HeightCmSchema = z
  .number('Height is required')
  .int('Height must be a whole number of centimeters')
  .min(HEIGHT_CM_RANGE.min, `Height must be at least ${HEIGHT_CM_RANGE.min} cm`)
  .max(HEIGHT_CM_RANGE.max, `Height must be at most ${HEIGHT_CM_RANGE.max} cm`);

export const WeightKgSchema = z
  .number('Weight is required')
  .min(WEIGHT_KG_RANGE.min, `Weight must be at least ${WEIGHT_KG_RANGE.min} kg`)
  .max(WEIGHT_KG_RANGE.max, `Weight must be at most ${WEIGHT_KG_RANGE.max} kg`)
  .multipleOf(0.1, 'Weight allows one decimal place');

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

// FR-12: the AI module carries text only, so the findings the member types are what the AI reads; the
// attachment is supporting evidence for staff and never reaches it.
export const ExamEntrySchema = z.object({
  name: z.string().trim().min(1, 'Exam name is required'),
  date: z.iso.date('Enter a valid date').optional(),
  findings: z.string().trim().min(1, 'Describe what the exam found'),
  attachmentPath: z.string().min(1).optional(),
});
export type ExamEntry = z.infer<typeof ExamEntrySchema>;

export const ExamsSchema = z.array(ExamEntrySchema);
export type Exams = z.infer<typeof ExamsSchema>;

const ExamAttachmentSchema = z.object({
  filename: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  base64: z.string().min(1),
});

// An entry carries either a new file (attachment) or the path it already had (attachmentPath, kept when
// the update form is prefilled from the current profile), never both.
export const ExamInputSchema = ExamEntrySchema.extend({ attachment: ExamAttachmentSchema.optional() }).refine(
  (exam) => !(exam.attachment && exam.attachmentPath),
  { message: 'An exam has one attachment', path: ['attachment'] },
);
export type ExamInput = z.input<typeof ExamInputSchema>;

export const OnboardingSubmitInputSchema = z.object({
  heightCm: HeightCmSchema,
  weightKg: WeightKgSchema,
  medications: MedicationsSchema,
  physicalConditions: PhysicalConditionsSchema,
  goals: z.string().trim().min(1, 'Goals are required'),
  exams: z.array(ExamInputSchema).default([]),
});
export type OnboardingSubmitInput = z.input<typeof OnboardingSubmitInputSchema>;
