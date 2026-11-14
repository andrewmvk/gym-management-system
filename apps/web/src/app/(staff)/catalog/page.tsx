'use client';

import type { ComponentProps, ReactNode } from 'react';
import { CoverageSection } from '@/app/(staff)/catalog/coverage-section';
import { EquipmentSection } from '@/app/(staff)/catalog/equipment-section';
import { ExerciseSection } from '@/app/(staff)/catalog/exercise-section';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { oneOf, useUrlState } from '@/hooks/use-url-state';
import { useI18n } from '@/lib/i18n/i18n-provider';
import type { LabelKey } from '@/lib/i18n/translate';

const TAB_BASIS = {
  exercises: 'Every exercise in the catalog, and whether it can be done today.',
  equipment: 'Every piece of equipment, and whether it is in service today. Plans are not counted here.',
  coverage: "What the catalog could train, regardless of today's plans.",
} as const satisfies Record<string, LabelKey>;

const CATALOG_TABS = ['exercises', 'equipment', 'coverage'] as const;
type CatalogTab = (typeof CATALOG_TABS)[number];

function CatalogHeading() {
  const { t } = useI18n();
  return (
    <PageHeading
      title={t('Catalog')}
      description={t(
        'The exercises plans are built from. An exercise can be done when it needs no equipment or at least one linked item is in service.',
      )}
    />
  );
}

function CatalogTabs({
  exercises,
  equipment,
  coverage,
  ...tabsProps
}: {
  exercises: ReactNode;
  equipment: ReactNode;
  coverage: ReactNode;
} & Pick<ComponentProps<typeof Tabs>, 'value' | 'onValueChange'>) {
  const { t } = useI18n();
  return (
    <Tabs defaultValue="exercises" {...tabsProps}>
      <TabsList>
        <TabsTrigger value="exercises">{t('Exercises')}</TabsTrigger>
        <TabsTrigger value="equipment">{t('plural::Equipment')}</TabsTrigger>
        <TabsTrigger value="coverage">{t('Coverage')}</TabsTrigger>
      </TabsList>
      <TabsContent value="exercises" className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t(TAB_BASIS.exercises)}</p>
        {exercises}
      </TabsContent>
      <TabsContent value="equipment" className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t(TAB_BASIS.equipment)}</p>
        {equipment}
      </TabsContent>
      <TabsContent value="coverage" className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t(TAB_BASIS.coverage)}</p>
        {coverage}
      </TabsContent>
    </Tabs>
  );
}

function CatalogSkeleton() {
  return (
    <PageContainer>
      <CatalogHeading />
      <CatalogTabs exercises={<ExerciseSection.Skeleton />} equipment={<EquipmentSection.Skeleton />} coverage={null} />
    </PageContainer>
  );
}

function CatalogContent() {
  const [tab, setTab] = useUrlState<CatalogTab>('tab', 'exercises', oneOf(CATALOG_TABS));

  return (
    <PageContainer>
      <CatalogHeading />
      <CatalogTabs
        value={tab}
        onValueChange={(value) => setTab(value as CatalogTab)}
        exercises={<ExerciseSection />}
        equipment={<EquipmentSection />}
        coverage={<CoverageSection />}
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
