'use client';

import type { ReactNode } from 'react';
import { EquipmentSection } from '@/app/(staff)/catalog/equipment-section';
import { ExerciseSection } from '@/app/(staff)/catalog/exercise-section';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TITLE = 'Catalog';
const DESCRIPTION =
  'The exercises plans are built from. An exercise is performable when it needs no equipment or at least one linked item is available.';

function CatalogTabs({ exercises, equipment }: { exercises: ReactNode; equipment: ReactNode }) {
  return (
    <Tabs defaultValue="exercises">
      <TabsList>
        <TabsTrigger value="exercises">Exercises</TabsTrigger>
        <TabsTrigger value="equipment">Equipment</TabsTrigger>
      </TabsList>
      <TabsContent value="exercises">{exercises}</TabsContent>
      <TabsContent value="equipment">{equipment}</TabsContent>
    </Tabs>
  );
}

function CatalogSkeleton() {
  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <CatalogTabs exercises={<ExerciseSection.Skeleton />} equipment={<EquipmentSection.Skeleton />} />
    </PageContainer>
  );
}

export default function CatalogPage() {
  return (
    <GuardedContent skeleton={<CatalogSkeleton />}>
      <PageContainer>
        <PageHeading title={TITLE} description={DESCRIPTION} />
        <CatalogTabs exercises={<ExerciseSection />} equipment={<EquipmentSection />} />
      </PageContainer>
    </GuardedContent>
  );
}
