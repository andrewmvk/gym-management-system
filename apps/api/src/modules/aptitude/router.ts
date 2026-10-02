import * as service from '@api/modules/aptitude/service';
import { publicProcedure, router } from '@api/trpc/procedures';
import {
  GetAptitudeStatusInputSchema,
  RecheckInputSchema,
  SubmitSignupInputSchema,
} from '@cadence/shared/schemas/aptitude';
import { CheckEmailInputSchema } from '@cadence/shared/schemas/signup';

// Public on purpose: no account or login exists before aptitude clearance (FR-9).
export const aptitudeRouter = router({
  checkEmail: publicProcedure.input(CheckEmailInputSchema).mutation(({ input }) => service.checkEmail(input)),
  submitSignup: publicProcedure.input(SubmitSignupInputSchema).mutation(({ input }) => service.submitSignup(input)),
  recheck: publicProcedure.input(RecheckInputSchema).mutation(({ input }) => service.recheck(input)),
  getStatus: publicProcedure.input(GetAptitudeStatusInputSchema).query(({ input }) => service.getAptitudeStatus(input)),
});
