import { db, pool } from '@api/db/client';
import {
  dExercises,
  dUsers,
  fPlanChanges,
  fProfileEvents,
  fTrainingPlanExercises,
  fTrainingPlans,
} from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import { todayLocal } from '@api/lib/dates';
import type { AiResult } from '@api/modules/ai';
import { eventsFromObject } from '@api/modules/ai/json-stream';
import { assembleChatContext, buildChatUserPrompt, summarizeOlderEvents } from '@api/modules/chat/context';
import { applyDraft, type CoachStream, type CoachStreamRequest, sendMessage } from '@api/modules/chat/service';
import { resetTestDatabase } from '@api/test/database';
import type { CoachAiEnvelope, CoachBlock, CoachSendInput, CoachStreamEvent } from '@cadence/shared/schemas/coach';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

async function createMember(email = 'chat-member@example.com') {
  const [user] = await db
    .insert(dUsers)
    .values({ email, name: 'Chat Test Member', birthdate: '1995-06-15' })
    .returning();
  return user!;
}

async function exerciseIdByName(name: string) {
  const [exercise] = await db.select({ id: dExercises.id }).from(dExercises).where(eq(dExercises.name, name));
  return exercise!.id;
}

async function createPlan(userId: string, planDate: string, exerciseNames: readonly string[]) {
  const [plan] = await db
    .insert(fTrainingPlans)
    .values({ userId, planDate, status: 'ai_published', aiGeneratedAt: new Date() })
    .returning();
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

const message = (text: string, extra: Partial<CoachSendInput> = {}): CoachSendInput => ({
  message: text,
  mentions: [],
  history: [],
  ...extra,
});

// The answer is deliberately untyped: the point of several tests is what the server does with a malformed one.
function answering(answer: Record<string, unknown>) {
  const spy = vi.fn<CoachStream>(async function* (_request: CoachStreamRequest) {
    const object = { reply: 'Ok.', ...answer };
    for (const event of eventsFromObject(object)) yield { type: 'event' as const, event };
    yield { type: 'result' as const, result: { ok: true, data: object } as AiResult<CoachAiEnvelope> };
  });
  return spy;
}

const failing: CoachStream = async function* () {
  yield { type: 'result', result: { ok: false, reason: 'unavailable' } };
};

async function collect(stream: AsyncGenerator<CoachStreamEvent>) {
  const events: CoachStreamEvent[] = [];
  for await (const event of stream) events.push(event);
  const text = events.flatMap((event) => (event.type === 'text' ? [event.delta] : [])).join('');
  const blocks = events.flatMap((event) => (event.type === 'block' ? [event.block] : []));
  return { events, text, blocks };
}

function blockOf<Type extends CoachBlock['type']>(blocks: readonly CoachBlock[], type: Type) {
  return blocks.find((block): block is Extract<CoachBlock, { type: Type }> => block.type === type);
}

describe('chat', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  describe('sendMessage', () => {
    it('streams the reply, stores each reported fact as pending and returns it as a facts block', async () => {
      const member = await createMember();
      const stream = answering({
        reply: 'Noted, take it easy on that knee.',
        facts: [
          { eventType: 'injury', payload: { description: 'sore left knee', muscles: ['quads'] } },
          { eventType: 'medication_change', payload: { description: 'started a new pill' } },
        ],
      });

      const { text, blocks } = await collect(
        sendMessage(member.id, message('I hurt my knee and started a new pill.'), { stream }),
      );

      expect(text).toBe('Noted, take it easy on that knee.');
      const facts = blockOf(blocks, 'facts')!;
      expect(facts.facts).toEqual([
        expect.objectContaining({
          eventType: 'injury',
          label: 'Injury',
          description: 'sore left knee',
          muscles: ['quads'],
        }),
        expect.objectContaining({ eventType: 'medication_change', muscles: [] }),
      ]);
      const rows = await db.select().from(fProfileEvents).where(eq(fProfileEvents.userId, member.id));
      expect(rows).toHaveLength(2);
      expect(rows.every((row) => row.confirmedAt === null && row.resolvedAt === null)).toBe(true);
      expect(rows.map((row) => row.id).sort()).toEqual(facts.facts.map((fact) => fact.id).sort());
    });

    it('remembers everything but an injury or a medication at once, without asking the member', async () => {
      const member = await createMember();
      const stream = answering({
        facts: [
          { eventType: 'life_event', payload: { description: 'moved to a new flat' } },
          { eventType: 'plan_adjustment_request', payload: { description: 'wants more back work later' } },
        ],
      });

      const { blocks } = await collect(sendMessage(member.id, message('We moved. More back next time.'), { stream }));

      expect(blockOf(blocks, 'facts')).toBeUndefined();
      const rows = await db.select().from(fProfileEvents).where(eq(fProfileEvents.userId, member.id));
      expect(rows.map((row) => row.eventType).sort()).toEqual(['life_event', 'plan_adjustment_request']);
      expect(rows.every((row) => row.confirmedAt !== null && row.resolvedAt === null)).toBe(true);
    });

    it('does not report a request for a plan as a fact while it proposes that plan', async () => {
      const member = await createMember();
      const lungeId = await exerciseIdByName('Walking Lunge');
      const stream = answering({
        facts: [{ eventType: 'plan_adjustment_request', payload: { description: 'wants a plan for Oct 10' } }],
        planProposal: {
          date: todayLocal(),
          summary: 'A leg day',
          memory: 'Asked for a hard leg day to test their limits.',
          exercises: [{ exerciseId: lungeId, sets: 3, reps: 10 }],
        },
      });

      const { blocks } = await collect(sendMessage(member.id, message('A plan for Oct 10'), { stream }));

      expect(blockOf(blocks, 'plan_proposal')?.memoryNote).toBe('Asked for a hard leg day to test their limits.');
      expect(await db.select().from(fProfileEvents).where(eq(fProfileEvents.userId, member.id))).toHaveLength(0);
    });

    it('writes its own memory note for a proposal when the coach gave none', async () => {
      const member = await createMember();
      const lungeId = await exerciseIdByName('Walking Lunge');
      const stream = answering({
        planProposal: {
          date: todayLocal(),
          summary: 'A leg day',
          exercises: [{ exerciseId: lungeId, sets: 3, reps: 10 }],
        },
      });

      const { blocks } = await collect(sendMessage(member.id, message('Legs please'), { stream }));

      expect(blockOf(blocks, 'plan_proposal')?.memoryNote).toBe(`Plan for ${todayLocal()}: A leg day`);
    });

    it('shows the draft memory note to the coach so a revision can build on it', async () => {
      const member = await createMember();
      const stream = answering({});
      const lungeId = await exerciseIdByName('Walking Lunge');

      await collect(
        sendMessage(
          member.id,
          message('More chest', {
            draft: {
              date: todayLocal(),
              memoryNote: 'Asked for a hard chest day.',
              exercises: [{ exerciseId: lungeId, sets: 3, reps: 10 }],
            },
          }),
          { stream },
        ),
      );

      expect(stream.mock.calls[0]![0].user).toContain('Memory note for this draft so far');
      expect(stream.mock.calls[0]![0].user).toContain('Asked for a hard chest day.');
    });

    it('keeps a pending fact and a dismissed one out of the next prompt', async () => {
      const member = await createMember();
      await db.insert(fProfileEvents).values([
        {
          userId: member.id,
          eventType: 'injury',
          payload: { description: 'unconfirmed shoulder pain' },
          confirmedAt: null,
        },
        { userId: member.id, eventType: 'life_event', payload: { description: 'moved to a new flat' } },
      ]);
      const stream = answering({});

      await collect(sendMessage(member.id, message('Hi'), { stream }));

      const prompt = stream.mock.calls[0]![0].user;
      expect(prompt).not.toContain('unconfirmed shoulder pain');
      expect(prompt).toContain('moved to a new flat');
    });

    it('truncates the stored source_message to 200 characters', async () => {
      const member = await createMember();
      const stream = answering({ facts: [{ eventType: 'life_event', payload: { description: 'a life event' } }] });

      await collect(sendMessage(member.id, message('a'.repeat(250)), { stream }));

      const [row] = await db.select().from(fProfileEvents).where(eq(fProfileEvents.userId, member.id));
      expect(row?.sourceMessage).toHaveLength(200);
    });

    it('throws INTERNAL_SERVER_ERROR on an AI failure and persists nothing', async () => {
      const member = await createMember();

      await expect(collect(sendMessage(member.id, message('hello'), { stream: failing }))).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'AI is temporarily unavailable',
      });

      expect(await db.select().from(fProfileEvents).where(eq(fProfileEvents.userId, member.id))).toHaveLength(0);
    });

    it('offers the read-only tools, bound to the member, and says nothing can be written', async () => {
      const member = await createMember();
      const stream = answering({});

      await collect(sendMessage(member.id, message('Hi'), { stream }));

      const request = stream.mock.calls[0]![0];
      expect(request.tools.map((tool) => tool.name)).toEqual([
        'getExerciseDetails',
        'searchExercises',
        'getWorkoutHistory',
        'getTrainerNotes',
        'getEquipmentStatus',
      ]);
      const details = request.tools.find((tool) => tool.name === 'getExerciseDetails')!;
      const squatId = await exerciseIdByName('Barbell Back Squat');
      await expect(details.run({ exerciseId: squatId })).resolves.toContain('Bar racked across the upper back');
    });

    describe('a plan proposal', () => {
      it('is rebuilt on the server: diff against the saved plan, catalog checked, unavailable exercises dropped', async () => {
        const member = await createMember();
        const { exercises } = await createPlan(member.id, todayLocal(), ['Barbell Back Squat', 'Push-Up']);
        const squatId = exercises[0]!.exerciseId;
        const lungeId = await exerciseIdByName('Walking Lunge');
        const rowingId = await exerciseIdByName('Rowing Machine Sprint');
        const stream = answering({
          planProposal: {
            date: todayLocal(),
            summary: 'Lighter legs',
            exercises: [
              { exerciseId: squatId, sets: 3, reps: 8, reason: 'Fewer reps' },
              { exerciseId: lungeId, sets: 3, reps: 12, reason: 'Gentler on the back' },
              { exerciseId: rowingId, sets: 3, reps: 10 },
              { exerciseId: lungeId, sets: 9, reps: 9 },
            ],
          },
        });

        const { blocks } = await collect(sendMessage(member.id, message('Make legs easier'), { stream }));

        const proposal = blockOf(blocks, 'plan_proposal')!;
        expect(proposal.date).toBe(todayLocal());
        expect(proposal.before.map((row) => row.name)).toEqual(['Barbell Back Squat', 'Push-Up']);
        expect(proposal.after.map((row) => [row.name, row.sets, row.reps, row.reason])).toEqual([
          ['Barbell Back Squat', 3, 8, 'Fewer reps'],
          ['Walking Lunge', 3, 12, 'Gentler on the back'],
        ]);
      });

      it('adds an injury warning computed from the member’s own facts, whatever the AI says', async () => {
        const member = await createMember();
        await db.insert(fProfileEvents).values({
          userId: member.id,
          eventType: 'injury',
          payload: { description: 'sore left knee', muscles: ['quads'] },
        });
        await createPlan(member.id, todayLocal(), ['Push-Up']);
        const squatId = await exerciseIdByName('Barbell Back Squat');
        const stream = answering({
          planProposal: {
            date: todayLocal(),
            summary: 'Add squats',
            exercises: [{ exerciseId: squatId, sets: 3, reps: 5 }],
            warnings: [{ exerciseId: squatId, reason: 'Heavy' }],
          },
        });

        const { blocks } = await collect(sendMessage(member.id, message('Add squats'), { stream }));

        expect(blockOf(blocks, 'plan_proposal')!.warnings).toEqual([
          expect.objectContaining({ exerciseId: squatId, source: 'injury' }),
        ]);
      });

      it('survives the slips a model makes: numbers as text, no summary, no date, one exercise that does not exist', async () => {
        const member = await createMember();
        const lungeId = await exerciseIdByName('Walking Lunge');
        const stream = answering({
          planProposal: {
            exercises: [{ exerciseId: lungeId, sets: '3', reps: '12' }, { exerciseId: 'not-an-exercise' }],
          },
        });

        const { blocks, text } = await collect(sendMessage(member.id, message('More chest'), { stream }));

        const proposal = blockOf(blocks, 'plan_proposal');
        expect(proposal?.date).toBe(todayLocal());
        expect(proposal?.after).toMatchObject([{ exerciseId: lungeId, sets: 3, reps: 12 }]);
        expect(text).toBe('Ok.');
      });

      it('tells the member when the coach wrote a proposal the server could not use', async () => {
        const member = await createMember();
        const stream = answering({
          reply: 'Done, I updated your plan.',
          planProposal: { date: todayLocal(), summary: 'More chest', exercises: [{ exerciseId: 'not-an-exercise' }] },
        });

        const { blocks, text } = await collect(sendMessage(member.id, message('More chest'), { stream }));

        expect(blockOf(blocks, 'plan_proposal')).toBeUndefined();
        expect(text).toContain("I couldn't turn that into a plan change");
      });

      it('is dropped when it changes nothing', async () => {
        const member = await createMember();
        const { exercises } = await createPlan(member.id, todayLocal(), ['Push-Up']);
        const stream = answering({
          planProposal: {
            date: todayLocal(),
            summary: 'Same plan',
            exercises: [{ exerciseId: exercises[0]!.exerciseId, sets: 3, reps: 10 }],
          },
        });

        const { blocks } = await collect(sendMessage(member.id, message('Keep it'), { stream }));

        expect(blockOf(blocks, 'plan_proposal')).toBeUndefined();
      });

      it('moves a correction for a past day with no plan to the plan date, and keeps one for a day that has a plan', async () => {
        const member = await createMember();
        const { exercises } = await createPlan(member.id, '2020-01-02', ['Push-Up']);
        const lungeId = await exerciseIdByName('Walking Lunge');
        const proposalFor = (date: string) =>
          answering({
            planProposal: {
              date,
              summary: 'Correction',
              exercises: [
                { exerciseId: exercises[0]!.exerciseId, sets: 3, reps: 10, completed: true },
                { exerciseId: lungeId, sets: 3, reps: 12, completed: false },
              ],
            },
          });

        const missing = await collect(sendMessage(member.id, message('Fix it'), { stream: proposalFor('2020-01-01') }));
        const existing = await collect(
          sendMessage(member.id, message('Fix it'), { stream: proposalFor('2020-01-02') }),
        );

        expect(blockOf(missing.blocks, 'plan_proposal')?.date).toBe(todayLocal());
        expect(blockOf(existing.blocks, 'plan_proposal')?.date).toBe('2020-01-02');
        expect(blockOf(existing.blocks, 'plan_proposal')?.after.map((row) => row.completed)).toEqual([true, false]);
      });

      it('revises the draft the member sent, and diffs against the saved plan, not the draft', async () => {
        const member = await createMember();
        const { exercises } = await createPlan(member.id, todayLocal(), ['Push-Up']);
        const pushUpId = exercises[0]!.exerciseId;
        const lungeId = await exerciseIdByName('Walking Lunge');
        const stream = answering({
          planProposal: {
            date: todayLocal(),
            summary: 'Three reps',
            exercises: [
              { exerciseId: pushUpId, sets: 3, reps: 10 },
              { exerciseId: lungeId, sets: 3, reps: 3 },
            ],
          },
        });

        const { blocks } = await collect(
          sendMessage(
            member.id,
            message('4 reps is too much, reduce to 3', {
              mentions: [{ type: 'exercise', exerciseId: lungeId }],
              draft: {
                date: todayLocal(),
                exercises: [
                  { exerciseId: pushUpId, sets: 3, reps: 10 },
                  { exerciseId: lungeId, sets: 3, reps: 4 },
                ],
              },
            }),
            { stream },
          ),
        );

        const prompt = stream.mock.calls[0]![0].user;
        expect(prompt).toContain('Draft the member is reviewing');
        expect(prompt).toContain(`exercise ${lungeId} | Walking Lunge`);
        expect(blockOf(blocks, 'plan_proposal')!.before.map((row) => row.name)).toEqual(['Push-Up']);
      });
    });

    it('reads a recommended weight as kilograms and treats no weight, zero or text as bodyweight', async () => {
      const member = await createMember();
      const squatId = await exerciseIdByName('Bodyweight Squat');
      const lungeId = await exerciseIdByName('Walking Lunge');
      const stream = answering({
        exercisePicker: {
          muscle: 'quads',
          options: [
            { exerciseId: squatId, sets: 3, reps: 12, reason: 'Bodyweight', load: 'bodyweight' },
            { exerciseId: lungeId, sets: 3, reps: 12, reason: 'Dumbbells', load: '12.5 kg' },
          ],
        },
      });

      const { blocks } = await collect(
        sendMessage(member.id, message('Add quads', { mentions: [{ type: 'muscle', muscle: 'quads' }] }), { stream }),
      );

      expect(blockOf(blocks, 'exercise_picker')!.options.map((option) => [option.name, option.load])).toEqual([
        ['Bodyweight Squat', null],
        ['Walking Lunge', 12.5],
      ]);
      expect(stream.mock.calls[0]![0].system).toContain('in kilograms as a plain number');
    });

    describe('an exercise picker', () => {
      it('offers only exercises the server prefiltered for the muscle the member pointed at', async () => {
        const member = await createMember();
        await db.insert(fProfileEvents).values({
          userId: member.id,
          eventType: 'injury',
          payload: { description: 'sore left knee', muscles: ['glutes'] },
        });
        const lungeId = await exerciseIdByName('Walking Lunge');
        const squatId = await exerciseIdByName('Bodyweight Squat');
        const pushUpId = await exerciseIdByName('Push-Up');
        const stream = answering({
          exercisePicker: {
            muscle: 'quads',
            options: [
              { exerciseId: squatId, sets: 3, reps: 12, reason: 'Easy on the knee' },
              { exerciseId: lungeId, sets: 3, reps: 12, reason: 'Needs glutes' },
              { exerciseId: pushUpId, sets: 3, reps: 12, reason: 'Not a leg exercise' },
            ],
          },
        });

        const { blocks } = await collect(
          sendMessage(member.id, message('Add quads', { mentions: [{ type: 'muscle', muscle: 'quads' }] }), { stream }),
        );

        const prompt = stream.mock.calls[0]![0].user;
        expect(prompt).toContain('Candidate exercises for Quads');
        expect(blockOf(blocks, 'exercise_picker')!.options.map((option) => option.name)).toEqual(['Bodyweight Squat']);
      });
    });

    it('builds an exercise explainer and a safety warning with safe alternatives only', async () => {
      const member = await createMember();
      await db.insert(fProfileEvents).values({
        userId: member.id,
        eventType: 'injury',
        payload: { description: 'sore left knee', muscles: ['quads'] },
      });
      const squatId = await exerciseIdByName('Barbell Back Squat');
      const lungeId = await exerciseIdByName('Walking Lunge');
      const pushUpId = await exerciseIdByName('Push-Up');
      const stream = answering({
        exerciseExplainer: {
          exerciseId: squatId,
          summary: 'A compound leg lift',
          technique: ['Brace', 'Sit back'],
          benefits: ['Strong legs'],
          mistakes: ['Knees caving'],
          personalNote: 'Keep it shallow for now.',
        },
        safetyWarning: { exerciseId: squatId, reason: 'Loads the knee', alternativeExerciseIds: [lungeId, pushUpId] },
      });

      const { blocks } = await collect(sendMessage(member.id, message('Is squat ok?'), { stream }));

      expect(blockOf(blocks, 'exercise_explainer')).toMatchObject({
        exercise: { name: 'Barbell Back Squat' },
        personalNote: 'Keep it shallow for now.',
      });
      expect(blockOf(blocks, 'safety_warning')!.alternatives.map((option) => option.name)).toEqual(['Push-Up']);
    });

    it('shows the coach what was said earlier in the chat, so a bare "yes" still means something', async () => {
      const member = await createMember();
      const stream = answering({});

      await collect(
        sendMessage(
          member.id,
          message('Yes, add it', {
            history: [
              { role: 'member', text: 'Can you give me something for my chest?' },
              {
                role: 'assistant',
                text: 'Push-Up suits you. [Showed options for Chest with an Add button: Push-Up 3x12.]',
              },
            ],
          }),
          { stream },
        ),
      );

      const prompt = stream.mock.calls[0]![0].user;
      expect(prompt).toContain('Earlier in this chat');
      expect(prompt).toContain('- Member: Can you give me something for my chest?');
      expect(prompt).toContain('- Coach: Push-Up suits you.');
      expect(prompt.indexOf('Earlier in this chat')).toBeLessThan(prompt.indexOf('Member message:'));
    });

    it('tells the coach to show an offer as a proposal instead of asking about it in text', async () => {
      const member = await createMember();
      const stream = answering({});

      await collect(sendMessage(member.id, message('Hi'), { stream }));

      expect(stream.mock.calls[0]![0].system).toContain('Never ask the member in the reply whether they want');
    });

    it('keeps the reply when one component is malformed, and clamps numbers instead of rejecting them', async () => {
      const member = await createMember();
      const lungeId = await exerciseIdByName('Walking Lunge');
      const stream = answering({
        reply: 'Here is the change.',
        exercisePicker: { muscle: 'not-a-muscle', options: [] },
        facts: [
          { eventType: 'injury', payload: { description: 'sore ankle from soccer' } },
          { eventType: 'not-a-type', payload: {} },
        ],
        quickReplies: ['Short', 'x'.repeat(200), '', 'Third', 'Fourth'],
        planProposal: {
          date: 'next tuesday',
          summary: 'A very long summary. '.repeat(40),
          exercises: [{ exerciseId: lungeId, sets: 99, reps: 0.2, load: '22,5 kg' }],
        },
      });

      const { text, blocks } = await collect(sendMessage(member.id, message('Add lunges'), { stream }));

      expect(text).toBe('Here is the change.');
      expect(blockOf(blocks, 'exercise_picker')).toBeUndefined();
      const proposal = blockOf(blocks, 'plan_proposal')!;
      expect(proposal.date).toBe(todayLocal());
      expect(proposal.summary.length).toBeLessThanOrEqual(280);
      expect(proposal.after[0]).toMatchObject({ sets: 20, reps: 1 });
      expect(proposal.after[0]?.load).toBe(22.5);
      expect(blockOf(blocks, 'facts')!.facts).toHaveLength(1);
      expect(blockOf(blocks, 'quick_replies')!.replies).toHaveLength(3);
      expect(blockOf(blocks, 'quick_replies')!.replies[1]).toHaveLength(60);
    });

    it('returns quick replies last', async () => {
      const member = await createMember();
      const stream = answering({
        facts: [{ eventType: 'injury', payload: { description: 'sore ankle from soccer' } }],
        quickReplies: ['Make it shorter', 'Explain why'],
      });

      const { blocks } = await collect(sendMessage(member.id, message('I played soccer'), { stream }));

      expect(blocks.map((block) => block.type)).toEqual(['facts', 'quick_replies']);
    });
  });

  describe('applyDraft', () => {
    const base = { request: 'Make it easier', memoryNote: '', acknowledgedWarnings: [], confirmOverwrite: false };

    it('remembers the applied plan as one confirmed line, the coach note when there is one and the request otherwise', async () => {
      const member = await createMember();
      const lungeId = await exerciseIdByName('Walking Lunge');
      const exercises = [{ exerciseId: lungeId, sets: 3, reps: 12 }];

      await applyDraft(member.id, {
        ...base,
        date: '2999-10-10',
        memoryNote: 'Asked for a hard chest and shoulders day to test their limits.',
        exercises,
      });
      await applyDraft(member.id, { ...base, date: '2999-10-11', exercises });

      const rows = await db.select().from(fProfileEvents).where(eq(fProfileEvents.userId, member.id));
      expect(rows.every((row) => row.eventType === 'plan_adjustment_request' && row.confirmedAt !== null)).toBe(true);
      expect(rows.map((row) => (row.payload as { description: string }).description).sort()).toEqual([
        'Applied a plan for 2999-10-11: Make it easier',
        'Asked for a hard chest and shoulders day to test their limits.',
      ]);
    });

    it('replaces the plan with exactly the draft, keeps ticks of exercises that stay, and logs the change', async () => {
      const member = await createMember();
      const { plan, exercises } = await createPlan(member.id, todayLocal(), ['Barbell Back Squat', 'Push-Up']);
      await db
        .update(fTrainingPlanExercises)
        .set({ completed: true })
        .where(eq(fTrainingPlanExercises.id, exercises[1]!.id));
      const lungeId = await exerciseIdByName('Walking Lunge');

      const blocked = await applyDraft(member.id, {
        ...base,
        date: todayLocal(),
        exercises: [
          { exerciseId: exercises[1]!.exerciseId, sets: 3, reps: 8 },
          { exerciseId: lungeId, sets: 3, reps: 12, load: 10 },
        ],
      });
      expect(blocked).toMatchObject({ status: 'needs_confirmation', reason: 'has_completed' });

      const result = await applyDraft(member.id, {
        ...base,
        confirmOverwrite: true,
        date: todayLocal(),
        exercises: [
          { exerciseId: exercises[1]!.exerciseId, sets: 3, reps: 8 },
          { exerciseId: lungeId, sets: 3, reps: 12, load: 10 },
        ],
      });

      if (result.status !== 'ok') throw new Error(`Expected ok, got ${result.status}`);
      expect(result.plan.id).toBe(plan.id);
      expect(result.plan.exercises.map((row) => [row.exerciseId, row.reps, row.load, row.completed])).toEqual([
        [exercises[1]!.exerciseId, 8, null, true],
        [lungeId, 12, 10, false],
      ]);
      const [change] = await db.select().from(fPlanChanges).where(eq(fPlanChanges.trainingPlanId, plan.id));
      expect(change).toMatchObject({ kind: 'coach', request: 'Make it easier', acknowledgedWarnings: [] });
      expect((change!.before as { name: string }[]).map((row) => row.name)).toEqual(['Barbell Back Squat', 'Push-Up']);
      expect((change!.after as { name: string }[]).map((row) => row.name)).toEqual(['Push-Up', 'Walking Lunge']);
    });

    it('asks for acknowledgement of an injury warning, then records the acknowledged risk', async () => {
      const member = await createMember();
      await db.insert(fProfileEvents).values({
        userId: member.id,
        eventType: 'injury',
        payload: { description: 'sore left knee', muscles: ['quads'] },
      });
      const squatId = await exerciseIdByName('Barbell Back Squat');
      const input = { ...base, date: todayLocal(), exercises: [{ exerciseId: squatId, sets: 3, reps: 5 }] };

      const refused = await applyDraft(member.id, input);
      expect(refused).toMatchObject({ status: 'needs_acknowledgement', warnings: [{ exerciseId: squatId }] });
      expect(await db.select().from(fTrainingPlans).where(eq(fTrainingPlans.userId, member.id))).toHaveLength(0);

      const accepted = await applyDraft(member.id, {
        ...input,
        acknowledgedWarnings: [{ exerciseId: squatId, reason: 'anything' }],
      });
      if (accepted.status !== 'ok') throw new Error('Expected ok');
      const [change] = await db.select().from(fPlanChanges).where(eq(fPlanChanges.trainingPlanId, accepted.plan.id));
      expect(change!.acknowledgedWarnings).toEqual([
        { exerciseId: squatId, name: 'Barbell Back Squat', reason: expect.stringContaining('sore left knee') },
      ]);
    });

    it('asks to confirm before replacing a trainer-edited plan', async () => {
      const member = await createMember();
      const { plan } = await createPlan(member.id, todayLocal(), ['Barbell Back Squat']);
      await db
        .update(fTrainingPlans)
        .set({ status: 'trainer_edited', lastEditedByUserId: member.id, lastEditedAt: new Date('2026-09-20') })
        .where(eq(fTrainingPlans.id, plan.id));
      const lungeId = await exerciseIdByName('Walking Lunge');

      const result = await applyDraft(member.id, {
        ...base,
        date: todayLocal(),
        exercises: [{ exerciseId: lungeId, sets: 3, reps: 12 }],
      });

      expect(result).toMatchObject({
        status: 'needs_confirmation',
        reason: 'trainer_edited',
        editedBy: 'Chat Test Member',
      });
    });

    it('refuses an unavailable or repeated exercise and a past day without a plan', async () => {
      const member = await createMember();
      const rowingId = await exerciseIdByName('Rowing Machine Sprint');
      const lungeId = await exerciseIdByName('Walking Lunge');

      await expect(
        applyDraft(member.id, {
          ...base,
          date: todayLocal(),
          exercises: [{ exerciseId: rowingId, sets: 3, reps: 10 }],
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      await expect(
        applyDraft(member.id, {
          ...base,
          date: todayLocal(),
          exercises: [
            { exerciseId: lungeId, sets: 3, reps: 10 },
            { exerciseId: lungeId, sets: 3, reps: 8 },
          ],
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      await expect(
        applyDraft(member.id, { ...base, date: '2020-01-01', exercises: [{ exerciseId: lungeId, sets: 3, reps: 10 }] }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('corrects a past day in place with the ticks the draft states', async () => {
      const member = await createMember();
      const { plan, exercises } = await createPlan(member.id, '2020-01-01', ['Barbell Back Squat']);
      const lungeId = await exerciseIdByName('Walking Lunge');

      const result = await applyDraft(member.id, {
        ...base,
        date: '2020-01-01',
        exercises: [
          { exerciseId: exercises[0]!.exerciseId, sets: 3, reps: 10, completed: true },
          { exerciseId: lungeId, sets: 3, reps: 12, completed: false },
        ],
      });

      if (result.status !== 'ok') throw new Error('Expected ok');
      expect(result.plan.id).toBe(plan.id);
      expect(result.plan.exercises.map((row) => row.completed)).toEqual([true, false]);
    });
  });

  describe('context builder (unit)', () => {
    it('summarizes older events as a single-line count by type', () => {
      const events = [
        { eventType: 'state_update' },
        { eventType: 'state_update' },
        { eventType: 'life_event' },
      ] as never;

      expect(summarizeOlderEvents(events)).toBe('3 older events not shown in detail: 2 state_update, 1 life_event.');
    });

    it('never folds an injury or a medication change into the older-events count', () => {
      const events = [
        { eventType: 'injury' },
        { eventType: 'medication_change' },
        { eventType: 'life_event' },
        { eventType: 'state_update' },
      ] as never;

      expect(summarizeOlderEvents(events)).toBe('2 older events not shown in detail: 1 life_event, 1 state_update.');
      expect(summarizeOlderEvents([{ eventType: 'injury' }, { eventType: 'medication_change' }] as never)).toBeNull();
      expect(summarizeOlderEvents([])).toBeNull();
    });

    it("surfaces the member's own injury next to the plan, a resolved fact stays out, and the aggregate is anonymous (FR-28/FR-29)", async () => {
      const member = await createMember();
      const other = await createMember('chat-other-member@example.com');
      await db.insert(fProfileEvents).values([
        { userId: member.id, eventType: 'injury', payload: { description: 'sore left knee' } },
        {
          userId: member.id,
          eventType: 'injury',
          payload: { description: 'healed shoulder strain' },
          resolvedAt: new Date(),
        },
      ]);
      await createPlan(member.id, todayLocal(), ['Barbell Back Squat']);
      await createPlan(other.id, todayLocal(), ['Push-Up']);

      const context = await assembleChatContext(member.id, message('Is it safe to squat today?'));
      const prompt = buildChatUserPrompt(context, message('Is it safe to squat today?'));

      expect(prompt).toContain(`Today's date: ${todayLocal()}`);
      expect(prompt).toContain('Member age:');
      expect(prompt).toContain('sore left knee');
      expect(prompt).not.toContain('healed shoulder strain');
      expect(prompt).toContain('Barbell Back Squat');
      expect(prompt).toContain('Push-Up (1)');
      expect(prompt).toContain('Is it safe to squat today?');
    });

    it('keeps an old unresolved injury in the detailed block even when 50 newer events push it out of the window', async () => {
      const member = await createMember();
      await db.insert(fProfileEvents).values([
        {
          userId: member.id,
          eventType: 'injury',
          payload: { description: 'torn ligament from years ago' },
          createdAt: new Date('2020-01-01T10:00:00Z'),
        },
        ...Array.from({ length: 55 }, (_, index) => ({
          userId: member.id,
          eventType: 'life_event' as const,
          payload: { description: `busy week ${index}` },
          createdAt: new Date(Date.now() - index * 60_000),
        })),
      ]);

      const context = await assembleChatContext(member.id, message('Is squatting ok?'));
      const prompt = buildChatUserPrompt(context, message('Is squatting ok?'));

      expect(prompt.split('Available exercise catalog')[0]).toContain('torn ligament from years ago');
      expect(prompt).toContain('5 older events not shown in detail: 5 life_event.');
    });

    it('reports no plan and no events gracefully', async () => {
      const member = await createMember();

      const context = await assembleChatContext(member.id, message('Hi'));
      const prompt = buildChatUserPrompt(context, message('Hi'));

      expect(prompt).toContain(`Plan for ${todayLocal()}: none generated yet.`);
      expect(prompt).toContain('- none reported');
      expect(prompt).toContain('- none yet');
    });
  });
});
