import { ArrowRightIcon, ScanFaceIcon, SparklesIcon, UserCheckIcon } from 'lucide-react';
import Link from 'next/link';
import { ApiStatus } from '@/components/api-status';
import { PublicHeader } from '@/components/public-header';
import { SamplePlanRoster } from '@/components/sample-plan-roster';
import { Button } from '@/components/ui/button';
import { LOGIN_PATH } from '@/lib/routes';

const STEPS = [
  {
    icon: ScanFaceIcon,
    title: 'Walk in',
    body: 'Look at the entry panel. Face recognition checks you in and opens the turnstile, no fingerprint pad.',
  },
  {
    icon: SparklesIcon,
    title: 'Train today',
    body: 'Your plan for the day is ready, built from your goals, health profile and everything you have told your coach.',
  },
  {
    icon: UserCheckIcon,
    title: 'Get better every week',
    body: 'Tell the AI coach about a sore knee or a new medication. It remembers, and trainers review plans without holding them up.',
  },
];

export default function HomePage() {
  return (
    <>
      <PublicHeader />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:pt-20 lg:pb-24">
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-6xl leading-none font-extrabold text-balance uppercase sm:text-7xl lg:text-8xl">
              Train on a plan that <span className="text-primary">remembers</span> you.
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted-foreground">
              Cadence checks you in with your face and writes each day&apos;s training plan from your accumulated
              history, not a single interview at the front desk.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Join Cadence
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={LOGIN_PATH}>Sign in</Link>
              </Button>
            </div>
          </div>
          <SamplePlanRoster />
        </section>

        <section className="border-t bg-card">
          <ol className="mx-auto grid w-full max-w-6xl px-4 sm:px-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-5 border-b py-8 last:border-b-0 md:border-b-0 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0"
              >
                <span className="numerals text-5xl leading-none font-extrabold text-primary">{index + 1}</span>
                <div className="flex flex-col gap-2">
                  <p className="flex items-center gap-2 font-display text-xl font-bold tracking-wide uppercase">
                    <step.icon className="size-5 text-muted-foreground" />
                    {step.title}
                  </p>
                  <p className="text-sm text-pretty text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <p>Academic demo. All members, plans and biometric data are synthetic.</p>
          <ApiStatus />
        </footer>
      </main>
    </>
  );
}
