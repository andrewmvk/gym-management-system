'use client';

import { HourglassIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { StepPanel } from '@/components/step-panel';
import { Button } from '@/components/ui/button';
import { useTRPCClient } from '@/lib/trpc';

interface CertificateWaitingStepProps {
  userId: string;
  onStatusChanged: (status: 'cleared' | 'certificate_pending_review' | 'rejected') => void;
}

// There is no notification for this event: no account/session exists yet before clearance (FR-9), so
// an admin's decision can't reach the applicant automatically. Checking status here is a manual re-poll
// of aptitude.getStatus (there is no per-certificate "recheck" - only an admin decision changes this).
export function CertificateWaitingStep({ userId, onStatusChanged }: CertificateWaitingStepProps) {
  const trpcClient = useTRPCClient();
  const [checking, setChecking] = useState(false);

  async function checkStatus() {
    setChecking(true);
    try {
      const result = await trpcClient.aptitude.getStatus.query({ userId });
      if (
        result.status === 'cleared' ||
        result.status === 'rejected' ||
        result.status === 'certificate_pending_review'
      ) {
        onStatusChanged(result.status);
        if (result.status === 'certificate_pending_review') toast.message('Still under review. Check back later.');
        return;
      }
      toast.message('Still under review. Check back later.');
    } catch {
      toast.error("We couldn't check your status. Try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <StepPanel
      icon={HourglassIcon}
      tone="pending"
      title="Under review"
      description="A gym admin reviews your medical certificate before you can continue. We can't say how long that will take, and nothing is sent to you when it is done."
    >
      <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
        To come back later, start again at step 1 with the same email. We will pick up where you left off.
      </p>
      <Button size="lg" className="w-full" variant="outline" disabled={checking} onClick={() => void checkStatus()}>
        {checking ? 'Checking...' : 'Check status'}
      </Button>
    </StepPanel>
  );
}
