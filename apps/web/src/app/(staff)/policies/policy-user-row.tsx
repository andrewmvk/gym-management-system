'use client';

import { LOCKOUT_PROTECTED_POLICY_IDS } from '@cadence/shared/auth';
import { ChevronDownIcon } from 'lucide-react';
import { type ComponentProps, type ReactNode, useState } from 'react';
import {
  type GroupOption,
  groupLabel,
  type PolicyDialogState,
  type PolicyOption,
  policyMeta,
} from '@/app/(staff)/policies/policy-dialogs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const EXPIRING_SOON_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface UserGrant {
  policyId: string;
  effect: 'granted' | 'denied';
  expiresOn: string | Date | null;
  isActive: boolean;
}

export interface UserGroup {
  groupId: string;
  expiresOn: string | Date | null;
  isActive: boolean;
}

export interface EffectivePolicy {
  policyId: string;
  sources: string[];
  isDenied: boolean;
}

export interface PolicyUser {
  id: string;
  name: string;
  email: string;
  groups: UserGroup[];
  grants: UserGrant[];
  effective: EffectivePolicy[];
}

type GrantKind = 'denied' | 'ended' | 'expiring' | 'normal';

export function classifyGrant(grant: UserGrant, now: number): GrantKind {
  if (!grant.isActive) return 'ended';
  if (grant.effect === 'denied') return 'denied';
  if (grant.expiresOn && new Date(grant.expiresOn).getTime() - now <= EXPIRING_SOON_DAYS * DAY_MS) return 'expiring';
  return 'normal';
}

export function hasException(user: PolicyUser, now: number) {
  return (
    user.groups.some((group) => !group.isActive) || user.grants.some((grant) => classifyGrant(grant, now) !== 'normal')
  );
}

const BADGES = {
  denied: { variant: 'negative', label: 'Denied' },
  ended: { variant: 'unavailable', label: 'Expired' },
  expiring: { variant: 'pending', label: 'Expiring' },
} as const;

function expiryText(expiresOn: string | Date | null, isActive: boolean) {
  if (!expiresOn) return 'no expiry';
  return (
    <>
      {isActive ? 'expires' : 'expired'}{' '}
      <span className="numerals text-sm font-semibold text-foreground">{formatDateTime(expiresOn)}</span>
    </>
  );
}

function LineButton(props: ComponentProps<typeof Button>) {
  return <Button size="sm" variant="ghost" {...props} className={cn('max-sm:h-11', props.className)} />;
}

function Line({
  badge,
  label,
  meta,
  actions,
}: {
  badge?: { variant: ComponentProps<typeof Badge>['variant']; label: string };
  label: string;
  meta: ReactNode;
  actions: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="flex gap-2 max-sm:*:flex-1">{actions}</div>
    </li>
  );
}

interface RowContext {
  user: PolicyUser;
  groupById: Map<string, GroupOption>;
  policyById: Map<string, PolicyOption>;
  isSelf: boolean;
  onDialog: (state: PolicyDialogState) => void;
}

function GroupLine({ context, group }: { context: RowContext; group: UserGroup }) {
  const { user, groupById, onDialog } = context;
  const label = groupLabel(group.groupId);
  const target = { type: 'group' as const, id: group.groupId, label };
  return (
    <Line
      badge={group.isActive ? { variant: 'secondary', label } : { variant: 'unavailable', label }}
      label={groupById.get(group.groupId)?.description ?? ''}
      meta={expiryText(group.expiresOn, group.isActive)}
      actions={
        <>
          <LineButton
            aria-label={`Extend the ${label} membership of ${user.name}`}
            onClick={() =>
              onDialog({
                kind: 'extend',
                userId: user.id,
                userName: user.name,
                target,
                effect: 'granted',
                expiresOn: group.expiresOn,
              })
            }
          >
            Extend
          </LineButton>
          <LineButton
            disabled={!group.isActive}
            aria-label={`Remove ${user.name} from the ${label} group`}
            onClick={() =>
              onDialog({ kind: 'revoke', userId: user.id, userName: user.name, target, effect: 'granted' })
            }
          >
            Remove
          </LineButton>
        </>
      }
    />
  );
}

