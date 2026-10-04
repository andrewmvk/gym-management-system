'use client';

import { useMutation } from '@tanstack/react-query';
import { RotateCwIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { StepPanel } from '@/components/step-panel';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/trpc';

const FAILED_CHECKS_BEFORE_CERTIFICATE_OFFER = 2;

interface AptitudeResultStepProps {
  userId: string;
  onRechecked: (outcome: 'cleared' | 'certificate_required' | 'pending_retry') => void;
  onUseCertificate: () => void;
}

// The only outcome this screen ever renders is pending_retry: "cleared" and "certificate_required" are
// both routed to their own real steps by the wizard now (password step / certificate upload step).
export function AptitudeResultStep({ userId, onRechecked, onUseCertificate }: AptitudeResultStepProps) {
  const trpc = useTRPC();
  const [failedChecks, setFailedChecks] = useState(0);

  const recheck = useMutation(
    trpc.aptitude.recheck.mutationOptions({
      onSuccess: (result) => {
        if (result.status === 'unavailable' || result.status === 'not_pending_retry') {
          setFailedChecks((count) => count + 1);
          toast.error("We couldn't re-check your result right now. Try again.");
          return;
        }
        if (result.status === 'pending_retry') setFailedChecks((count) => count + 1);
        onRechecked(result.status);
      },
      onError: () => {
        setFailedChecks((count) => count + 1);
        toast.error("We couldn't re-check your result. Try again.");
      },
    }),
  );

  const canUseCertificate = failedChecks >= FAILED_CHECKS_BEFORE_CERTIFICATE_OFFER;

  return (
    <StepPanel
      icon={RotateCwIcon}
      tone="pending"
      title="Still processing"
      description="We couldn't evaluate your questionnaire yet. This is a temporary issue on our side, not a rejection. Your answers are saved."
    >
      <div className="flex flex-col gap-3">
        <Button size="lg" className="w-full" disabled={recheck.isPending} onClick={() => recheck.mutate({ userId })}>
          {recheck.isPending ? 'Checking...' : 'Check again'}
        </Button>
        {canUseCertificate && (
          <>
            <p className="rounded-md border border-dashed bg-muted px-4 py-3 text-sm text-muted-foreground">
              Still not working? You can skip the automatic check and send a medical certificate instead. A gym admin
              reviews it.
            </p>
            <Button size="lg" variant="outline" className="w-full" onClick={onUseCertificate}>
              Upload a medical certificate instead
            </Button>
          </>
        )}
      </div>
    </StepPanel>
  );
}
