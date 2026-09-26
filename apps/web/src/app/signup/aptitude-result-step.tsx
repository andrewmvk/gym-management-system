'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTRPC } from '@/lib/trpc';

interface AptitudeResultStepProps {
  userId: string;
  outcome: 'cleared' | 'certificate_required' | 'pending_retry';
  onRechecked: (outcome: 'cleared' | 'certificate_required' | 'pending_retry') => void;
}

// "cleared" and "certificate_required" continue into P-09 (password) and P-10 (certificate), which
// don't exist yet - same placeholder pattern already used at the end of the P-07 photo step.
const STATIC_MESSAGES: Record<'cleared' | 'certificate_required', { title: string; description: string }> = {
  cleared: {
    title: "You're cleared to train",
    description: 'Your questionnaire was approved. The rest of the signup flow is coming soon.',
  },
  certificate_required: {
    title: 'A medical certificate is required',
    description: "Your questionnaire indicates you'll need to submit a medical certificate. That step is coming soon.",
  },
};

export function AptitudeResultStep({ userId, outcome, onRechecked }: AptitudeResultStepProps) {
  const trpc = useTRPC();

  const recheck = useMutation(
    trpc.aptitude.recheck.mutationOptions({
      onSuccess: (result) => {
        if (result.status === 'unavailable' || result.status === 'not_pending_retry') {
          toast.error("We couldn't re-check your result right now. Try again.");
          return;
        }
        onRechecked(result.status);
      },
      onError: () => toast.error("We couldn't re-check your result. Try again."),
    }),
  );

  if (outcome === 'pending_retry') {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Still processing</CardTitle>
          <CardDescription>
            We couldn&apos;t evaluate your questionnaire yet. This is a temporary issue on our side, not a rejection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" disabled={recheck.isPending} onClick={() => recheck.mutate({ userId })}>
            {recheck.isPending ? 'Checking...' : 'Check again'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const message = STATIC_MESSAGES[outcome];
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{message.title}</CardTitle>
        <CardDescription>{message.description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
