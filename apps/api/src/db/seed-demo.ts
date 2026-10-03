import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '@api/config/env';
import { type Database, db as defaultDb, type Transaction } from '@api/db/client';
import {
  dExercises,
  dUsers,
  fAptitudeQuestionnaires,
  fCheckIns,
  fConsentEvents,
  fMedicalCertificates,
  fOnboardingSubmissions,
  fPlanReviews,
  fProfileEvents,
  fTrainingPlanExercises,
  fTrainingPlans,
  fUserPolicyGroupOnUser,
} from '@api/db/schema';
import { SEED_ADMIN_EMAIL, SEED_TRAINER_EMAIL } from '@api/db/seed';
import { localDateString } from '@api/lib/dates';
import { createFaceEmbedder } from '@api/lib/face-embedding';
import { resolveUploadPath } from '@api/lib/uploads';
import { DEFAULT_MEMBERSHIP_PLAN } from '@api/modules/auth/service';
import { MEMBER_GROUP } from '@cadence/shared/auth';
import { QUESTIONNAIRE_V1, type QuestionnaireAnswer } from '@cadence/shared/schemas/aptitude';
import { OCCUPANCY_WINDOW_MINUTES } from '@cadence/shared/schemas/gym';
import bcrypt from 'bcryptjs';
import { eq, inArray, sql } from 'drizzle-orm';

export const DEMO_MEMBER_COUNT = 25;
export const DEMO_APPLICANT_COUNT = 4;
export const DEMO_HISTORY_DAYS = 21;
// Minutes before the run time of the check-ins that keep the occupancy estimate above zero.
export const DEMO_RECENT_CHECK_IN_MINUTES = [5, 20, 45, 75] as const;

const BCRYPT_ROUNDS = 10;
const MS_PER_MINUTE = 60 * 1000;
const EXERCISES_PER_PLAN = 4;
const TRAINER_EDITED_PLAN_COUNT = 3;
const INSERT_CHUNK_SIZE = 1000;
// Every demo address matches this, so the cleanup can never reach a real account.
const DEMO_EMAIL_PATTERN = '^demo(-applicant)?[0-9]+@example\\.com$';
// 1x1 transparent PNG: enough for the admin queue to have a real, viewable file behind each row.
const PLACEHOLDER_CERTIFICATE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const GENDERS = ['female', 'male', 'prefer_not_to_say'] as const;
const GOALS = [
  'Build strength and muscle mass',
  'Lose weight and improve stamina',
  'Return to training after a break',
  'Improve posture and mobility',
  'Prepare for a 10 km race',
];
const EDIT_NOTES = [
  'Swapped the heavy lower-body work for lighter volume this week.',
  'Added core work after the member reported lower-back tightness.',
  'Reduced the load on pressing movements, shoulder still recovering.',
];
const COMMENT_NOTES = ['Good progression, keep the current structure.', 'Watch the knee position on squats.'];

const CERTIFICATE_APPLICANTS = [
  {
    aiResult: 'not_cleared',
    aiNotes: 'The file content could not be inspected, so a human must review it.',
    review: null,
  },
  {
    aiResult: 'pending_retry',
    aiNotes: 'AI evaluation unavailable; an admin will review this certificate.',
    review: null,
  },
  { aiResult: 'cleared', aiNotes: 'The document looks like a standard medical certificate.', review: null },
  {
    aiResult: 'not_cleared',
    aiNotes: 'The file content could not be inspected, so a human must review it.',
    review: 'not_cleared',
  },
] as const satisfies readonly {
  aiResult: 'cleared' | 'not_cleared' | 'pending_retry';
  aiNotes: string;
  review: 'cleared' | 'not_cleared' | null;
}[];

const stubEmbedder = createFaceEmbedder('stub');

// Fixed seed: two runs generate the same history, so the row counts are stable.
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
type Random = ReturnType<typeof createRandom>;

const memberEmail = (index: number) => `demo${index}@example.com`;
const applicantEmail = (index: number) => `demo-applicant${index}@example.com`;
const isActiveMember = (index: number) => index % 5 !== 0;

