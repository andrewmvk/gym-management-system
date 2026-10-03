'use client';

import { LOCKOUT_PROTECTED_POLICY_IDS, type POLICY_EFFECTS } from '@cadence/shared/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { DatePicker } from '@/components/date-picker';
import { SearchInput } from '@/components/search-input';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fromIsoDate, toIsoDate } from '@/lib/calendar-date';
import { formatDateTime } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

type PolicyEffect = (typeof POLICY_EFFECTS)[number];

export interface PolicyOption {
  id: string;
  description: string;
  operation: string;
  resource: string;
  scope: string;
}

export function policyMeta(policy: Pick<PolicyOption, 'operation' | 'resource' | 'scope'>) {
  return `${policy.operation} ${policy.resource}, ${policy.scope}`;
}

export type PolicyDialogState =
  | { kind: 'grant'; userId: string; userName: string; isSelf: boolean; heldPolicyIds: string[] }
  | { kind: 'revoke'; userId: string; userName: string; policyId: string; policyLabel: string; effect: PolicyEffect }
  | {
      kind: 'extend';
      userId: string;
      userName: string;
      policyId: string;
      policyLabel: string;
      effect: PolicyEffect;
      expiresOn: string | Date | null;
    };

interface PolicyDialogsProps {
  state: PolicyDialogState | null;
  policies: PolicyOption[];
  onClose: () => void;
}

// An expiry date means "through the end of that day", in the admin's own time zone.
function endOfDayIso(isoDate: string) {
  const day = fromIsoDate(isoDate);
  if (!day) return null;
  day.setHours(23, 59, 59, 0);
  return day.toISOString();
}

function errorMessage(error: { data?: { code?: string } | null; message: string }) {
  return error.data?.code === 'BAD_REQUEST' || error.data?.code === 'NOT_FOUND'
    ? error.message
    : "We couldn't save that change. Try again.";
}

function ExpiryField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Field>
      <FieldLabel htmlFor="policy-expiry">Expires on (optional)</FieldLabel>
      <DatePicker
        id="policy-expiry"
        value={value}
        onChange={onChange}
        min={toIsoDate(new Date())}
        placeholder="No expiry"
        isClearable
      />
      <FieldDescription>Leave empty for an indefinite grant. It ends at the close of that day.</FieldDescription>
    </Field>
  );
}

