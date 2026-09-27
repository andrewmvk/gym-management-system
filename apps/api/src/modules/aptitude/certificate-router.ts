import { CertificateReviewInputSchema, CertificateUploadInputSchema } from '@cadence/shared/schemas/certificates';
import { TRPCError } from '@trpc/server';
import * as service from '@api/modules/aptitude/certificate-service';
import { assertCan, authedProcedure, publicProcedure, router } from '@api/trpc/procedures';

// Registered as the top-level "certificates" router (not nested under aptitude) so its procedure path
// matches FILE_UPLOAD_PROCEDURES's "certificates.upload" entry (apps/api/src/lib/uploads.ts, from P-05).
export const certificateRouter = router({
  // Public on purpose, same reasoning as the rest of the pre-account aptitude flow (FR-9): no session
  // exists yet, userId is the applicant's own signup capability.
  upload: publicProcedure.input(CertificateUploadInputSchema).mutation(({ input }) => service.uploadCertificate(input)),

  listQueue: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'manage', 'MedicalCertificate');
    return service.listQueue();
  }),

  review: authedProcedure.input(CertificateReviewInputSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'MedicalCertificate');
    const result = await service.reviewCertificate(ctx.user.id, input);
    if (result.status === 'not_found') throw new TRPCError({ code: 'NOT_FOUND', message: 'Certificate not found' });
    if (result.status === 'no_decision_to_confirm') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nothing to confirm yet - choose cleared or not_cleared instead' });
    }
    return result;
  }),
});
