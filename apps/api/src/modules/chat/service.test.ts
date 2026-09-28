import type { ProfileEventFact, ProfileEventType } from '@cadence/shared/schemas/profile-events';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, pool } from '@api/db/client';
import { dExercises, dUsers, fProfileEvents, fTrainingPlanExercises, fTrainingPlans } from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import { todayLocal } from '@api/lib/dates';
import type { AdjustPlanResult, ChatContext, EvaluateChat, EvaluateCorrection } from '@api/modules/chat/service';
import { adjustPlan, buildChatUserPrompt, sendMessage, summarizeOlderEvents } from '@api/modules/chat/service';
import { resetTestDatabase } from '@api/test/database';

async function createMember(email = 'chat-member@example.com') {
  const [user] = await db.insert(dUsers).values({ email, name: 'Chat Test Member', birthdate: '1995-06-15' }).returning();
  return user!;
}

function factsFor(...eventTypes: ProfileEventType[]): ProfileEventFact[] {
  return eventTypes.map((eventType) => ({ eventType, payload: { description: `a ${eventType} event` } }));
}

const alwaysFails: EvaluateChat = async () => ({ ok: false, reason: 'unavailable' });
const alwaysFailsCorrection: EvaluateCorrection = async () => ({ ok: false, reason: 'unavailable' });

async function exerciseIdByName(name: string) {
  const [exercise] = await db.select({ id: dExercises.id }).from(dExercises).where(eq(dExercises.name, name));
  return exercise!.id;
}

async function createPastPlan(userId: string, planDate: string, exerciseNames: readonly string[]) {
  const [plan] = await db.insert(fTrainingPlans).values({ userId, planDate, status: 'ai_published', aiGeneratedAt: new Date() }).returning();
  const rows = await Promise.all(
    exerciseNames.map(async (name, index) => {
      const exerciseId = await exerciseIdByName(name);
      const [row] = await db
        .insert(fTrainingPlanExercises)
        .values({ trainingPlanId: plan!.id, exerciseId, sets: 3, reps: 10, orderIndex: index })
        .returning();
      return row!;
    }),
  );
  return { plan: plan!, exercises: rows };
}

function expectOk(result: AdjustPlanResult) {
  if (result.status !== 'ok') throw new Error(`Expected status "ok", got "${result.status}"`);
  return result.plan;
}

