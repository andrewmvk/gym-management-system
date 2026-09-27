'use client';

import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { CertificateQueue } from './certificate-queue';

function CertificatesSkeleton() {
  return (
    <PageContainer width="wide">
      <PageHeading.Skeleton />
      <CertificateQueue.Skeleton />
    </PageContainer>
  );
}

export default function CertificatesPage() {
  return (
    <GuardedContent skeleton={<CertificatesSkeleton />}>
      <PageContainer width="wide">
        <PageHeading
          title="Certificate review"
          description="Every medical certificate lands here, whatever the AI said (FR-6)."
        />
        <CertificateQueue />
      </PageContainer>
    </GuardedContent>
  );
}
