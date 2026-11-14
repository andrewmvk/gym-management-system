'use client';

import type { ProfileEventType } from '@cadence/shared/schemas/profile-events';
import { TriangleAlertIcon } from 'lucide-react';
import { MemberSection } from '@/app/(staff)/members/[id]/member-section';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { isSafetyEvent, PROFILE_EVENT_ORDER } from '@/lib/profile-event-order';
import { cn } from '@/lib/utils';

interface Fact {
  id: string;
  eventType: ProfileEventType;
  description: string;
  sourceMessage: string | null;
  createdAt: string | Date;
  resolvedAt: string | Date | null;
}

const SKELETON_ROWS = 3;

function useSectionText() {
  const { t } = useI18n();
  return {
    title: t('What the coach remembers'),
    description: t(
      'Facts mined from the chat messages with the coach. The AI reads the ones that still apply when it builds a plan. Struck facts were marked as no longer true.',
    ),
  };
}

function FactRowSkeleton() {
  return (
    <div className="flex flex-col gap-1 border-b px-5 py-4 last:border-b-0 sm:px-6">
      <Skeleton className="h-6 w-56 max-w-full" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-5 w-72 max-w-full" />
    </div>
  );
}

function MemberFactsSectionSkeleton() {
  const { title, description } = useSectionText();
  return (
    <MemberSection title={title} description={description}>
      <Skeleton className="mx-5 mt-4 h-5 w-24 sm:mx-6" />
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
        <FactRowSkeleton key={index} />
      ))}
    </MemberSection>
  );
}

function FactRow({ fact }: { fact: Fact }) {
  const { tn, formatDateTime } = useI18n();
  const isResolved = fact.resolvedAt !== null;
  return (
    <li className="flex flex-col gap-1 border-b px-5 py-4 last:border-b-0 sm:px-6">
      <p
        className={cn(
          'text-base font-semibold text-pretty',
          isResolved && 'text-muted-foreground line-through decoration-2',
        )}
      >
        {fact.description}
      </p>
      <p className="text-sm text-muted-foreground">
        <span className="numerals text-base font-semibold">{formatDateTime(fact.createdAt)}</span>
        {fact.resolvedAt && (
          <>
            {' '}
            ·{' '}
            {tn('marked no longer true on {date}', {
              date: <span className="numerals text-base font-semibold">{formatDateTime(fact.resolvedAt)}</span>,
            })}
          </>
        )}
      </p>
      {fact.sourceMessage && (
        <p className="line-clamp-3 text-sm break-words text-muted-foreground">
          {tn('Member said: {quote}', { quote: <q className="italic">{fact.sourceMessage}</q> })}
        </p>
      )}
    </li>
  );
}

function MemberFactsSectionRoot({ facts }: { facts: readonly Fact[] }) {
  const { t, factTypeLabel } = useI18n();
  const { title, description } = useSectionText();

  if (facts.length === 0) {
    return (
      <MemberSection title={title} description={description}>
        <p className="px-5 py-4 text-muted-foreground sm:px-6">
          {t(
            'Nothing remembered yet. Facts show up here once the member tells the coach about an injury, a medication or a change in routine.',
          )}
        </p>
      </MemberSection>
    );
  }

  const groups = PROFILE_EVENT_ORDER.map((type) => ({
    type,
    // Facts that still apply come first inside a type; the order the server gave is kept otherwise.
    facts: facts
      .filter((fact) => fact.eventType === type)
      .sort((a, b) => Number(a.resolvedAt !== null) - Number(b.resolvedAt !== null)),
  })).filter((group) => group.facts.length > 0);

  return (
    <MemberSection title={title} description={description}>
      {groups.map((group) => (
        <div key={group.type}>
          <h3 className="flex items-center gap-1.5 border-b bg-muted/60 px-5 py-2 font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase sm:px-6">
            {isSafetyEvent(group.type) && <TriangleAlertIcon className="size-4 text-destructive" aria-hidden />}
            {factTypeLabel(group.type)}
            <span className="numerals text-base">{group.facts.length}</span>
          </h3>
          <ul>
            {group.facts.map((fact) => (
              <FactRow key={fact.id} fact={fact} />
            ))}
          </ul>
        </div>
      ))}
    </MemberSection>
  );
}

export const MemberFactsSection = Object.assign(MemberFactsSectionRoot, { Skeleton: MemberFactsSectionSkeleton });