function atLocalTime(now: Date, daysAgo: number, hour: number, minute: number) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, hour, minute);
}

// Hours of day weighted so the morning (06:00-08:00) and evening (17:00-20:00) peaks stand out.
function hourWeights(isSaturday: boolean) {
  if (isSaturday) return new Map([8, 9, 10, 11, 12, 13].map((hour) => [hour, hour <= 10 ? 4 : 2]));
  const weights = new Map<number, number>();
  for (let hour = 6; hour <= 20; hour++) weights.set(hour, 1);
  for (const hour of [6, 7]) weights.set(hour, 9);
  for (const hour of [17, 18, 19]) weights.set(hour, 9);
  return weights;
}

function pickHour(weights: Map<number, number>, random: Random) {
  const total = [...weights.values()].reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (const [hour, weight] of weights) {
    roll -= weight;
    if (roll < 0) return hour;
  }
  return [...weights.keys()].at(-1)!;
}

function shuffled<T>(items: T[], random: Random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other]!, copy[index]!];
  }
  return copy;
}

async function insertInChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
    await insert(rows.slice(start, start + INSERT_CHUNK_SIZE));
  }
}

async function findAccountId(tx: Transaction, email: string) {
  const [user] = await tx.select({ id: dUsers.id }).from(dUsers).where(eq(dUsers.email, email));
  if (!user) throw new Error(`The demo seed needs ${email}: run the base seed (pnpm db:seed) first`);
  return user.id;
}

// The demo rows are rebuilt on every run, so only the history hanging off the demo accounts goes; the accounts
// themselves are kept (and updated in place) so ids and passwords stay stable.
async function clearDemoHistory(tx: Transaction, demoUserIds: string[]) {
  if (demoUserIds.length === 0) return;
  const planIds = tx
    .select({ id: fTrainingPlans.id })
    .from(fTrainingPlans)
    .where(inArray(fTrainingPlans.userId, demoUserIds));
  await tx.delete(fPlanReviews).where(inArray(fPlanReviews.trainingPlanId, planIds));
  await tx.delete(fTrainingPlanExercises).where(inArray(fTrainingPlanExercises.trainingPlanId, planIds));
  await tx.delete(fTrainingPlans).where(inArray(fTrainingPlans.userId, demoUserIds));
  await tx.delete(fCheckIns).where(inArray(fCheckIns.userId, demoUserIds));
  await tx.delete(fOnboardingSubmissions).where(inArray(fOnboardingSubmissions.userId, demoUserIds));
  await tx.delete(fProfileEvents).where(inArray(fProfileEvents.userId, demoUserIds));
  await tx.delete(fConsentEvents).where(inArray(fConsentEvents.userId, demoUserIds));
  await tx.delete(fAptitudeQuestionnaires).where(inArray(fAptitudeQuestionnaires.userId, demoUserIds));
  await tx.delete(fMedicalCertificates).where(inArray(fMedicalCertificates.userId, demoUserIds));
}

