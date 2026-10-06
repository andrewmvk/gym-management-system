import type { OnboardingSubmitInputSchema } from '@cadence/shared/schemas/onboarding';
import type { z } from 'zod';

export type OnboardingFormInput = z.input<typeof OnboardingSubmitInputSchema>;
export type OnboardingFormOutput = z.output<typeof OnboardingSubmitInputSchema>;
