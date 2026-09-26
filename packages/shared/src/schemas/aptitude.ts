import { z } from 'zod';

export interface QuestionnaireQuestion {
  id: string;
  text: string;
}

// FR-3 / FR-4: versioned so a future revision of the questionnaire never reinterprets answers already
// on file under a different set of questions. Bump the constant name (V2, ...) rather than editing V1.
export const QUESTIONNAIRE_V1: readonly QuestionnaireQuestion[] = [
  {
    id: 'heart_condition',
    text: 'Do you have any known heart condition (e.g., arrhythmia, prior heart attack, heart failure)?',
  },
  { id: 'blood_pressure', text: 'Do you have high or uncontrolled blood pressure?' },
  { id: 'diabetes', text: 'Have you been diagnosed with diabetes?' },
  { id: 'respiratory', text: 'Do you have any chronic respiratory condition (e.g., asthma, COPD)?' },
  { id: 'chronic_disease', text: 'Do you have any other chronic disease that could affect physical exercise?' },
  { id: 'recent_surgery', text: 'Have you had any surgery in the last 12 months?' },
  { id: 'current_injury', text: 'Do you have any current injury (joint, muscle, tendon, or bone)?' },
  {
    id: 'medication',
    text: 'Are you currently taking any medication that could affect your response to physical exercise?',
  },
  { id: 'dizziness', text: 'Do you experience dizziness, fainting, or loss of balance?' },
  { id: 'chest_pain', text: 'Do you feel chest pain or unusual shortness of breath during physical activity?' },
  {
    id: 'medical_supervision',
    text: 'Has a doctor ever told you that you should only do physical activity under medical supervision?',
  },
  { id: 'other_restriction', text: 'Is there any other medical restriction we should know about?' },
] as const;

const QUESTION_IDS = new Set(QUESTIONNAIRE_V1.map((q) => q.id));

export const QuestionnaireAnswerSchema = z.object({
  questionId: z.string().refine((id) => QUESTION_IDS.has(id), 'Unknown question id'),
  answer: z.boolean(),
  detail: z.string().trim().min(1).optional(),
});
export type QuestionnaireAnswer = z.infer<typeof QuestionnaireAnswerSchema>;

// Every question answered exactly once, matching QUESTIONNAIRE_V1 - not just any array of answers.
export const SubmitQuestionnaireInputSchema = z
  .object({
    userId: z.uuid(),
    answers: z.array(QuestionnaireAnswerSchema),
  })
  .refine(
    (input) => {
      const ids = input.answers.map((a) => a.questionId);
      return ids.length === QUESTIONNAIRE_V1.length && new Set(ids).size === ids.length;
    },
    { message: 'Every questionnaire question must be answered exactly once', path: ['answers'] },
  );
export type SubmitQuestionnaireInput = z.infer<typeof SubmitQuestionnaireInputSchema>;

export const RecheckInputSchema = z.object({ userId: z.uuid() });
export type RecheckInput = z.infer<typeof RecheckInputSchema>;

export const GetAptitudeStatusInputSchema = z.object({ userId: z.uuid() });
export type GetAptitudeStatusInput = z.infer<typeof GetAptitudeStatusInputSchema>;
