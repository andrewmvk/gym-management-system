'use client';

import type { ReactNode } from 'react';
import { HomeNotice } from '@/app/(member)/home/home-notice';
import { NextUpCard } from '@/app/(member)/home/next-up-card';
import { NowHero } from '@/app/(member)/home/now-hero';
import { RemainingList } from '@/app/(member)/home/remaining-list';
import { SinceLastVisit } from '@/app/(member)/home/since-last-visit';
import { WeekStrip } from '@/app/(member)/home/week-strip';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';

// One grid level: the next exercise and the rest of the list on the left, the week and what changed on the right.
function HomeLayout({
  hero,
  notice,
  main,
  side,
}: {
  hero: ReactNode;
  notice?: ReactNode;
  main: ReactNode;
  side: ReactNode;
}) {
  return (
    <PageContainer>
      {hero}
      {notice}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">{main}</div>
        <div className="flex min-w-0 flex-col gap-6">{side}</div>
      </div>
    </PageContainer>
  );
}

function MemberHomeSkeleton() {
  return (
    <HomeLayout
      hero={<NowHero.Skeleton />}
      main={
        <>
          <NextUpCard.Skeleton />
          <RemainingList.Skeleton />
        </>
      }
      side={<WeekStrip.Skeleton />}
    />
  );
}

function MemberHomeContent() {
  return (
    <HomeLayout
      hero={<NowHero />}
      notice={<HomeNotice />}
      main={
        <>
          <NextUpCard />
          <RemainingList />
        </>
      }
      side={
        <>
          <WeekStrip />
          <SinceLastVisit />
        </>
      }
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