async function upsertMembers(tx: Transaction) {
  const passwordHash = await bcrypt.hash(env.SEED_STUDENT_PASSWORD, BCRYPT_ROUNDS);
  const rows = await Promise.all(
    Array.from({ length: DEMO_MEMBER_COUNT }, async (_, offset) => {
      const index = offset + 1;
      const embedding = await stubEmbedder(Buffer.from(`demo-member-${index}`));
      if (!embedding.ok) throw new Error(`The stub embedding failed for ${memberEmail(index)}`);
      return {
        email: memberEmail(index),
        name: `Demo Member ${index}`,
        phone: `+55 11 90000-${String(1000 + index)}`,
        passwordHash,
        birthdate: `${1975 + ((index * 7) % 30)}-${String(1 + (index % 12)).padStart(2, '0')}-${String(1 + (index % 28)).padStart(2, '0')}`,
        gender: GENDERS[index % GENDERS.length]!,
        referenceFaceEmbedding: embedding.embedding,
        aptitudeStatus: 'cleared' as const,
        membershipStatus: isActiveMember(index) ? ('active' as const) : ('inactive' as const),
        membershipPlan: DEFAULT_MEMBERSHIP_PLAN,
      };
    }),
  );

  const saved = await tx
    .insert(dUsers)
    .values(rows)
    .onConflictDoUpdate({
      target: dUsers.email,
      set: {
        name: sql`excluded.name`,
        phone: sql`excluded.phone`,
        birthdate: sql`excluded.birthdate`,
        gender: sql`excluded.gender`,
        referenceFaceEmbedding: sql`excluded.reference_face_embedding`,
        aptitudeStatus: sql`excluded.aptitude_status`,
        membershipStatus: sql`excluded.membership_status`,
        membershipPlan: sql`excluded.membership_plan`,
      },
    })
    .returning({ id: dUsers.id, email: dUsers.email });

  await tx
    .insert(fUserPolicyGroupOnUser)
    .values(saved.map((user) => ({ userId: user.id, groupId: MEMBER_GROUP })))
    .onConflictDoNothing();

  const idByEmail = new Map(saved.map((user) => [user.email, user.id]));
  return Array.from({ length: DEMO_MEMBER_COUNT }, (_, offset) => ({
    id: idByEmail.get(memberEmail(offset + 1))!,
    index: offset + 1,
    isActive: isActiveMember(offset + 1),
  }));
}

async function upsertApplicants(tx: Transaction) {
  const rows = CERTIFICATE_APPLICANTS.map((applicant, offset) => ({
    email: applicantEmail(offset + 1),
    name: `Demo Applicant ${offset + 1}`,
    phone: `+55 11 91000-${String(1000 + offset)}`,
    birthdate: `199${offset}-06-15`,
    gender: GENDERS[offset % GENDERS.length]!,
    aptitudeStatus: applicant.review === 'not_cleared' ? ('rejected' as const) : ('pending' as const),
  }));

  const saved = await tx
    .insert(dUsers)
    .values(rows)
    .onConflictDoUpdate({
      target: dUsers.email,
      set: {
        name: sql`excluded.name`,
        phone: sql`excluded.phone`,
        birthdate: sql`excluded.birthdate`,
        gender: sql`excluded.gender`,
        aptitudeStatus: sql`excluded.aptitude_status`,
      },
    })
    .returning({ id: dUsers.id, email: dUsers.email });
  const idByEmail = new Map(saved.map((user) => [user.email, user.id]));
  return CERTIFICATE_APPLICANTS.map((applicant, offset) => ({
    ...applicant,
    id: idByEmail.get(applicantEmail(offset + 1))!,
  }));
}

// Every applicant answered "yes" to one question, which is what sends them to the certificate step.
function applicantAnswers(): QuestionnaireAnswer[] {
  return QUESTIONNAIRE_V1.map((question, position) =>
    position === 0
      ? { questionId: question.id, answer: true, detail: 'Demo answer' }
      : { questionId: question.id, answer: false },
  );
}

async function seedCertificates(
  tx: Transaction,
  applicants: Awaited<ReturnType<typeof upsertApplicants>>,
  adminId: string,
  now: Date,
) {
  for (const [offset, applicant] of applicants.entries()) {
    const relativePath = [applicant.id, 'certificate', 'demo-certificate.png'].join('/');
    const absolutePath = resolveUploadPath(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, PLACEHOLDER_CERTIFICATE);

    const uploadedAt = new Date(now.getTime() - (offset + 1) * 3 * 60 * MS_PER_MINUTE);
    await tx.insert(fAptitudeQuestionnaires).values({
      userId: applicant.id,
      answers: applicantAnswers(),
      aiResult: applicant.aiResult === 'pending_retry' ? 'pending_retry' : 'not_cleared',
      aiNotes: 'Demo applicant: a certificate is required.',
      submittedAt: uploadedAt,
    });
    await tx.insert(fMedicalCertificates).values({
      userId: applicant.id,
      filePath: relativePath,
      aiResult: applicant.aiResult,
      aiNotes: applicant.aiNotes,
      uploadedAt,
      ...(applicant.review
        ? { reviewedByUserId: adminId, adminReviewedAt: now, adminOverrideResult: applicant.review }
        : {}),
    });
  }
}

