'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// FR-8: final and permanent - the e-mail stays blocked, and there is no account/session to log back
// into, so this is a dead-end screen, not a retryable one.
export function RejectedStep() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>We can&apos;t clear you to train right now</CardTitle>
        <CardDescription>
          Your aptitude review was not approved. This e-mail address can&apos;t be used to start a new signup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          If you believe this is a mistake, contact the gym directly - this decision can&apos;t be changed from here.
        </p>
      </CardContent>
    </Card>
  );
}
