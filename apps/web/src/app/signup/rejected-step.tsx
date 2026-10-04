import { XIcon } from 'lucide-react';
import { StepPanel } from '@/components/step-panel';

// FR-8: this email stays blocked from a new signup, and there is no account/session to log back into.
// The only way forward is an admin reviewing the decision in person, so the screen points there instead
// of ending without a path.
export function RejectedStep() {
  return (
    <StepPanel
      icon={XIcon}
      tone="negative"
      title="Not cleared to train"
      description="Your aptitude review was not approved. This email address can't be used to start a new signup."
    >
      <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
        If you think this is a mistake, an admin can review the decision at the gym&apos;s front desk, in person. It
        can&apos;t be changed from here.
      </p>
    </StepPanel>
  );
}
