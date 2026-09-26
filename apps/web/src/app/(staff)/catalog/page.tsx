'use client';

import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { EquipmentSection } from './equipment-section';
import { ExerciseSection } from './exercise-section';

function CatalogSkeleton() {
  return (
    <PageContainer width="wide">
      <PageHeading.Skeleton />
      <div className="grid gap-6 sm:grid-cols-2">
        <ExerciseSection.Skeleton />
        <EquipmentSection.Skeleton />
      </div>
    </PageContainer>
  );
}

export default function CatalogPage() {
  return (
    <GuardedContent skeleton={<CatalogSkeleton />}>
      <PageContainer width="wide">
        <PageHeading
          title="Exercise catalog"
          description="Exercises need no equipment or at least one available piece to count as performable (FR-17)."
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <ExerciseSection />
          <EquipmentSection />
        </div>
      </PageContainer>
    </GuardedContent>
  );
}
