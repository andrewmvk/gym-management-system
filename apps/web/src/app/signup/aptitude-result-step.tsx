'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTRPC } from '@/lib/trpc';

interface AptitudeResultStepProps {
  userId: string;
  onRechecked: (outcome: 'cleared' | 'certificate_required' | 'pending_retry') => void;
}

// The only outcome this screen ever renders is pending_retry: "cleared" and "certificate_required" are
// both routed to their own real steps by the wizard now (password step / certificate upload step).
export function AptitudeResultStep({ userId, onRechecked }: AptitudeResultStepProps) {
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
