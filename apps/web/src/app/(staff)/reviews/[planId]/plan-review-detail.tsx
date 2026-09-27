'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { GuardedContent } from '@/components/guarded-content';
import { PageContainer } from '@/components/page-container';
import { PageHeading } from '@/components/page-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useTRPC } from '@/lib/trpc';

interface EditableExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  load: string;
}

function DetailSkeleton() {
  return (
    <PageContainer>
      <PageHeading.Skeleton />
      <Skeleton className="h-64 w-full" />
    </PageContainer>
  );
}

export function PlanReviewDetail({ planId }: { planId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const planQuery = useQuery(trpc.reviews.getPlan.queryOptions({ planId }));

  const [exercises, setExercises] = useState<EditableExercise[] | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [newNote, setNewNote] = useState('');

  // Seeds local editable state from the server once, and again after a successful save (via
  // onSuccess's setExercises(null) below) - never on a plain background refetch, so it doesn't clobber
  // edits the trainer is still typing.
  useEffect(() => {
    if (planQuery.data && exercises === null) {
      setExercises(
        planQuery.data.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets, reps: e.reps, load: e.load ?? '' })),
      );
    }
  }, [planQuery.data, exercises]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.reviews.getPlan.queryKey({ planId }) });

  const addNote = useMutation(
    trpc.reviews.addNote.mutationOptions({
      onSuccess: () => {
        setNewNote('');
        invalidate();
      },
      onError: () => toast.error("We couldn't save that note. Try again."),
    }),
  );

  const editPlan = useMutation(
    trpc.reviews.editPlan.mutationOptions({
      onSuccess: async () => {
        setEditNote('');
        await invalidate();
        setExercises(null);
        toast.message('Plan updated.');
      },
      onError: () => toast.error("We couldn't save those changes. Try again."),
    }),
  );

  function updateExercise(index: number, patch: Partial<EditableExercise>) {
    setExercises((current) => current?.map((exercise, i) => (i === index ? { ...exercise, ...patch } : exercise)) ?? current);
  }

  function removeExercise(index: number) {
    setExercises((current) => current?.filter((_, i) => i !== index) ?? current);
  }

  function addExercise() {
    if (!selectedExerciseId) return;
    setExercises((current) => [...(current ?? []), { exerciseId: selectedExerciseId, sets: 3, reps: 10, load: '' }]);
    setSelectedExerciseId('');
  }

  let content: ReactNode;

  if (planQuery.isPending) {
    content = <DetailSkeleton />;
  } else if (planQuery.isError) {
    content = (
      <PageContainer>
        <PageHeading title="We couldn't load this plan." />
        <Button variant="outline" onClick={() => planQuery.refetch()}>
          Try again
        </Button>
      </PageContainer>
    );
  } else {
    const { plan, reviews, catalog } = planQuery.data;

    content = (
      <PageContainer>
        <PageHeading title={`${plan.memberName}'s plan`} description={`${plan.planDate} · ${plan.memberEmail}`} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Exercises</CardTitle>
            <Badge variant={plan.status === 'trainer_edited' ? 'secondary' : 'outline'}>{plan.status}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {exercises?.map((exercise, index) => {
              const details = catalog.find((c) => c.id === exercise.exerciseId);
              return (
                <div key={index} className="flex flex-wrap items-center gap-2 border-b pb-3 last:border-b-0">
                  <span className="min-w-40 flex-1 font-medium">
                    {details?.name ?? 'Unknown exercise'}
                    {details && !details.isAvailable && <span className="text-muted-foreground"> (unavailable)</span>}
                  </span>
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={exercise.sets}
                    onChange={(e) => updateExercise(index, { sets: Number(e.target.value) })}
                    aria-label="Sets"
                  />
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={exercise.reps}
                    onChange={(e) => updateExercise(index, { reps: Number(e.target.value) })}
                    aria-label="Reps"
                  />
                  <Input
                    className="w-28"
                    placeholder="Load"
                    value={exercise.load}
                    onChange={(e) => updateExercise(index, { load: e.target.value })}
                    aria-label="Load"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeExercise(index)}>
                    Remove
                  </Button>
                </div>
              );
            })}

            <div className="flex items-center gap-2">
              <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add an exercise" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.map((exercise) => (
                    <SelectItem key={exercise.id} value={exercise.id}>
                      {exercise.name} {!exercise.isAvailable && '(unavailable)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addExercise} disabled={!selectedExerciseId}>
                Add
              </Button>
            </div>

            <Textarea placeholder="Note for this edit (optional)" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
            <Button
              disabled={editPlan.isPending || !exercises}
              onClick={() =>
                exercises &&
                editPlan.mutate({
                  planId,
                  exercises: exercises.map((e) => ({ ...e, load: e.load.trim() || undefined })),
                  note: editNote.trim() || undefined,
                })
              }
            >
              {editPlan.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review history</CardTitle>
            <CardDescription>Every trainer&apos;s comments and edits, in order - none overwrite another&apos;s.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {reviews.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
            {reviews.map((review) => (
              <div key={review.id} className="flex flex-col gap-1 border-b pb-2 last:border-b-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{review.authorName}</span>
                  <span>{new Date(review.createdAt).toLocaleString()}</span>
                  {review.isEdit && <Badge variant="outline">Edit</Badge>}
                </div>
                <p className="text-sm">{review.note}</p>
              </div>
            ))}

            <Textarea placeholder="Add a note" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
            <Button
              variant="outline"
              disabled={addNote.isPending || !newNote.trim()}
              onClick={() => addNote.mutate({ planId, note: newNote.trim() })}
            >
              {addNote.isPending ? 'Adding...' : 'Add note'}
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return <GuardedContent skeleton={<DetailSkeleton />}>{content}</GuardedContent>;
}
