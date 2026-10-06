'use client';

import { type ExerciseMuscle, muscleLabel } from '@cadence/shared/schemas/muscles';
import { useQuery } from '@tanstack/react-query';
import { DumbbellIcon, PlusIcon, SearchXIcon } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useAppAbility } from '@/abilities';
import { CreateExerciseSheet } from '@/app/(staff)/catalog/create-exercise-sheet';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { FilterBar } from '@/components/filter-bar';
import { Pagination } from '@/components/pagination';
import { QueryError } from '@/components/query-error';
import { SearchInput } from '@/components/search-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUrlState } from '@/hooks/use-url-state';
import { useTRPC } from '@/lib/trpc';
import { usePagination } from '@/lib/use-pagination';

const PAGE_SIZE = 12;

// Primary muscles by name, with a count of the supporting ones so the cell stays one line.
function describeMuscles(muscles: readonly ExerciseMuscle[]) {
  const primary = muscles.filter((entry) => entry.role === 'primary').map((entry) => muscleLabel(entry.muscle));
  const supporting = muscles.length - primary.length;
  if (primary.length === 0) return 'No muscles tagged';
  return supporting > 0 ? `${primary.join(', ')} + ${supporting}` : primary.join(', ');
}

function ExerciseTableHead() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Exercise</TableHead>
        <TableHead className="hidden sm:table-cell">Muscles</TableHead>
        <TableHead className="text-right">Status</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function ExerciseTableSkeleton() {
  return (
    <Table>
      <ExerciseTableHead />
      <TableBody>
        {Array.from({ length: 6 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="h-5 w-44" />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Skeleton className="h-5 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="ml-auto h-6 w-24" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ExerciseSectionSkeleton({ action }: { action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <Skeleton className="h-10 w-full lg:w-80" />
        {action && <FilterBar.Trailing>{action}</FilterBar.Trailing>}
      </FilterBar>
      <div className="overflow-hidden rounded-lg border bg-card">
        <ExerciseTableSkeleton />
      </div>
    </div>
  );
}

function ExerciseSectionRoot() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const canManage = ability.can('manage', 'Catalog');
  const query = useQuery(trpc.catalog.list.queryOptions());
  const [search, setSearch] = useUrlState<string>('q', '');
  const [isCreating, setIsCreating] = useState(false);

  const term = search.trim().toLowerCase();
  const filtered = (query.data ?? []).filter(
    (exercise) =>
      !term ||
      exercise.name.toLowerCase().includes(term) ||
      exercise.muscles.some((entry) => muscleLabel(entry.muscle).toLowerCase().includes(term)),
  );
  const pagination = usePagination(filtered, PAGE_SIZE);
  const addAction = canManage ? (
    <Button onClick={() => setIsCreating(true)}>
      <PlusIcon data-icon="inline-start" />
      Add exercise
    </Button>
  ) : undefined;

  let list: ReactNode;
  if (query.isPending) {
    list = (
      <Deferred>
        <ExerciseSectionSkeleton action={addAction} />
      </Deferred>
    );
  } else if (query.isError) {
    list = (
      <QueryError
        title="We couldn't load the exercises"
        onRetry={() => query.refetch()}
        isRetrying={query.isRefetching}
      />
    );
  } else if (query.data.length === 0) {
    list = (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={DumbbellIcon}
          title="No exercises yet"
          description={canManage ? 'Add the first one to start building plans.' : 'An admin adds exercises here.'}
          action={addAction}
        />
      </div>
    );
  } else {
    list = (
      <div className="flex flex-col gap-4">
        <FilterBar>
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              pagination.setPage(1);
            }}
            placeholder="Search exercises or muscles"
            className="w-full lg:w-80"
          />
          {addAction && <FilterBar.Trailing>{addAction}</FilterBar.Trailing>}
        </FilterBar>
        {filtered.length === 0 ? (
          <div className="rounded-lg border bg-card">
            <EmptyState icon={SearchXIcon} title="No matches" description="Try another name or muscle." />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <ExerciseTableHead />
              <TableBody>
                {pagination.pageItems.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell>
                      <p className="font-semibold">{exercise.name}</p>
                      <p className="text-muted-foreground sm:hidden">{describeMuscles(exercise.muscles)}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{describeMuscles(exercise.muscles)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={exercise.isAvailable ? 'live' : 'unavailable'}>
                        {exercise.isAvailable ? 'Available' : 'Out of service'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={pagination.setPage}
          noun="exercises"
        />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {list}
      {canManage && (
        <CreateExerciseSheet
          isOpen={isCreating}
          onOpenChange={setIsCreating}
          onCreated={(name) => {
            setSearch(name);
            pagination.setPage(1);
          }}
        />
      )}
    </div>
  );
}

export const ExerciseSection = Object.assign(ExerciseSectionRoot, { Skeleton: ExerciseSectionSkeleton });