async function seedOnboarding(tx: Transaction, members: Awaited<ReturnType<typeof upsertMembers>>, now: Date) {
  await tx.insert(fOnboardingSubmissions).values(
    members.map((member) => ({
      userId: member.id,
      medications: member.index % 4 === 0 ? ['Ibuprofen as needed'] : [],
      physicalConditions:
        member.index % 3 === 0 ? { conditions: ['Mild knee pain'], otherNotes: 'Demo data' } : { conditions: [] },
      goals: GOALS[member.index % GOALS.length]!,
      examAttachmentPaths: [],
      submittedAt: atLocalTime(now, DEMO_HISTORY_DAYS + 1, 10, member.index),
    })),
  );
}

async function seedPlans(
  tx: Transaction,
  members: Awaited<ReturnType<typeof upsertMembers>>,
  trainerId: string,
  now: Date,
) {
  const exercises = await tx.select({ id: dExercises.id }).from(dExercises).orderBy(dExercises.name);
  if (exercises.length < EXERCISES_PER_PLAN * 2) {
    throw new Error('The demo seed needs the exercise catalog: run the base seed (pnpm db:seed) first');
  }
  const stride = Math.floor(exercises.length / EXERCISES_PER_PLAN);
  const random = createRandom(7);

  const plans = members.flatMap((member) =>
    Array.from({ length: DEMO_HISTORY_DAYS + 1 }, (_, daysAgo) => ({ member, daysAgo })),
  );
  const editedKeys = new Set(
    Array.from({ length: TRAINER_EDITED_PLAN_COUNT }, (_, position) => `${members[position * 4]!.id}:${position + 2}`),
  );

  const insertedPlans: { id: string; userId: string; daysAgo: number; edited: boolean }[] = [];
  await insertInChunks(plans, async (chunk) => {
    const rows = await tx
      .insert(fTrainingPlans)
      .values(
        chunk.map(({ member, daysAgo }) => {
          const edited = editedKeys.has(`${member.id}:${daysAgo}`);
          return {
            userId: member.id,
            planDate: localDateString(atLocalTime(now, daysAgo, 12, 0)),
            aiGeneratedAt: atLocalTime(now, daysAgo, 5, 0),
            status: edited ? ('trainer_edited' as const) : ('ai_published' as const),
            lastEditedByUserId: edited ? trainerId : null,
            lastEditedAt: edited ? atLocalTime(now, daysAgo, 9, 30) : null,
          };
        }),
      )
      .returning({ id: fTrainingPlans.id, userId: fTrainingPlans.userId, planDate: fTrainingPlans.planDate });
    const dayByDate = new Map(chunk.map(({ daysAgo }) => [localDateString(atLocalTime(now, daysAgo, 12, 0)), daysAgo]));
    for (const row of rows) {
      insertedPlans.push({
        id: row.id,
        userId: row.userId,
        daysAgo: dayByDate.get(row.planDate)!,
        edited: editedKeys.has(`${row.userId}:${dayByDate.get(row.planDate)}`),
      });
    }
  });

  const memberIndexById = new Map(members.map((member) => [member.id, member.index]));
  const exerciseRows = insertedPlans.flatMap((plan) => {
    const start = (memberIndexById.get(plan.userId)! * 5 + plan.daysAgo * 3) % exercises.length;
    return Array.from({ length: EXERCISES_PER_PLAN }, (_, position) => ({
      trainingPlanId: plan.id,
      exerciseId: exercises[(start + position * stride) % exercises.length]!.id,
      sets: 3 + (position % 2),
      reps: 8 + position * 2,
      load: position === 0 ? 'moderate' : null,
      orderIndex: position,
      // Past days were mostly done; today only the first exercises.
      completed: plan.daysAgo === 0 ? position === 0 : random() < 0.8,
    }));
  });
  await insertInChunks(exerciseRows, (chunk) => tx.insert(fTrainingPlanExercises).values(chunk));

  const reviews = insertedPlans.flatMap((plan, position) => {
    if (plan.edited) {
      return [
        {
          trainingPlanId: plan.id,
          userId: trainerId,
          note: EDIT_NOTES[position % EDIT_NOTES.length]!,
          isEdit: true,
          createdAt: atLocalTime(now, plan.daysAgo, 9, 30),
        },
      ];
    }
    return [];
  });
  const commented = insertedPlans.filter((plan) => !plan.edited && plan.daysAgo === 1).slice(0, COMMENT_NOTES.length);
  for (const [position, plan] of commented.entries()) {
    reviews.push({
      trainingPlanId: plan.id,
      userId: trainerId,
      note: COMMENT_NOTES[position]!,
      isEdit: false,
      createdAt: atLocalTime(now, 1, 10, 0),
    });
  }
  await tx.insert(fPlanReviews).values(reviews);
}

