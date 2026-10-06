import { TriangleAlertIcon } from 'lucide-react';

interface RiskBannerProps {
  risks: readonly { exerciseId: string; name: string; reason: string }[];
}

// A fact, not a verdict: the member was warned and went ahead. It never blocks publication, and a note or an
// edit from a trainer is what marks the plan as looked at.
export function RiskBanner({ risks }: RiskBannerProps) {
  return (
    <section
      role="status"
      aria-label="Safety warning accepted"
      className="flex gap-4 rounded-lg bg-tape px-5 py-4 text-tape-foreground sm:px-6"
    >
      <TriangleAlertIcon className="mt-1 size-5 shrink-0" aria-hidden />
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="font-display text-xl font-bold tracking-wide uppercase">Safety warning accepted</h2>
        <ul className="flex flex-col gap-0.5">
          {risks.map((risk) => (
            <li key={`${risk.exerciseId}:${risk.reason}`} className="text-pretty">
              <span className="font-semibold">{risk.name}</span>: {risk.reason}
            </li>
          ))}
        </ul>
        <p className="text-sm text-pretty">
          The member saw this warning in the coach chat and applied the change anyway. The plan is already published.
          Leave a note or edit the plan and the flag clears.
        </p>
      </div>
    </section>
  );
}
