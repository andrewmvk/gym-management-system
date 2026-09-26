import { SavePhotoInputSchema, StartSignupInputSchema } from '@cadence/shared/schemas/signup';
import * as service from '@api/modules/aptitude/service';
import { publicProcedure, router } from '@api/trpc/procedures';

// Public on purpose: no account or login exists before aptitude clearance (FR-9).
export const aptitudeRouter = router({
  startSignup: publicProcedure.input(StartSignupInputSchema).mutation(({ input }) => service.startSignup(input)),
  savePhoto: publicProcedure.input(SavePhotoInputSchema).mutation(({ input }) => service.savePhoto(input)),
});
