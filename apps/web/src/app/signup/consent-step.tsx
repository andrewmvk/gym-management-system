'use client';

import { CONSENT_VERSION } from '@cadence/shared/schemas/signup';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Biometric data consent</CardTitle>
        <CardDescription>Required before we can take your reference photo (LGPD, Art. 11).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          To check you in with face recognition, Cadence needs to process a facial biometric template derived from a
          reference photo of you. This template is sensitive personal data under Brazil&apos;s LGPD and is used only
          to verify your identity at check-in.
        </p>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} className="mt-0.5" />
          <span>I consent to Cadence processing my facial biometric data for check-in identification.</span>
        </label>
        <Button
          className="w-full"
          disabled={!agreed || recordConsent.isPending}
          onClick={() => recordConsent.mutate({ userId, consentVersion: CONSENT_VERSION })}
        >
          {recordConsent.isPending ? 'Continuing...' : 'Continue'}
        </Button>
      </CardContent>
    </Card>
  );
}
