import {
  createMongoAbility,
  type ForcedSubject,
  type MongoAbility,
  type RawRuleOf,
} from '@casl/ability';
import {
  ACTIONS,
  SUBJECTS,
  type Action,
  type PolicyEffect,
  type Subject,
} from '@shared/auth/types';

export type AppSubject = Subject | ForcedSubject<Subject>;
export type AppAbility = MongoAbility<[Action, AppSubject]>;
export type AbilityRule = RawRuleOf<AppAbility>;

export interface AbilityUser {
  id: string;
}

export interface PolicyGrant {
  operation: string;
  resource: string;
  scope: string;
  effect: PolicyEffect;
  expiresOn: Date | string | null;
}

const isAction = (value: string): value is Action => (ACTIONS as readonly string[]).includes(value);
const isSubject = (value: string): value is Subject => (SUBJECTS as readonly string[]).includes(value);

function isActive(grant: PolicyGrant, now: Date) {
  return grant.expiresOn === null || new Date(grant.expiresOn).getTime() > now.getTime();
}

export function buildAbilityRules(user: AbilityUser, grants: readonly PolicyGrant[], now = new Date()): AbilityRule[] {
  const rules = grants
    .filter((grant) => isActive(grant, now))
    // operation/resource are plain text in the database; a value outside the shared vocabulary grants nothing.
    .filter((grant) => isAction(grant.operation) && isSubject(grant.resource))
    .map<AbilityRule>((grant) => ({
      action: grant.operation as Action,
      subject: grant.resource as Subject,
      ...(grant.scope === 'self' ? { conditions: { userId: user.id } } : {}),
      ...(grant.effect === 'denied' ? { inverted: true } : {}),
    }));

  // CASL gives later rules precedence, so denials go last and always win over grants.
  return [...rules.filter((rule) => !rule.inverted), ...rules.filter((rule) => rule.inverted)];
}

export function createAppAbility(rules: AbilityRule[] = []): AppAbility {
  return createMongoAbility<AppAbility>(rules);
}

export function defineAbilityFor(user: AbilityUser, grants: readonly PolicyGrant[], now = new Date()): AppAbility {
  return createAppAbility(buildAbilityRules(user, grants, now));
}
