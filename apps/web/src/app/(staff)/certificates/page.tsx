'use client';

import { CertificateQueue } from '@/app/(staff)/certificates/certificate-queue';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';

const TITLE = 'Certificates';
const DESCRIPTION = 'Every medical certificate lands here for an admin decision, whatever the AI said.';

function CertificatesSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <CertificateQueue.Skeleton />
    </PageContainer>
  );
}

export default function CertificatesPage() {
  return (
    <GuardedContent skeleton={<CertificatesSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <CertificateQueue />
      </PageContainer>
    </GuardedContent>
  );
}