describe('chat', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  describe('sendMessage', () => {
    it('stores a fact for each type the AI reports, of the right type', async () => {
      const member = await createMember();
      const evaluateChat: EvaluateChat = async () => ({
        ok: true,
        data: { reply: 'Noted, take it easy on that knee.', facts: factsFor('injury', 'medication_change') },
      });

      const result = await sendMessage(member.id, 'I hurt my knee and started a new medication.', { evaluateChat });

      expect(result).toMatchObject({ reply: 'Noted, take it easy on that knee.', factsSaved: 2 });
      const rows = await db.select().from(fProfileEvents).where(eq(fProfileEvents.userId, member.id));
      expect(rows.map((r) => r.eventType).sort()).toEqual(['injury', 'medication_change'].sort());
      expect(rows.every((r) => (r.payload as { description: string }).description)).toBe(true);
    });

    it('truncates the stored source_message to 200 characters', async () => {
      const member = await createMember();
      const longMessage = 'a'.repeat(250);
      const evaluateChat: EvaluateChat = async () => ({
        ok: true,
        data: { reply: 'Got it.', facts: factsFor('life_event') },
      });

      await sendMessage(member.id, longMessage, { evaluateChat });

      const [row] = await db.select().from(fProfileEvents).where(eq(fProfileEvents.userId, member.id));
      expect(row?.sourceMessage).toHaveLength(200);
    });

    it("includes an earlier message's facts in a second message's context", async () => {
      const member = await createMember();
      const prompts: string[] = [];
      const evaluateChat: EvaluateChat = vi.fn(async (contextPrompt) => {
        prompts.push(contextPrompt);
        return { ok: true as const, data: { reply: 'Ok.', facts: factsFor('injury') } };
      });

      await sendMessage(member.id, 'I hurt my knee.', { evaluateChat });
      await sendMessage(member.id, 'How should I adjust today?', { evaluateChat });

      expect(prompts).toHaveLength(2);
      expect(prompts[0]).not.toContain('a injury event');
      expect(prompts[1]).toContain('injury');
      expect(prompts[1]).toContain('a injury event');
    });

    it('throws INTERNAL_SERVER_ERROR on an AI failure and persists nothing', async () => {
      const member = await createMember();

      await expect(sendMessage(member.id, 'hello', { evaluateChat: alwaysFails })).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'AI is temporarily unavailable',
      });

      const rows = await db.select().from(fProfileEvents).where(eq(fProfileEvents.userId, member.id));
      expect(rows).toHaveLength(0);
    });

    it("assembles a real context that surfaces the member's own injury next to today's plan, plus the cross-member aggregate (FR-28/FR-29)", async () => {
      const member = await createMember();
      const otherMember = await createMember('chat-other-member@example.com');
      await db.insert(fProfileEvents).values({ userId: member.id, eventType: 'injury', payload: { description: 'sore left knee' }, sourceMessage: 'earlier' });
      await createPastPlan(member.id, todayLocal(), ['Barbell Back Squat']);
      await createPastPlan(otherMember.id, todayLocal(), ['Push-Up']);
      let capturedPrompt = '';
      const evaluateChat: EvaluateChat = async (contextPrompt) => {
        capturedPrompt = contextPrompt;
        return { ok: true, data: { reply: 'Ok.', facts: [] } };
      };

      await sendMessage(member.id, 'Is it safe to squat today?', { evaluateChat });

      expect(capturedPrompt).toContain('sore left knee');
      expect(capturedPrompt).toContain('Barbell Back Squat');
      expect(capturedPrompt).toContain('Push-Up (1)');
    });
  });

  describe('adjustPlan', () => {
    describe('today or a future date', () => {
      it('regenerates the plan through the normal generation path', async () => {
        const member = await createMember();

        const plan = expectOk(await adjustPlan(member.id, '2026-10-01', 'make it easier today'));

        expect(plan.exercises.length).toBeGreaterThan(0);
      });

      it('reports needs_confirmation for a trainer-edited plan and blocks the regeneration', async () => {
        const member = await createMember();
        const { plan } = await createPastPlan(member.id, '2026-10-01', ['Barbell Back Squat']);
        await db
          .update(fTrainingPlans)
          .set({ status: 'trainer_edited', lastEditedByUserId: member.id, lastEditedAt: new Date('2026-09-20') })
          .where(eq(fTrainingPlans.id, plan.id));

        const result = await adjustPlan(member.id, '2026-10-01', 'swap squats for lunges');

        expect(result).toMatchObject({ status: 'needs_confirmation', editedBy: 'Chat Test Member' });
      });
    });

    describe('a past date', () => {
      it('throws NOT_FOUND when no plan exists for that date', async () => {
        const member = await createMember();

        await expect(adjustPlan(member.id, '2020-01-01', 'I skipped this day')).rejects.toMatchObject({
          code: 'NOT_FOUND',
        });
      });

      it('applies the AI-corrected exercise list in place, keeping the same plan row', async () => {
        const member = await createMember();
        const { plan, exercises } = await createPastPlan(member.id, '2020-01-01', ['Barbell Back Squat']);
        const lungeId = await exerciseIdByName('Walking Lunge');
        const evaluateCorrection: EvaluateCorrection = async () => ({
          ok: true,
          data: {
            exercises: [
              { exerciseId: exercises[0]!.exerciseId, sets: 3, reps: 10, completed: true },
              { exerciseId: lungeId, sets: 3, reps: 12, completed: false },
            ],
          },
        });

        const corrected = expectOk(await adjustPlan(member.id, '2020-01-01', 'I did squats but also added lunges', false, { evaluateCorrection }));

        expect(corrected.id).toBe(plan.id);
        const exerciseIds = corrected.exercises.map((e) => e.exerciseId).sort();
        expect(exerciseIds).toEqual([exercises[0]!.exerciseId, lungeId].sort());
        expect(corrected.exercises.find((e) => e.exerciseId === exercises[0]!.exerciseId)?.completed).toBe(true);
        expect(corrected.exercises.find((e) => e.exerciseId === lungeId)?.completed).toBe(false);

        const rows = await db.select().from(fTrainingPlanExercises).where(eq(fTrainingPlanExercises.trainingPlanId, plan.id));
        expect(rows).toHaveLength(2);
      });

      it("drops a corrected exercise the AI chose that isn't currently available", async () => {
        const member = await createMember();
        const { exercises } = await createPastPlan(member.id, '2020-01-01', ['Barbell Back Squat']);
        const rowingId = await exerciseIdByName('Rowing Machine Sprint');
        const evaluateCorrection: EvaluateCorrection = async () => ({
          ok: true,
          data: {
            exercises: [
              { exerciseId: exercises[0]!.exerciseId, sets: 3, reps: 10, completed: true },
              { exerciseId: rowingId, sets: 3, reps: 10, completed: true },
            ],
          },
        });

        const corrected = expectOk(await adjustPlan(member.id, '2020-01-01', 'add rowing', false, { evaluateCorrection }));

        expect(corrected.exercises.map((e) => e.exerciseId)).not.toContain(rowingId);
      });

      it('reports needs_confirmation for a trainer-edited plan and blocks the correction until confirmed', async () => {
        const member = await createMember();
        const { plan, exercises } = await createPastPlan(member.id, '2020-01-01', ['Barbell Back Squat']);
        await db
          .update(fTrainingPlans)
          .set({ status: 'trainer_edited', lastEditedByUserId: member.id, lastEditedAt: new Date('2019-12-01') })
          .where(eq(fTrainingPlans.id, plan.id));
        const evaluateCorrection: EvaluateCorrection = async () => ({
          ok: true,
          data: { exercises: [{ exerciseId: exercises[0]!.exerciseId, sets: 3, reps: 10, completed: true }] },
        });

        const blocked = await adjustPlan(member.id, '2020-01-01', 'I did the squats', false, { evaluateCorrection });
        expect(blocked).toMatchObject({ status: 'needs_confirmation', editedBy: 'Chat Test Member' });

        const confirmed = expectOk(await adjustPlan(member.id, '2020-01-01', 'I did the squats', true, { evaluateCorrection }));
        expect(confirmed.exercises[0]?.completed).toBe(true);
      });

      it('throws INTERNAL_SERVER_ERROR on an AI failure and changes nothing', async () => {
        const member = await createMember();
        const { plan } = await createPastPlan(member.id, '2020-01-01', ['Barbell Back Squat']);

        await expect(
          adjustPlan(member.id, '2020-01-01', 'I skipped this', false, { evaluateCorrection: alwaysFailsCorrection }),
        ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR', message: 'AI is temporarily unavailable' });

        const rows = await db.select().from(fTrainingPlanExercises).where(eq(fTrainingPlanExercises.trainingPlanId, plan.id));
        expect(rows).toHaveLength(1);
      });
    });
  });

  describe('context builder (unit)', () => {
    it('summarizes older events as a single-line count by type', () => {
      const events = [
        { eventType: 'injury' },
        { eventType: 'injury' },
        { eventType: 'life_event' },
      ] as never;

      expect(summarizeOlderEvents(events)).toBe('3 older events not shown in detail: 2 injury, 1 life_event.');
    });

    it('returns null when there are no older events', () => {
      expect(summarizeOlderEvents([])).toBeNull();
    });

    it('includes profile, onboarding, plan, risk, catalog, and aggregate data in the prompt', () => {
      const context: ChatContext = {
        ageYears: 30,
        gender: 'female',
        onboardingSubmissions: [
          { goals: 'Get stronger', medications: ['Ibuprofen'], physicalConditions: { conditions: ['asthma'], otherNotes: undefined } } as never,
        ],
        recentEvents: [{ eventType: 'skipped_exercise', payload: { description: 'skipped leg day' } } as never],
        activeHealthEvents: [{ eventType: 'injury', payload: { description: 'sore left knee' } } as never],
        olderEventsSummary: '5 older events not shown in detail: 5 life_event.',
        todayPlan: {
          id: 'plan-1',
          userId: 'user-1',
          planDate: '2026-10-01',
          status: 'ai_published',
          exercises: [{ exerciseName: 'Barbell Back Squat', sets: 5, reps: 5, completed: false } as never],
        } as never,
        availableExercises: [{ id: 'ex-1', name: 'Bodyweight Squat', muscleGroup: 'legs' }],
        aggregate: { topExercises: [{ name: 'Push-Up', count: 4 }], topMuscleGroups: [{ name: 'legs', count: 6 }] },
      };

      const prompt = buildChatUserPrompt(context, 'Should I train legs today?');

      expect(prompt).toContain('Member age: 30');
      expect(prompt).toContain('Member gender: female');
      expect(prompt).toContain('Goals: Get stronger');
      expect(prompt).toContain('Barbell Back Squat');
      expect(prompt).toContain('skipped leg day');
      expect(prompt).toContain('sore left knee');
      expect(prompt).toContain('Bodyweight Squat');
      expect(prompt).toContain('Push-Up (4)');
      expect(prompt).toContain('legs (6)');
      expect(prompt).toContain('5 older events not shown in detail: 5 life_event.');
      expect(prompt).toContain('Should I train legs today?');
    });

    it('reports no plan and no events gracefully', () => {
      const context: ChatContext = {
        ageYears: null,
        gender: null,
        onboardingSubmissions: [],
        recentEvents: [],
        activeHealthEvents: [],
        olderEventsSummary: null,
        todayPlan: null,
        availableExercises: [],
        aggregate: { topExercises: [], topMuscleGroups: [] },
      };

      const prompt = buildChatUserPrompt(context, 'Hi');

      expect(prompt).toContain('Member age: unknown');
      expect(prompt).toContain('Member gender: unknown');
      expect(prompt).toContain("Today's plan: none generated yet.");
      expect(prompt).toContain('- none reported');
      expect(prompt).toContain('- none yet');
      expect(prompt).toContain('Top exercises: none yet');
      expect(prompt).toContain('Top muscle groups: none yet');
    });
  });
});
