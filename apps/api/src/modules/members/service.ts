import type { ProfileEvent } from '@api/db/schema';
import { localDateString, shiftLocalDate, todayLocal } from '@api/lib/dates';
import { findCheckInTimesForMember } from '@api/modules/checkins/repository';
import * as repository from '@api/modules/members/repository';
import { findSubmissionsByUserId } from '@api/modules/onboarding/repository';
import { findPlanSummariesForMember } from '@api/modules/plans/repository';
import { findRememberedEvents } from '@api/modules/profile/repository';
import { injuryMuscles, PROFILE_EVENT_LABELS } from '@cadence/shared/schemas/profile-events';
import { TRPCError } from '@trpc/server';

export const PLAN_HISTORY_DAYS = 60;
const CHECK_IN_DATES = 30;
// A member can scan more than once a day, so more instants are read than distinct days are returned.
const CHECK_IN_INSTANTS_READ = 200;

function ageOn(birthdate: string | null, now: Date) {
  if (!birthdate) return null;
  const [year, month, day] = birthdate.split('-').map(Number);
  const hadBirthday = now.getMonth() + 1 > month! || (now.getMonth() + 1 === month! && now.getDate() >= day!);
  return now.getFullYear() - year! - (hadBirthday ? 0 : 1);
}

function factDescription(event: Pick<ProfileEvent, 'eventType' | 'payload'>) {
  const { payload } = event;
  const description =
    typeof payload === 'object' && payload !== null && 'description' in payload ? payload.description : null;
  return typeof description === 'string' && description !== '' ? description : PROFILE_EVENT_LABELS[event.eventType];
}

function toFact(event: Awaited<ReturnType<typeof findRememberedEvents>>[number]) {
  return {
    id: event.id,
    eventType: event.eventType,
    description: factDescription(event),
    muscles: event.eventType === 'injury' ? injuryMuscles(event.payload) : [],
    sourceMessage: event.sourceMessage,
    createdAt: event.createdAt,
    resolvedAt: event.resolvedAt,
  };
}

async function loadOnboarding(userId: string) {
  const [latest] = await findSubmissionsByUserId(userId);
  if (!latest) return null;
  return {
    submittedAt: latest.submittedAt,
    heightCm: latest.heightCm,
    weightKg: latest.weightKg,
    goals: latest.goals,
    medications: latest.medications,
    conditions: latest.physicalConditions.conditions,
    otherNotes: latest.physicalConditions.otherNotes ?? null,
    exams: latest.exams.map((exam) => ({
      name: exam.name,
      date: exam.date ?? null,
      findings: exam.findings,
      hasAttachment: Boolean(exam.attachmentPath),
    })),
  };
}

// What a trainer needs beside a plan to judge it: who the member is, what they said at onboarding and which
// remembered facts still apply. Injuries and medication changes are never dropped: every unresolved fact is kept.
export async function getMemberContext(userId: string, now: Date = new Date()) {
  const [member, onboarding, events] = await Promise.all([
    repository.findMemberById(userId),
    loadOnboarding(userId),
    findRememberedEvents(userId),
  ]);
  if (!member) return null;
  return {
    name: member.name,
    age: ageOn(member.birthdate, now),
    onboarding,
    facts: events.filter((event) => event.confirmedAt !== null && event.resolvedAt === null).map(toFact),
  };
}

// The staff member page. Only members (accounts with a membership status) are visible here, like the members table.
export async function getMember(userId: string, now: Date = new Date()) {
  const member = await repository.findMemberById(userId);
  if (!member?.membershipStatus) throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });

  const today = todayLocal(now);
  const [onboarding, events, plans, checkInTimes] = await Promise.all([
    loadOnboarding(userId),
    findRememberedEvents(userId),
    findPlanSummariesForMember(userId, shiftLocalDate(today, -PLAN_HISTORY_DAYS)),
    findCheckInTimesForMember(userId, CHECK_IN_INSTANTS_READ),
  ]);

  const checkInDates = [...new Set(checkInTimes.map((time) => localDateString(time)))].slice(0, CHECK_IN_DATES);
  return {
    profile: {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      birthdate: member.birthdate,
      age: ageOn(member.birthdate, now),
      gender: member.gender,
      memberSince: member.createdAt,
    },
    membership: { status: member.membershipStatus, plan: member.membershipPlan },
    onboarding,
    facts: events.filter((event) => event.confirmedAt !== null).map(toFact),
    plans,
    checkInDates,
  };
}

// Idempotent: the caller states the target, so a repeated or stale click leaves the same state.
export async function setMembershipStatus(userId: string, status: 'active' | 'inactive') {
  const member = await repository.findMemberById(userId);
  if (!member) throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' });
  if (!member.membershipStatus) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'This account has no membership to change' });
  }
  return repository.updateMembershipStatus(userId, status);
}
