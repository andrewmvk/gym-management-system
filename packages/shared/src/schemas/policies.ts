import { POLICY_EFFECTS } from '@shared/auth/types';
import { z } from 'zod';

const ExpiresOnSchema = z.iso.datetime({ offset: true });

export const GrantPolicyInputSchema = z.object({
  userId: z.uuid(),
  policyId: z.string().trim().min(1),
  effect: z.enum(POLICY_EFFECTS).default('granted'),
  expiresOn: ExpiresOnSchema.nullish(),
});
export type GrantPolicyInput = z.input<typeof GrantPolicyInputSchema>;

export const RevokePolicyInputSchema = z.object({
  userId: z.uuid(),
  policyId: z.string().trim().min(1),
});
export type RevokePolicyInput = z.input<typeof RevokePolicyInputSchema>;

export const AssignGroupInputSchema = z.object({
  userId: z.uuid(),
  groupId: z.string().trim().min(1),
  expiresOn: ExpiresOnSchema.nullish(),
});
export type AssignGroupInput = z.input<typeof AssignGroupInputSchema>;

export const RevokeGroupInputSchema = z.object({
  userId: z.uuid(),
  groupId: z.string().trim().min(1),
});
export type RevokeGroupInput = z.input<typeof RevokeGroupInputSchema>;

export const ExtendGroupInputSchema = z.object({
  userId: z.uuid(),
  groupId: z.string().trim().min(1),
  expiresOn: ExpiresOnSchema.nullable(),
});
export type ExtendGroupInput = z.input<typeof ExtendGroupInputSchema>;

export const ExtendPolicyInputSchema = z.object({
  userId: z.uuid(),
  policyId: z.string().trim().min(1),
  expiresOn: ExpiresOnSchema.nullable(),
});
export type ExtendPolicyInput = z.input<typeof ExtendPolicyInputSchema>;