function PolicyPicker({
  policies,
  heldPolicyIds,
  value,
  onChange,
}: {
  policies: PolicyOption[];
  heldPolicyIds: string[];
  value: string;
  onChange: (policyId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const matches = policies.filter(
    (policy) => !term || `${policy.description} ${policyMeta(policy)} ${policy.id}`.toLowerCase().includes(term),
  );

  return (
    <div className="flex flex-col gap-2">
      <SearchInput value={query} onChange={setQuery} placeholder="Search policies" />
      <ul aria-label="Policies" className="max-h-56 divide-y overflow-y-auto rounded-md border">
        {matches.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">No policy matches.</li>}
        {matches.map((policy) => (
          <li key={policy.id}>
            <button
              type="button"
              aria-pressed={policy.id === value}
              onClick={() => onChange(policy.id)}
              className={cn(
                'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/45 focus-visible:ring-inset',
                policy.id === value ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted',
              )}
            >
              <span className="text-sm font-medium">{policy.description}</span>
              <span className="text-xs text-muted-foreground">
                {policyMeta(policy)}
                {heldPolicyIds.includes(policy.id) && ' · already held, saving replaces it'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GrantDialogBody({
  state,
  policies,
  onClose,
}: {
  state: Extract<PolicyDialogState, { kind: 'grant' }>;
  policies: PolicyOption[];
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [policyId, setPolicyId] = useState('');
  const [effect, setEffect] = useState<PolicyEffect>('granted');
  const [expiry, setExpiry] = useState('');
  const isSelfLockout =
    state.isSelf && effect === 'denied' && (LOCKOUT_PROTECTED_POLICY_IDS as readonly string[]).includes(policyId);

  const grant = useMutation(
    trpc.policies.grant.mutationOptions({
      onSuccess: async (_data, variables) => {
        await queryClient.invalidateQueries({ queryKey: trpc.policies.list.queryKey() });
        const label = policies.find((policy) => policy.id === variables.policyId)?.description ?? variables.policyId;
        toast.success(
          variables.effect === 'denied'
            ? `Denied "${label}" for ${state.userName}.`
            : `Granted "${label}" to ${state.userName}.`,
        );
        onClose();
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  );

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Grant a policy</AlertDialogTitle>
        <AlertDialogDescription>
          Changes what {state.userName} can do. Granting a policy they already hold replaces its effect and expiry.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel>Policy</FieldLabel>
          <PolicyPicker
            policies={policies}
            heldPolicyIds={state.heldPolicyIds}
            value={policyId}
            onChange={setPolicyId}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="policy-effect">Effect</FieldLabel>
          <Select value={effect} onValueChange={(value) => setEffect(value as typeof effect)}>
            <SelectTrigger id="policy-effect" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="granted">Granted</SelectItem>
              <SelectItem value="denied">Denied</SelectItem>
            </SelectContent>
          </Select>
          <FieldDescription>
            {effect === 'denied'
              ? 'A denial wins over every grant of the same permission, whatever other policies they hold.'
              : 'The user can do what this policy covers, unless a denial says otherwise.'}
          </FieldDescription>
          {isSelfLockout && (
            <FieldError>You can't deny your own access to the staff area or to policy management.</FieldError>
          )}
        </Field>

        <ExpiryField value={expiry} onChange={setExpiry} />
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel disabled={grant.isPending}>Cancel</AlertDialogCancel>
        <Button
          disabled={!policyId || isSelfLockout || grant.isPending}
          onClick={() =>
            grant.mutate({
              userId: state.userId,
              policyId,
              effect,
              expiresOn: expiry ? endOfDayIso(expiry) : null,
            })
          }
        >
          {grant.isPending ? 'Saving...' : 'Save policy'}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

function RevokeDialogBody({
  state,
  onClose,
}: {
  state: Extract<PolicyDialogState, { kind: 'revoke' }>;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const revoke = useMutation(
    trpc.policies.revoke.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.policies.list.queryKey() });
        toast.success(
          state.effect === 'denied'
            ? `Lifted the denial of "${state.policyLabel}" for ${state.userName}.`
            : `Revoked "${state.policyLabel}" for ${state.userName}.`,
        );
        onClose();
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  );

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{state.effect === 'denied' ? 'Lift this denial?' : 'Revoke this policy?'}</AlertDialogTitle>
        <AlertDialogDescription>
          {state.effect === 'denied'
            ? `The denial of "${state.policyLabel}" for ${state.userName} ends right away. Anything else they hold for it applies again.`
            : `${state.userName} loses "${state.policyLabel}" right away. It stays on their record and can be extended later.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={revoke.isPending}>Cancel</AlertDialogCancel>
        <Button
          variant={state.effect === 'denied' ? 'default' : 'destructive'}
          disabled={revoke.isPending}
          onClick={() => revoke.mutate({ userId: state.userId, policyId: state.policyId })}
        >
          {revoke.isPending ? 'Saving...' : state.effect === 'denied' ? 'Lift denial' : 'Revoke'}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

function ExtendDialogBody({
  state,
  onClose,
}: {
  state: Extract<PolicyDialogState, { kind: 'extend' }>;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const current = state.expiresOn ? new Date(state.expiresOn) : null;
  const isCurrentlyEnded = current !== null && current.getTime() <= Date.now();
  const [mode, setMode] = useState<'date' | 'indefinite'>(state.expiresOn === null ? 'indefinite' : 'date');
  const [expiry, setExpiry] = useState(current && !isCurrentlyEnded ? toIsoDate(current) : '');
  const nextExpiry = mode === 'indefinite' ? null : expiry ? endOfDayIso(expiry) : undefined;

  const extend = useMutation(
    trpc.policies.extend.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.policies.list.queryKey() });
        toast.success(`Updated the expiry of "${state.policyLabel}" for ${state.userName}.`);
        onClose();
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  );

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {state.effect === 'denied' ? 'Change the denial period' : 'Extend this policy'}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {state.effect === 'denied'
            ? `"${state.policyLabel}" is denied for ${state.userName}.`
            : `"${state.policyLabel}" for ${state.userName}.`}{' '}
          {isCurrentlyEnded
            ? `It expired ${formatDateTime(state.expiresOn as string | Date)}. Saving a new period makes it active again.`
            : current
              ? `It expires ${formatDateTime(current)}.`
              : 'It currently has no expiry.'}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <RadioGroup value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
        <div className="flex items-center gap-2 max-sm:min-h-11">
          <RadioGroupItem id="extend-date" value="date" />
          <label htmlFor="extend-date" className="flex-1 text-sm max-sm:py-2.5">
            Until a date
          </label>
        </div>
        <div className="flex items-center gap-2 max-sm:min-h-11">
          <RadioGroupItem id="extend-indefinite" value="indefinite" />
          <label htmlFor="extend-indefinite" className="flex-1 text-sm max-sm:py-2.5">
            No expiry
          </label>
        </div>
      </RadioGroup>

      {mode === 'date' && (
        <Field>
          <FieldLabel htmlFor="policy-expiry">New expiry date</FieldLabel>
          <DatePicker id="policy-expiry" value={expiry} onChange={setExpiry} min={toIsoDate(new Date())} />
          <FieldDescription>It ends at the close of that day.</FieldDescription>
        </Field>
      )}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={extend.isPending}>Cancel</AlertDialogCancel>
        <Button
          disabled={nextExpiry === undefined || extend.isPending}
          onClick={() =>
            nextExpiry !== undefined &&
            extend.mutate({ userId: state.userId, policyId: state.policyId, expiresOn: nextExpiry })
          }
        >
          {extend.isPending ? 'Saving...' : 'Save expiry'}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

export function PolicyDialogs({ state, policies, onClose }: PolicyDialogsProps) {
  return (
    <AlertDialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {state?.kind === 'grant' && (
          <GrantDialogBody key={`${state.kind}:${state.userId}`} state={state} policies={policies} onClose={onClose} />
        )}
        {state?.kind === 'revoke' && (
          <RevokeDialogBody key={`${state.kind}:${state.userId}:${state.policyId}`} state={state} onClose={onClose} />
        )}
        {state?.kind === 'extend' && (
          <ExtendDialogBody key={`${state.kind}:${state.userId}:${state.policyId}`} state={state} onClose={onClose} />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
