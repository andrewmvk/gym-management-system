import {
  GetAptitudeStatusInputSchema,
  RecheckInputSchema,
  SubmitQuestionnaireInputSchema,
} from '@cadence/shared/schemas/aptitude';
import { RecordConsentInputSchema, SavePhotoInputSchema, StartSignupInputSchema } from '@cadence/shared/schemas/signup';
import * as service from '@api/modules/aptitude/service';
import { publicProcedure, router } from '@api/trpc/procedures';

// Public on purpose: no account or login exists before aptitude clearance (FR-9).
export const aptitudeRouter = router({
  startSignup: publicProcedure.input(StartSignupInputSchema).mutation(({ input }) => service.startSignup(input)),
  recordConsent: publicProcedure.input(RecordConsentInputSchema).mutation(({ input }) => service.recordConsent(input)),
  savePhoto: publicProcedure.input(SavePhotoInputSchema).mutation(({ input }) => service.savePhoto(input)),
  submitQuestionnaire: publicProcedure
    .input(SubmitQuestionnaireInputSchema)
    .mutation(({ input }) => service.submitQuestionnaire(input)),
  recheck: publicProcedure.input(RecheckInputSchema).mutation(({ input }) => service.recheck(input)),
  getStatus: publicProcedure.input(GetAptitudeStatusInputSchema).query(({ input }) => service.getAptitudeStatus(input)),
});
