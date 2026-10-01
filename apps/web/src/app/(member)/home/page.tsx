'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, HeartPulseIcon, MessageCircleIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { TodayPlan } from '@/app/(member)/plan/today-plan';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/trpc';

function HomeLayout({ heading, plan }: { heading: ReactNode; plan: ReactNode }) {
  return (
    <PageContainer>
      {heading}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">{plan}</div>
        <aside className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
            <MessageCircleIcon className="size-5 text-primary" />
            <p className="font-display text-xl font-bold tracking-wide uppercase">Talk to your coach</p>
            <p className="text-sm text-pretty text-muted-foreground">
              Sore knee, new medication, short on time? Tell the AI coach with the button at the bottom right. What you
              share shapes your future plans.
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
            <HeartPulseIcon className="size-5 text-primary" />
            <p className="font-display text-xl font-bold tracking-wide uppercase">Health profile</p>
            <p className="text-sm text-pretty text-muted-foreground">
              Your medications, conditions and goals are what every plan starts from.
            </p>
            <Button asChild variant="outline" className="self-start">
              <Link href="/onboarding">
                Review profile
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

function MemberHomeSkeleton() {
  return <HomeLayout heading={<PageHeading.Skeleton />} plan={<TodayPlan.Skeleton />} />;
}

function MemberHomeContent() {
  const trpc = useTRPC();
  const me = useQuery(trpc.auth.me.queryOptions());
  const firstName = me.data?.user.name.split(' ')[0];

  return (
    <HomeLayout
      heading={<PageHeading title={firstName ? `Let's go, ${firstName}` : "Let's go"} description={todayLabel()} />}
      plan={<TodayPlan />}
    />
  );
}

export default function MemberHomePage() {
  return (
    <GuardedContent skeleton={<MemberHomeSkeleton />}>
      <MemberHomeContent />
    </GuardedContent>
  );
}
