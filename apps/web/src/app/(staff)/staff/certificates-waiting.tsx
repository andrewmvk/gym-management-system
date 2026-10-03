'use client';

import { useQuery } from '@tanstack/react-query';
import { FileHeartIcon } from 'lucide-react';
import { useAppAbility } from '@/abilities';
import { OverviewRow } from '@/app/(staff)/staff/overview-row';
import { Deferred } from '@/components/deferred';
import { QueryError } from '@/components/query-error';
import { formatDateTime } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';

// Admin only: certificates are the one queue with a real waiting state (adminReviewedAt is null).
function CertificatesWaitingRoot() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canReview = ability.can('manage', 'MedicalCertificate');
  const query = useQuery({ ...trpc.certificates.listQueue.queryOptions(), enabled: canReview });

  if (!canReview) return null;

  if (query.isPending) {
    return (
      <Deferred>
        <OverviewRow.Skeleton />
      </Deferred>
    );
  }

  if (query.isError) {
    return (
      <li className="p-5 sm:p-6">
        <QueryError
          title="We couldn't load the certificates"
          onRetry={() => query.refetch()}
          isRetrying={query.isRefetching}
        />
      </li>
    );
  }

  const open = query.data.filter((entry) => entry.adminReviewedAt === null);
  const oldest = open.reduce<string | Date | null>(
    (current, entry) => (!current || new Date(entry.uploadedAt) < new Date(current) ? entry.uploadedAt : current),
    null,
  );

  return (
    <OverviewRow
      href="/certificates"
      icon={FileHeartIcon}
      title="Certificates waiting"
      count={open.length}
      detail={
        oldest ? (
          <>
            Oldest uploaded <span className="numerals text-base">{formatDateTime(oldest)}</span>
          </>
        ) : (
          'Nothing waiting for your review.'
        )
      }
    />
  );
}

export const CertificatesWaiting = Object.assign(CertificatesWaitingRoot, { Skeleton: OverviewRow.Skeleton });
