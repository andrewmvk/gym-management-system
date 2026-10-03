'use client';

import { createAppAbility } from '@cadence/shared/auth';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { GymInfo } from '@/app/gym/gym-info';
import { AppHeader } from '@/components/app-header';
import { Brand } from '@/components/brand';
import { KitBar } from '@/components/kit-bar';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { PublicHeader } from '@/components/public-header';
import { useTRPC } from '@/lib/trpc';

const TITLE = 'Gym info';
const DESCRIPTION = 'Whether the gym is open, how busy it is, and what people are training today.';

// The page is public, so the header follows whoever is looking: the staff or member area they came from,
// or the public one for a visitor.
function GymHeader() {
  const trpc = useTRPC();
  const me = useQuery(trpc.auth.me.queryOptions());
  const rules = me.data?.rules;
  const ability = useMemo(() => createAppAbility(rules), [rules]);

  // Until the session is known, show the bare brand bar so a signed-in visitor never sees the Join button flash.
  if (me.isPending) {
    return (
      <KitBar>
        <Brand />
      </KitBar>
    );
  }
  if (ability.can('read', 'StaffApp')) return <AppHeader area="staff" />;
  if (ability.can('read', 'MemberApp')) return <AppHeader area="member" />;
  return <PublicHeader />;
}

export default function GymPage() {
  return (
    <>
      <GymHeader />
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <GymInfo />
      </PageContainer>
    </>
  );
}
