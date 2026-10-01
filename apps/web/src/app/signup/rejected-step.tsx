import { XIcon } from 'lucide-react';
import { StepPanel } from '@/components/step-panel';

// FR-8: final and permanent - the e-mail stays blocked, and there is no account/session to log back
// into, so this is a dead-end screen, not a retryable one.
export function RejectedStep() {
  return (
    <StepPanel
      icon={XIcon}
      tone="negative"
      title="Not cleared to train"
      description="Your aptitude review was not approved. This e-mail address can't be used to start a new signup."
    >
      <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
        If you believe this is a mistake, contact the gym directly. This decision can&apos;t be changed from here.
      </p>
    </StepPanel>
  );
}
