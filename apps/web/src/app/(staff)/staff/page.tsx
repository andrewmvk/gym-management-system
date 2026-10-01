'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronRightIcon, ClipboardCheckIcon, DumbbellIcon, FileHeartIcon, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useAppAbility } from '@/abilities';
import { Deferred } from '@/components/deferred';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';

const TITLE = 'Overview';
const DESCRIPTION = 'Plans publish on their own. This is where you look over them, and everything else the gym runs on.';

interface BoardRowProps {
  href: string;
  icon: LucideIcon;
  title: string;
  count: number | null;
  detail: string | null;
  isError?: boolean;
}

function BoardRow({ href, icon: Icon, title, count, detail, isError }: BoardRowProps) {
  const isLoading = count === null && !isError;
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-4 px-5 py-5 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 sm:gap-6 sm:px-6"
      >
        <span className="numerals flex w-16 shrink-0 justify-end text-5xl leading-none font-extrabold sm:w-20 sm:text-6xl">
          {isLoading ? (
            <Deferred>
              <Skeleton className="h-12 w-12 sm:h-15" />
            </Deferred>
          ) : isError ? (
            <span className="text-muted-foreground">-</span>
          ) : (
            count
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2 font-display text-xl font-bold tracking-wide uppercase">
            <Icon className="size-5 text-muted-foreground" />
            {title}
          </span>
          {isLoading ? (
            <Deferred>
              <Skeleton className="h-5 w-48" />
            </Deferred>
          ) : (
            <span className="text-sm text-muted-foreground">{isError ? "Couldn't load this count." : detail}</span>
          )}
        </span>
        <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

function StaffBoard() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canReviewCertificates = ability.can('manage', 'MedicalCertificate');

  const reviews = useQuery(trpc.reviews.queue.queryOptions());
  const certificates = useQuery({ ...trpc.certificates.listQueue.queryOptions(), enabled: canReviewCertificates });
  const exercises = useQuery(trpc.catalog.list.queryOptions());
  const equipment = useQuery(trpc.catalog.listEquipment.queryOptions());

  const editedCount = reviews.data?.filter((entry) => entry.status === 'trainer_edited').length ?? 0;
  const openCertificates = certificates.data?.filter((entry) => entry.adminReviewedAt === null).length ?? 0;
  const availableEquipment = equipment.data?.filter((item) => item.isAvailable).length ?? 0;

  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-card">
      <BoardRow
        href="/reviews"
        icon={ClipboardCheckIcon}
        title="Plan reviews"
        count={reviews.data?.length ?? null}
        detail={`${editedCount} edited by a trainer so far`}
        isError={reviews.isError}
      />
      {canReviewCertificates && (
        <BoardRow
          href="/certificates"
          icon={FileHeartIcon}
          title="Certificates to review"
          count={certificates.data ? openCertificates : null}
          detail={`${certificates.data?.length ?? 0} received in total`}
          isError={certificates.isError}
        />
      )}
      <BoardRow
        href="/catalog"
        icon={DumbbellIcon}
        title="Exercises in the catalog"
        count={exercises.data?.length ?? null}
        detail={equipment.data ? `${availableEquipment} of ${equipment.data.length} equipment items available` : null}
        isError={exercises.isError}
      />
    </ul>
  );
}

function StaffHomeSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <ul className="divide-y overflow-hidden rounded-lg border bg-card">
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="flex items-center gap-4 px-5 py-5 sm:gap-6 sm:px-6">
            <span className="flex w-16 justify-end sm:w-20">
              <Skeleton className="h-12 w-12 sm:h-15" />
            </span>
            <span className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-5 w-48" />
            </span>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}

export default function StaffHomePage() {
  return (
    <GuardedContent skeleton={<StaffHomeSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <StaffBoard />
      </PageContainer>
    </GuardedContent>
  );
}
