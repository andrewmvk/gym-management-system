'use client';

import { CONSENT_VERSION } from '@cadence/shared/schemas/signup';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { StepPanel } from '@/components/step-panel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTRPC } from '@/lib/trpc';

interface ConsentStepProps {
  userId: string;
  onConsented: () => void;
}

// FR-46 / RN-12 (LGPD art. 11): the applicant must give explicit, specific consent to processing of
// their facial biometric data before we ever capture or process the reference photo.
export function ConsentStep({ userId, onConsented }: ConsentStepProps) {
  const trpc = useTRPC();
  const [agreed, setAgreed] = useState(false);

  const recordConsent = useMutation(
    trpc.aptitude.recordConsent.mutationOptions({
      onSuccess: (result) => {
        if (result.status === 'unavailable') {
          toast.error("We couldn't record your consent right now. Try again.");
          return;
        }
        onConsented();
      },
      onError: () => toast.error("We couldn't record your consent. Try again."),
    }),
  );

  return (
    <StepPanel
      icon={ShieldCheckIcon}
      title="Biometric consent"
      description="Required before we can take your reference photo (LGPD, Art. 11)."
    >
      <div className="rounded-md bg-muted px-4 py-4 text-sm text-pretty">
        To check you in with face recognition, Cadence needs to process a facial biometric template derived from a
        reference photo of you. This template is sensitive personal data under Brazil&apos;s LGPD and is used only to
        verify your identity at check-in. The photo itself never leaves our server.
      </div>
      <label className="flex items-start gap-3 rounded-md border px-4 py-3.5 text-sm transition-colors hover:bg-muted/60 has-data-checked:border-primary/50 has-data-checked:bg-accent/50">
        <Checkbox checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} className="mt-px" />
        <span>I consent to Cadence processing my facial biometric data for check-in identification.</span>
      </label>
      <Button
        size="lg"
        className="w-full"
        disabled={!agreed || recordConsent.isPending}
        onClick={() => recordConsent.mutate({ userId, consentVersion: CONSENT_VERSION })}
      >
        {recordConsent.isPending ? 'Continuing...' : 'Continue'}
      </Button>
    </StepPanel>
  );
}
