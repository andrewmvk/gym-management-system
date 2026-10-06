export const ACTIONS = ['create', 'read', 'update', 'delete', 'manage'] as const;
export type Action = (typeof ACTIONS)[number];

export const SUBJECTS = [
  'TrainingPlan',
  'PlanReview',
  'Catalog',
  'Onboarding',
  'ProfileEvent',
  'CheckIn',
  'TurnstileConfig',
  'GymInfo',
  'GymSettings',
  'Metrics',
  'Member',
  'UserPolicyAssignment',
  'MemberApp',
  'StaffApp',
] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SCOPES = ['self', 'all'] as const;
export type Scope = (typeof SCOPES)[number];

export const POLICY_EFFECTS = ['granted', 'denied'] as const;
export type PolicyEffect = (typeof POLICY_EFFECTS)[number];
