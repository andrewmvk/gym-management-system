'use client';

import type { ComponentProps, ReactNode } from 'react';
import { EquipmentSection } from '@/app/(staff)/catalog/equipment-section';
import { ExerciseSection } from '@/app/(staff)/catalog/exercise-section';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { oneOf, useUrlState } from '@/hooks/use-url-state';

const TITLE = 'Catalog';
const DESCRIPTION =
  'The exercises plans are built from. An exercise is performable when it needs no equipment or at least one linked item is available.';

const CATALOG_TABS = ['exercises', 'equipment'] as const;
type CatalogTab = (typeof CATALOG_TABS)[number];

function CatalogTabs({
  exercises,
  equipment,
  ...tabsProps
}: { exercises: ReactNode; equipment: ReactNode } & Pick<ComponentProps<typeof Tabs>, 'value' | 'onValueChange'>) {
  return (
    <Tabs defaultValue="exercises" {...tabsProps}>
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

function CatalogContent() {
  const [tab, setTab] = useUrlState<CatalogTab>('tab', 'exercises', oneOf(CATALOG_TABS));

  return (
    <PageContainer>
      <PageHeading title={TITLE} description={DESCRIPTION} />
      <CatalogTabs
        value={tab}
        onValueChange={(value) => setTab(value as CatalogTab)}
        exercises={<ExerciseSection />}
        equipment={<EquipmentSection />}
      />
    </PageContainer>
  );
}

export default function CatalogPage() {
  return (
    <GuardedContent skeleton={<CatalogSkeleton />}>
      <CatalogContent />
    </GuardedContent>
  );
}
