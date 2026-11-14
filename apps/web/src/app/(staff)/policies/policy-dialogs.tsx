'use client';

import {
  type Action,
  LOCKOUT_PROTECTED_POLICY_IDS,
  type POLICY_EFFECTS,
  type Scope,
  type Subject,
} from '@cadence/shared/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { DatePicker } from '@/components/date-picker';
import { SearchInput } from '@/components/search-input';
import { SegmentedFilter } from '@/components/segmented-filter';
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
import { type I18n, useI18n } from '@/lib/i18n/i18n-provider';
import type { LabelKey } from '@/lib/i18n/translate';
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

export interface GroupOption {
  id: string;
  description: string;
  policyIds: string[];
}

// Typed over every subject and action, so adding one to the shared auth types is a compile error here until it has a
// readable name, instead of a raw identifier like "GymSettings" reaching the screen.
const SUBJECT_LABELS: Record<Subject, LabelKey> = {
  TrainingPlan: 'subject::training plans',
  PlanReview: 'subject::plan reviews',
  Catalog: 'subject::the catalog',
  Onboarding: 'subject::onboarding',
  ProfileEvent: 'subject::remembered facts',
  CheckIn: 'subject::check-ins',
  TurnstileConfig: 'subject::turnstile settings',
  GymInfo: 'subject::gym information',
  GymSettings: 'subject::gym settings',
  Metrics: 'subject::metrics',
  Member: 'subject::members',
  UserPolicyAssignment: 'subject::policy assignments',
  MemberApp: 'subject::the member app',
  StaffApp: 'subject::the staff app',
};

const ACTION_LABELS: Record<Action, LabelKey> = {
  create: 'action::Create',
  read: 'action::Read',
  update: 'action::Update',
  delete: 'action::Delete',
  manage: 'action::Manage',
};

const SCOPE_LABELS: Record<Scope, LabelKey> = {
  self: 'scope::their own only',
  all: 'scope::everyone',
};

// The policy's permission in words. An identifier the maps do not know falls back to itself, so a policy is never hidden.
export function policyMeta(t: I18n['t'], policy: Pick<PolicyOption, 'operation' | 'resource' | 'scope'>) {
  const action = policy.operation in ACTION_LABELS ? t(ACTION_LABELS[policy.operation as Action]) : policy.operation;
  const subject = policy.resource in SUBJECT_LABELS ? t(SUBJECT_LABELS[policy.resource as Subject]) : policy.resource;
  const scope = policy.scope in SCOPE_LABELS ? t(SCOPE_LABELS[policy.scope as Scope]) : policy.scope;
  return `${action} ${subject}, ${scope}`;
}

export function policyGroupLabel(tx: I18n['tx'], groupId: string) {
  return tx(groupId.charAt(0).toUpperCase() + groupId.slice(1));
}

export interface DialogTarget {
  type: 'policy' | 'group';
  id: string;
  label: string;
}

export type PolicyDialogState =
  | {
      kind: 'grant';
      userId: string;
      userName: string;
      isSelf: boolean;
      heldPolicyIds: string[];
      heldGroupIds: string[];
      preset?: { policyId: string; effect: PolicyEffect };
    }
  | { kind: 'revoke'; userId: string; userName: string; target: DialogTarget; effect: PolicyEffect }
  | {
      kind: 'extend';
      userId: string;
      userName: string;
      target: DialogTarget;
      effect: PolicyEffect;
      expiresOn: string | Date | null;
    };

interface PolicyDialogsProps {
  state: PolicyDialogState | null;
  policies: PolicyOption[];
  groups: GroupOption[];
  onClose: () => void;
}

interface ServerError {
  data?: { code?: string } | null;
  message: string;
}

// An expiry date means "through the end of that day", in the admin's own time zone.
function endOfDayIso(isoDate: string) {
  const day = fromIsoDate(isoDate);
  if (!day) return null;
  day.setHours(23, 59, 59, 0);
  return day.toISOString();
}

function errorMessage({ t, tx }: Pick<I18n, 't' | 'tx'>, error: ServerError) {
  return error.data?.code === 'BAD_REQUEST' || error.data?.code === 'NOT_FOUND'
    ? tx(error.message)
    : t("We couldn't save that change. Try again.");
}

function useRefreshList() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: trpc.policies.list.queryKey() });
}

