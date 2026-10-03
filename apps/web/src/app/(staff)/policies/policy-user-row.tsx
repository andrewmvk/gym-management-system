'use client';

import { LOCKOUT_PROTECTED_POLICY_IDS } from '@cadence/shared/auth';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { type PolicyDialogState, type PolicyOption, policyMeta } from '@/app/(staff)/policies/policy-dialogs';
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

export interface PolicyUser {
  id: string;
  name: string;
  email: string;
  grants: UserGrant[];
}

type GrantKind = 'denied' | 'ended' | 'expiring' | 'normal';

export function classifyGrant(grant: UserGrant, now: number): GrantKind {
  if (!grant.isActive) return 'ended';
  if (grant.effect === 'denied') return 'denied';
  if (grant.expiresOn && new Date(grant.expiresOn).getTime() - now <= EXPIRING_SOON_DAYS * DAY_MS) return 'expiring';
  return 'normal';
}

export function hasException(user: PolicyUser, now: number) {
  return user.grants.some((grant) => classifyGrant(grant, now) !== 'normal');
}

const BADGES = {
  denied: { variant: 'negative', label: 'Denied' },
  ended: { variant: 'unavailable', label: 'Expired' },
  expiring: { variant: 'pending', label: 'Expiring' },
} as const;

function GrantLine({
  user,
  grant,
  kind,
  policy,
  isSelf,
  onDialog,
}: {
  user: PolicyUser;
  grant: UserGrant;
  kind: GrantKind;
  policy: PolicyOption | undefined;
  isSelf: boolean;
  onDialog: (state: PolicyDialogState) => void;
}) {
  const badge = kind === 'normal' ? null : BADGES[kind];
  const label = policy?.description ?? grant.policyId;
  // A denial of your own protected policy can't exist (the API refuses it), and lifting a denial never locks you out.
  const isLockoutProtected =
    isSelf &&
    grant.effect === 'granted' &&
    (LOCKOUT_PROTECTED_POLICY_IDS as readonly string[]).includes(grant.policyId);
  return (
    <li className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {policy ? `${policyMeta(policy)} · ` : ''}
          {grant.expiresOn ? (
            <>
              {grant.isActive ? 'expires' : 'expired'}{' '}
              <span className="numerals text-sm font-semibold text-foreground">{formatDateTime(grant.expiresOn)}</span>
            </>
          ) : (
            'indefinite'
          )}
        </p>
      </div>
      <div className="flex gap-2 max-sm:*:flex-1">
        <Button
          size="sm"
          variant="ghost"
          className="max-sm:h-11"
          aria-label={`Extend ${label} for ${user.name}`}
          onClick={() =>
            onDialog({
              kind: 'extend',
              userId: user.id,
              userName: user.name,
              policyId: grant.policyId,
              policyLabel: label,
              effect: grant.effect,
              expiresOn: grant.expiresOn,
            })
          }
        >
          Extend
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="max-sm:h-11"
          disabled={!grant.isActive || isLockoutProtected}
          title={isLockoutProtected ? "You can't remove your own access here" : undefined}
          aria-label={`${grant.effect === 'denied' ? 'Lift denial of' : 'Revoke'} ${label} for ${user.name}`}
          onClick={() =>
            onDialog({
              kind: 'revoke',
              userId: user.id,
              userName: user.name,
              policyId: grant.policyId,
              policyLabel: label,
              effect: grant.effect,
            })
          }
        >
          {grant.effect === 'denied' ? 'Lift' : 'Revoke'}
        </Button>
      </div>
    </li>
  );
}

export function PolicyUserRow({
  user,
  policyById,
  now,
  isSelf,
  onDialog,
}: {
  user: PolicyUser;
  policyById: Map<string, PolicyOption>;
  now: number;
  isSelf: boolean;
  onDialog: (state: PolicyDialogState) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const classified = user.grants.map((grant) => ({ grant, kind: classifyGrant(grant, now) }));
  const exceptions = classified.filter((item) => item.kind !== 'normal');
  const routine = classified.filter((item) => item.kind === 'normal');

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
          aria-label={`Grant a policy to ${user.name}`}
          onClick={() =>
            onDialog({
              kind: 'grant',
              userId: user.id,
              userName: user.name,
              isSelf,
              heldPolicyIds: user.grants.map((grant) => grant.policyId),
            })
          }
        >
          Grant
        </Button>
      </div>

      {user.grants.length === 0 && (
        <p className="text-sm text-muted-foreground">No policies, so this account can't do anything yet.</p>
      )}

      {exceptions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {exceptions.map(({ grant, kind }) => (
            <GrantLine
              key={grant.policyId}
              user={user}
              grant={grant}
              kind={kind}
              policy={policyById.get(grant.policyId)}
              isSelf={isSelf}
              onDialog={onDialog}
            />
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
              {routine.map(({ grant, kind }) => (
                <GrantLine
                  key={grant.policyId}
                  user={user}
                  grant={grant}
                  kind={kind}
                  policy={policyById.get(grant.policyId)}
                  isSelf={isSelf}
                  onDialog={onDialog}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