function DirectGrantLine({ context, grant, kind }: { context: RowContext; grant: UserGrant; kind: GrantKind }) {
  const { user, policyById, isSelf, onDialog } = context;
  const policy = policyById.get(grant.policyId);
  const label = policy?.description ?? grant.policyId;
  const target = { type: 'policy' as const, id: grant.policyId, label };
  // Only the pre-check the dialogs repeat: the server decides from the real effective ability, since a group may
  // still supply a protected policy this direct row also grants.
  const mayLockOut =
    isSelf &&
    grant.effect === 'granted' &&
    (LOCKOUT_PROTECTED_POLICY_IDS as readonly string[]).includes(grant.policyId);
  const badge = kind === 'normal' ? undefined : BADGES[kind];

  return (
    <Line
      badge={badge}
      label={label}
      meta={
        <>
          {policy ? `${policyMeta(policy)} · direct · ` : 'direct · '}
          {expiryText(grant.expiresOn, grant.isActive)}
          {mayLockOut && ' · revoking is refused if no group still gives you this access'}
        </>
      }
      actions={
        <>
          <LineButton
            aria-label={`Extend ${label} for ${user.name}`}
            onClick={() =>
              onDialog({
                kind: 'extend',
                userId: user.id,
                userName: user.name,
                target,
                effect: grant.effect,
                expiresOn: grant.expiresOn,
              })
            }
          >
            Extend
          </LineButton>
          <LineButton
            disabled={!grant.isActive}
            aria-label={`${grant.effect === 'denied' ? 'Lift denial of' : 'Revoke'} ${label} for ${user.name}`}
            onClick={() =>
              onDialog({ kind: 'revoke', userId: user.id, userName: user.name, target, effect: grant.effect })
            }
          >
            {grant.effect === 'denied' ? 'Lift' : 'Revoke'}
          </LineButton>
        </>
      }
    />
  );
}

// A policy the user holds only because a group gives it: it can't be revoked on its own, only overridden.
function GroupSuppliedLine({ context, effective }: { context: RowContext; effective: EffectivePolicy }) {
  const { user, policyById, onDialog } = context;
  const policy = policyById.get(effective.policyId);
  const label = policy?.description ?? effective.policyId;
  const sources = effective.sources.map((source) => (source === 'direct' ? 'direct' : `via ${groupLabel(source)}`));

  return (
    <Line
      label={label}
      meta={`${policy ? `${policyMeta(policy)} · ` : ''}${sources.join(', ')} · a denial overrides what the group gives`}
      actions={
        <LineButton
          aria-label={`Deny ${label} for ${user.name}`}
          onClick={() =>
            onDialog({
              kind: 'grant',
              userId: user.id,
              userName: user.name,
              isSelf: context.isSelf,
              heldPolicyIds: user.grants.map((grant) => grant.policyId),
              heldGroupIds: user.groups.map((group) => group.groupId),
              preset: { policyId: effective.policyId, effect: 'denied' },
            })
          }
        >
          Deny
        </LineButton>
      }
    />
  );
}

export function PolicyUserRow({ user, groupById, policyById, now, isSelf, onDialog }: RowContext & { now: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const context: RowContext = { user, groupById, policyById, isSelf, onDialog };

  const classified = user.grants.map((grant) => ({ grant, kind: classifyGrant(grant, now) }));
  const exceptions = classified.filter((item) => item.kind !== 'normal');
  const exceptionIds = new Set(exceptions.map((item) => item.grant.policyId));
  const routine = user.effective
    .filter((item) => !item.isDenied && !exceptionIds.has(item.policyId))
    .map((effective) => ({
      effective,
      direct: classified.find((item) => item.grant.policyId === effective.policyId && item.kind === 'normal'),
    }));

  return (
    <li className="flex flex-col gap-3 px-5 py-5 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-xl font-bold tracking-wide uppercase">
            <span className="truncate">{user.name}</span>
            {isSelf && <Badge variant="outline">You</Badge>}
          </p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="max-sm:h-11"
          aria-label={`Add access for ${user.name}`}
          onClick={() =>
            onDialog({
              kind: 'grant',
              userId: user.id,
              userName: user.name,
              isSelf,
              heldPolicyIds: user.grants.map((grant) => grant.policyId),
              heldGroupIds: user.groups.map((group) => group.groupId),
            })
          }
        >
          Add access
        </Button>
      </div>

      {user.groups.length === 0 && user.grants.length === 0 && (
        <p className="text-sm text-muted-foreground">No groups or policies, so this account can't do anything yet.</p>
      )}

      {user.groups.length > 0 && (
        <ul className="flex flex-col gap-3">
          {user.groups.map((group) => (
            <GroupLine key={group.groupId} context={context} group={group} />
          ))}
        </ul>
      )}

      {exceptions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {exceptions.map(({ grant, kind }) => (
            <DirectGrantLine key={grant.policyId} context={context} grant={grant} kind={kind} />
          ))}
        </ul>
      )}

      {routine.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((value) => !value)}
            className="inline-flex w-fit items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/45 max-sm:min-h-11"
          >
            <ChevronDownIcon className={cn('size-4 transition-transform', isExpanded && 'rotate-180')} />
            {isExpanded ? 'Hide' : 'Show'} <span className="numerals text-base font-semibold">{routine.length}</span>{' '}
            active {routine.length === 1 ? 'policy' : 'policies'}
          </button>
          {isExpanded && (
            <ul className="flex flex-col gap-3">
              {routine.map(({ effective, direct }) =>
                direct ? (
                  <DirectGrantLine key={effective.policyId} context={context} grant={direct.grant} kind="normal" />
                ) : (
                  <GroupSuppliedLine key={effective.policyId} context={context} effective={effective} />
                ),
              )}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