function ExpiryField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  return (
    <Field>
      <FieldLabel htmlFor="policy-expiry">{t('Expires on (optional)')}</FieldLabel>
      <DatePicker
        id="policy-expiry"
        value={value}
        onChange={onChange}
        min={toIsoDate(new Date())}
        placeholder={t('No expiry')}
        isClearable
      />
      <FieldDescription>{t('Leave empty for no expiry. It ends at the close of that day.')}</FieldDescription>
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
  const { t, tx } = useI18n();
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const matches = policies.filter(
    (policy) => !term || `${tx(policy.description)} ${policyMeta(t, policy)} ${policy.id}`.toLowerCase().includes(term),
  );

  return (
    <div className="flex flex-col gap-2">
      <SearchInput value={query} onChange={setQuery} placeholder={t('Search policies')} />
      <ul aria-label={t('Policies')} className="max-h-56 divide-y overflow-y-auto rounded-md border">
        {matches.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">{t('No policy matches.')}</li>}
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
              <span className="text-sm font-medium">{tx(policy.description)}</span>
              <span className="text-xs text-muted-foreground">
                {policyMeta(t, policy)}
                {heldPolicyIds.includes(policy.id) && ` · ${t('already held, saving replaces it')}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GroupPicker({
  groups,
  heldGroupIds,
  value,
  onChange,
}: {
  groups: GroupOption[];
  heldGroupIds: string[];
  value: string;
  onChange: (groupId: string) => void;
}) {
  const { t, tn, tx } = useI18n();
  return (
    <ul aria-label={t('Groups')} className="divide-y overflow-hidden rounded-md border">
      {groups.map((group) => (
        <li key={group.id}>
          <button
            type="button"
            aria-pressed={group.id === value}
            onClick={() => onChange(group.id)}
            className={cn(
              'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/45 focus-visible:ring-inset max-sm:min-h-11',
              group.id === value ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted',
            )}
          >
            <span className="text-sm font-medium">{policyGroupLabel(tx, group.id)}</span>
            <span className="text-xs text-muted-foreground">
              {tx(group.description)}{' '}
              {tn('{count} policies', {
                count: <span className="numerals text-sm font-semibold">{group.policyIds.length}</span>,
              })}
              {heldGroupIds.includes(group.id) && ` · ${t('already a member, saving replaces the expiry')}`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function GrantDialogBody({
  state,
  policies,
  groups,
  onClose,
}: {
  state: Extract<PolicyDialogState, { kind: 'grant' }>;
  policies: PolicyOption[];
  groups: GroupOption[];
  onClose: () => void;
}) {
  const i18n = useI18n();
  const { t, tx } = i18n;
  const trpc = useTRPC();
  const refreshList = useRefreshList();
  const [type, setType] = useState<'group' | 'policy'>(state.preset ? 'policy' : 'group');
  const [groupId, setGroupId] = useState('');
  const [policyId, setPolicyId] = useState(state.preset?.policyId ?? '');
  const [effect, setEffect] = useState<PolicyEffect>(state.preset?.effect ?? 'granted');
  const [expiry, setExpiry] = useState('');
  const isSelfLockout =
    type === 'policy' &&
    state.isSelf &&
    effect === 'denied' &&
    (LOCKOUT_PROTECTED_POLICY_IDS as readonly string[]).includes(policyId);
  const expiresOn = expiry ? endOfDayIso(expiry) : null;

  const assignGroup = useMutation(
    trpc.policies.assignGroup.mutationOptions({
      onSuccess: async (_data, variables) => {
        await refreshList();
        toast.success(
          t('Added {name} to the {group} group.', {
            name: state.userName,
            group: policyGroupLabel(tx, variables.groupId),
          }),
        );
        onClose();
      },
      onError: (error) => toast.error(errorMessage(i18n, error)),
    }),
  );

  const grant = useMutation(
    trpc.policies.grant.mutationOptions({
      onSuccess: async (_data, variables) => {
        await refreshList();
        const label = tx(
          policies.find((policy) => policy.id === variables.policyId)?.description ?? variables.policyId,
        );
        toast.success(
          variables.effect === 'denied'
            ? t('Denied "{label}" for {name}.', { label, name: state.userName })
            : t('Granted "{label}" to {name}.', { label, name: state.userName }),
        );
        onClose();
      },
      onError: (error) => toast.error(errorMessage(i18n, error)),
    }),
  );

  const isPending = assignGroup.isPending || grant.isPending;
  const isReady = type === 'group' ? Boolean(groupId) : Boolean(policyId) && !isSelfLockout;

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{t('Add access')}</AlertDialogTitle>
        <AlertDialogDescription>
          {type === 'policy'
            ? t('Changes what {name} can do. Adding something they already have replaces its expiry and effect.', {
                name: state.userName,
              })
            : t('Changes what {name} can do. Adding something they already have replaces its expiry.', {
                name: state.userName,
              })}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="flex flex-col gap-4">
        <SegmentedFilter
          label={t('What to add')}
          value={type}
          onChange={setType}
          options={[
            { value: 'group', label: t('A group') },
            { value: 'policy', label: t('A policy') },
          ]}
          className="w-full"
        />

        {type === 'group' ? (
          <Field>
            <FieldLabel>{t('Group')}</FieldLabel>
            <GroupPicker groups={groups} heldGroupIds={state.heldGroupIds} value={groupId} onChange={setGroupId} />
            <FieldDescription>
              {t(
                'A group gives every policy it contains. To take one away from this user, deny that policy afterwards.',
              )}
            </FieldDescription>
          </Field>
        ) : (
          <>
            <Field>
              <FieldLabel>{t('Policy')}</FieldLabel>
              <PolicyPicker
                policies={policies}
                heldPolicyIds={state.heldPolicyIds}
                value={policyId}
                onChange={setPolicyId}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="policy-effect">{t('Effect')}</FieldLabel>
              <Select value={effect} onValueChange={(value) => setEffect(value as typeof effect)}>
                <SelectTrigger id="policy-effect" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="granted">{t('Granted')}</SelectItem>
                  <SelectItem value="denied">{t('Denied')}</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {effect === 'denied'
                  ? t('A denial wins over every grant of the same permission, even one that comes from a group.')
                  : t('The user can do what this policy covers, unless a denial says otherwise.')}
              </FieldDescription>
              {isSelfLockout && (
                <FieldError>
                  {t("You can't deny your own access to the staff area or to policy management.")}
                </FieldError>
              )}
            </Field>
          </>
        )}

        <ExpiryField value={expiry} onChange={setExpiry} />
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>{t('Cancel')}</AlertDialogCancel>
        <Button
          disabled={!isReady || isPending}
          onClick={() =>
            type === 'group'
              ? assignGroup.mutate({ userId: state.userId, groupId, expiresOn })
              : grant.mutate({ userId: state.userId, policyId, effect, expiresOn })
          }
        >
          {isPending ? t('Saving...') : t('Save')}
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
  const i18n = useI18n();
  const { t } = i18n;
  const trpc = useTRPC();
  const refreshList = useRefreshList();
  const { target } = state;
  const isGroup = target.type === 'group';
  const isDenial = state.effect === 'denied';

  const onSuccess = async () => {
    await refreshList();
    toast.success(
      isGroup
        ? t('Removed {name} from the {group} group.', { name: state.userName, group: target.label })
        : isDenial
          ? t('Lifted the denial of "{label}" for {name}.', { label: target.label, name: state.userName })
          : t('Revoked "{label}" for {name}.', { label: target.label, name: state.userName }),
    );
    onClose();
  };
  const onError = (error: ServerError) => toast.error(errorMessage(i18n, error));

  const revokePolicy = useMutation(trpc.policies.revoke.mutationOptions({ onSuccess, onError }));
  const revokeGroup = useMutation(trpc.policies.revokeGroup.mutationOptions({ onSuccess, onError }));
  const isPending = revokePolicy.isPending || revokeGroup.isPending;

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {isGroup ? t('Remove from this group?') : isDenial ? t('Lift this denial?') : t('Revoke this policy?')}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {isGroup
            ? t(
                '{name} loses everything the {group} group gives them, unless another group or a direct grant also provides it. The membership stays on their record and can be extended later.',
                { name: state.userName, group: target.label },
              )
            : isDenial
              ? t('The denial of "{label}" for {name} ends right away. Anything else they hold for it applies again.', {
                  label: target.label,
                  name: state.userName,
                })
              : t(
                  '{name} loses "{label}" right away, unless a group still provides it. It stays on their record and can be extended later.',
                  { name: state.userName, label: target.label },
                )}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>{t('Cancel')}</AlertDialogCancel>
        <Button
          variant={isDenial && !isGroup ? 'default' : 'destructive'}
          disabled={isPending}
          onClick={() =>
            isGroup
              ? revokeGroup.mutate({ userId: state.userId, groupId: target.id })
              : revokePolicy.mutate({ userId: state.userId, policyId: target.id })
          }
        >
          {isPending ? t('Saving...') : isGroup ? t('Remove') : isDenial ? t('Lift denial') : t('Revoke')}
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
  const i18n = useI18n();
  const { t, formatDateTime } = i18n;
  const trpc = useTRPC();
  const refreshList = useRefreshList();
  const { target } = state;
  const isGroup = target.type === 'group';
  const current = state.expiresOn ? new Date(state.expiresOn) : null;
  const isCurrentlyEnded = current !== null && current.getTime() <= Date.now();
  const [mode, setMode] = useState<'date' | 'indefinite'>(state.expiresOn === null ? 'indefinite' : 'date');
  const [expiry, setExpiry] = useState(current && !isCurrentlyEnded ? toIsoDate(current) : '');
  const nextExpiry = mode === 'indefinite' ? null : expiry ? endOfDayIso(expiry) : undefined;

  const onSuccess = async () => {
    await refreshList();
    toast.success(
      isGroup
        ? t('Updated the {group} membership of {name}.', { group: target.label, name: state.userName })
        : t('Updated the expiry of "{label}" for {name}.', { label: target.label, name: state.userName }),
    );
    onClose();
  };
  const onError = (error: ServerError) => toast.error(errorMessage(i18n, error));

  const extendPolicy = useMutation(trpc.policies.extend.mutationOptions({ onSuccess, onError }));
  const extendGroup = useMutation(trpc.policies.extendGroup.mutationOptions({ onSuccess, onError }));
  const isPending = extendPolicy.isPending || extendGroup.isPending;

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {isGroup
            ? t('Extend this membership')
            : state.effect === 'denied'
              ? t('Change the denial period')
              : t('Extend this policy')}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {isGroup
            ? t('{name} in the {group} group.', { name: state.userName, group: target.label })
            : state.effect === 'denied'
              ? t('"{label}" is denied for {name}.', { label: target.label, name: state.userName })
              : t('"{label}" for {name}.', { label: target.label, name: state.userName })}{' '}
          {isCurrentlyEnded
            ? t('It expired {date}. Saving a new period makes it active again.', {
                date: formatDateTime(state.expiresOn as string | Date),
              })
            : current
              ? t('It expires {date}.', { date: formatDateTime(current) })
              : t('It currently has no expiry.')}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <RadioGroup value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
        <div className="flex items-center gap-2 max-sm:min-h-11">
          <RadioGroupItem id="extend-date" value="date" />
          <label htmlFor="extend-date" className="flex-1 text-sm max-sm:py-2.5">
            {t('Until a date')}
          </label>
        </div>
        <div className="flex items-center gap-2 max-sm:min-h-11">
          <RadioGroupItem id="extend-indefinite" value="indefinite" />
          <label htmlFor="extend-indefinite" className="flex-1 text-sm max-sm:py-2.5">
            {t('No expiry')}
          </label>
        </div>
      </RadioGroup>

      {mode === 'date' && (
        <Field>
          <FieldLabel htmlFor="policy-expiry">{t('New expiry date')}</FieldLabel>
          <DatePicker id="policy-expiry" value={expiry} onChange={setExpiry} min={toIsoDate(new Date())} />
          <FieldDescription>{t('It ends at the close of that day.')}</FieldDescription>
        </Field>
      )}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>{t('Cancel')}</AlertDialogCancel>
        <Button
          disabled={nextExpiry === undefined || isPending}
          onClick={() => {
            if (nextExpiry === undefined) return;
            if (isGroup) extendGroup.mutate({ userId: state.userId, groupId: target.id, expiresOn: nextExpiry });
            else extendPolicy.mutate({ userId: state.userId, policyId: target.id, expiresOn: nextExpiry });
          }}
        >
          {isPending ? t('Saving...') : t('Save expiry')}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

export function PolicyDialogs({ state, policies, groups, onClose }: PolicyDialogsProps) {
  return (
    <AlertDialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        {state?.kind === 'grant' && (
          <GrantDialogBody
            key={`grant:${state.userId}:${state.preset?.policyId ?? ''}`}
            state={state}
            policies={policies}
            groups={groups}
            onClose={onClose}
          />
        )}
        {state?.kind === 'revoke' && (
          <RevokeDialogBody
            key={`revoke:${state.userId}:${state.target.type}:${state.target.id}`}
            state={state}
            onClose={onClose}
          />
        )}
        {state?.kind === 'extend' && (
          <ExtendDialogBody
            key={`extend:${state.userId}:${state.target.type}:${state.target.id}`}
            state={state}
            onClose={onClose}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
