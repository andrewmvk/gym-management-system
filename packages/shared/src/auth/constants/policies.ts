import type { Action, Scope, Subject } from '@shared/auth/types';

export const READ_MEMBER_APP = 'read_member_app';
export const MANAGE_OWN_ONBOARDING = 'manage_own_onboarding';
export const READ_OWN_PLANS = 'read_own_plans';
export const UPDATE_OWN_PLANS = 'update_own_plans';
export const USE_CHAT = 'use_chat';
export const READ_OWN_METRICS = 'read_own_metrics';
export const READ_CATALOG = 'read_catalog';
export const READ_GYM_INFO = 'read_gym_info';
export const READ_STAFF_APP = 'read_staff_app';
export const READ_ALL_PLANS = 'read_all_plans';
export const UPDATE_ALL_PLANS = 'update_all_plans';
export const MANAGE_PLAN_REVIEWS = 'manage_plan_reviews';
export const MANAGE_CATALOG = 'manage_catalog';
export const REVIEW_CERTIFICATES = 'review_certificates';
export const MANAGE_TURNSTILE_CONFIG = 'manage_turnstile_config';
export const MANAGE_POLICY_ASSIGNMENTS = 'manage_policy_assignments';
export const READ_MEMBERS = 'read_members';
export const READ_CHECKINS = 'read_checkins';

export type PolicyId =
  | typeof READ_MEMBER_APP
  | typeof MANAGE_OWN_ONBOARDING
  | typeof READ_OWN_PLANS
  | typeof UPDATE_OWN_PLANS
  | typeof USE_CHAT
  | typeof READ_OWN_METRICS
  | typeof READ_CATALOG
  | typeof READ_GYM_INFO
  | typeof READ_STAFF_APP
  | typeof READ_ALL_PLANS
  | typeof UPDATE_ALL_PLANS
  | typeof MANAGE_PLAN_REVIEWS
  | typeof MANAGE_CATALOG
  | typeof REVIEW_CERTIFICATES
  | typeof MANAGE_TURNSTILE_CONFIG
  | typeof MANAGE_POLICY_ASSIGNMENTS
  | typeof READ_MEMBERS
  | typeof READ_CHECKINS;

export interface PolicyDefinition {
  id: PolicyId;
  description: string;
  operation: Action;
  resource: Subject;
  scope: Scope;
}

export const POLICY_CATALOG: readonly PolicyDefinition[] = [
  { id: READ_MEMBER_APP, description: 'Open the member app', operation: 'read', resource: 'MemberApp', scope: 'all' },
  { id: MANAGE_OWN_ONBOARDING, description: 'Fill in and extend their own onboarding', operation: 'manage', resource: 'Onboarding', scope: 'self' },
  { id: READ_OWN_PLANS, description: 'View their own training plans', operation: 'read', resource: 'TrainingPlan', scope: 'self' },
  { id: UPDATE_OWN_PLANS, description: 'Mark exercises and adjust their own plans', operation: 'update', resource: 'TrainingPlan', scope: 'self' },
  { id: USE_CHAT, description: 'Use the AI chat, which records facts about themselves', operation: 'create', resource: 'ProfileEvent', scope: 'self' },
  { id: READ_OWN_METRICS, description: 'View their own training metrics', operation: 'read', resource: 'Metrics', scope: 'self' },
  { id: READ_CATALOG, description: 'Browse the exercise and equipment catalog', operation: 'read', resource: 'Catalog', scope: 'all' },
  { id: READ_GYM_INFO, description: 'View gym information and occupancy', operation: 'read', resource: 'GymInfo', scope: 'all' },
  { id: READ_STAFF_APP, description: 'Open the staff app', operation: 'read', resource: 'StaffApp', scope: 'all' },
  { id: READ_ALL_PLANS, description: "View every member's training plans", operation: 'read', resource: 'TrainingPlan', scope: 'all' },
  { id: UPDATE_ALL_PLANS, description: "Edit any member's training plan", operation: 'update', resource: 'TrainingPlan', scope: 'all' },
  { id: MANAGE_PLAN_REVIEWS, description: 'Write review notes on any plan', operation: 'manage', resource: 'PlanReview', scope: 'all' },
  { id: MANAGE_CATALOG, description: 'Add exercises and toggle equipment availability', operation: 'manage', resource: 'Catalog', scope: 'all' },
  { id: REVIEW_CERTIFICATES, description: 'Review medical certificates in the admin queue', operation: 'manage', resource: 'MedicalCertificate', scope: 'all' },
  { id: MANAGE_TURNSTILE_CONFIG, description: 'Configure the external turnstile API', operation: 'manage', resource: 'TurnstileConfig', scope: 'all' },
  { id: MANAGE_POLICY_ASSIGNMENTS, description: 'Grant, revoke and extend user policies', operation: 'manage', resource: 'UserPolicyAssignment', scope: 'all' },
  { id: READ_MEMBERS, description: 'View the member list', operation: 'read', resource: 'Member', scope: 'all' },
  { id: READ_CHECKINS, description: 'View every check-in', operation: 'read', resource: 'CheckIn', scope: 'all' },
];

export const MEMBER_POLICY_IDS = [
  READ_MEMBER_APP,
  MANAGE_OWN_ONBOARDING,
  READ_OWN_PLANS,
  UPDATE_OWN_PLANS,
  USE_CHAT,
  READ_OWN_METRICS,
  READ_CATALOG,
  READ_GYM_INFO,
] as const satisfies readonly PolicyId[];

export const TRAINER_POLICY_IDS = [
  READ_STAFF_APP,
  READ_ALL_PLANS,
  UPDATE_ALL_PLANS,
  MANAGE_PLAN_REVIEWS,
  READ_CATALOG,
  READ_GYM_INFO,
] as const satisfies readonly PolicyId[];

export const ADMIN_POLICY_IDS = [
  READ_STAFF_APP,
  MANAGE_CATALOG,
  REVIEW_CERTIFICATES,
  MANAGE_TURNSTILE_CONFIG,
  MANAGE_POLICY_ASSIGNMENTS,
  READ_MEMBERS,
  READ_ALL_PLANS,
  READ_CHECKINS,
  READ_CATALOG,
  READ_GYM_INFO,
] as const satisfies readonly PolicyId[];