async function seedCheckIns(tx: Transaction, members: Awaited<ReturnType<typeof upsertMembers>>, now: Date) {
  const random = createRandom(21);
  const active = members.filter((member) => member.isActive);
  const windowStart = new Date(now.getTime() - OCCUPANCY_WINDOW_MINUTES * MS_PER_MINUTE);
  const rows: (typeof fCheckIns.$inferInsert)[] = [];

  for (let daysAgo = DEMO_HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
    const dayStart = atLocalTime(now, daysAgo, 0, 0);
    if (dayStart.getDay() === 0) continue;
    const weights = hourWeights(dayStart.getDay() === 6);
    const visitors = shuffled(active, random).slice(0, 10 + Math.floor(random() * 8));
    for (const member of visitors) {
      const checkedInAt = atLocalTime(now, daysAgo, pickHour(weights, random), Math.floor(random() * 60));
      // Today's regular history stays out of the occupancy window, so the recent rows below own that number.
      if (daysAgo === 0 && checkedInAt >= windowStart) continue;
      const failed = random() < 0.06;
      rows.push({
        userId: member.id,
        checkedInAt,
        turnstileStatus: failed ? 'failed' : 'success',
        turnstileResponse: failed ? { error: 'timeout' } : { status: 200 },
      });
    }
  }

  // Distinct members, the last 90 minutes relative to the run, so the gym info page shows a live occupancy.
  const recentVisitors = shuffled(active, random).slice(0, DEMO_RECENT_CHECK_IN_MINUTES.length);
  for (const [position, member] of recentVisitors.entries()) {
    rows.push({
      userId: member.id,
      checkedInAt: new Date(now.getTime() - DEMO_RECENT_CHECK_IN_MINUTES[position]! * MS_PER_MINUTE),
      turnstileStatus: 'success',
      turnstileResponse: { status: 200 },
    });
  }

  await insertInChunks(rows, (chunk) => tx.insert(fCheckIns).values(chunk));
}

// Needs the base seed first (staff accounts, catalog). Rebuilds only the rows of the demo accounts
// (demo<N>@example.com and demo-applicant<N>@example.com), so running it twice leaves the same counts.
export async function seedDemo(database: Database = defaultDb, now: Date = new Date()) {
  await database.transaction(async (tx) => {
    const trainerId = await findAccountId(tx, SEED_TRAINER_EMAIL);
    const adminId = await findAccountId(tx, SEED_ADMIN_EMAIL);

    const existing = await tx
      .select({ id: dUsers.id })
      .from(dUsers)
      .where(sql`${dUsers.email} ~ ${DEMO_EMAIL_PATTERN}`);
    await clearDemoHistory(
      tx,
      existing.map((user) => user.id),
    );

    const members = await upsertMembers(tx);
    const applicants = await upsertApplicants(tx);

    await seedOnboarding(tx, members, now);
    await seedPlans(tx, members, trainerId, now);
    await seedCheckIns(tx, members, now);
    await seedCertificates(tx, applicants, adminId, now);
  });
}
