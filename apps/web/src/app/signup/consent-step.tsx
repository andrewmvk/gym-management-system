'use client';

import { ShieldCheckIcon } from 'lucide-react';
import { useState } from 'react';
import { StepPanel } from '@/components/step-panel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface ConsentStepProps {
  initialAgreed: boolean;
  onConsented: () => void;
}

// FR-46 / RN-12 (LGPD art. 11): the applicant must give explicit, specific consent to processing of
// their facial biometric data before the reference photo is taken. The consent is held in the browser
// and recorded by the backend together with the rest of the signup, before any embedding is computed.
export function ConsentStep({ initialAgreed, onConsented }: ConsentStepProps) {
  const [agreed, setAgreed] = useState(initialAgreed);

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
      <label
        htmlFor="biometric-consent"
        className="flex items-start gap-3 rounded-md border px-4 py-3.5 text-sm transition-colors hover:bg-muted/60 has-data-checked:border-primary/50 has-data-checked:bg-accent/50"
      >
        <Checkbox
          id="biometric-consent"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
          className="mt-px"
        />
        <span>I consent to Cadence processing my facial biometric data for check-in identification.</span>
      </label>
      <Button size="lg" className="w-full" disabled={!agreed} onClick={onConsented}>
        Continue
      </Button>
    </StepPanel>
  );
}
