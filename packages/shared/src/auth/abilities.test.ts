import { subject } from '@casl/ability';
import { describe, expect, it } from 'vitest';
import { defineAbilityFor, type PolicyGrant } from '@shared/auth/abilities';

const user = { id: 'user-1' };
const now = new Date('2026-09-25T12:00:00Z');

function grant(overrides: Partial<PolicyGrant>): PolicyGrant {
  return { operation: 'read', resource: 'Catalog', scope: 'all', effect: 'granted', expiresOn: null, ...overrides };
}

describe('defineAbilityFor', () => {
  it('grants nothing without grants', () => {
    const ability = defineAbilityFor(user, [], now);

    expect(ability.can('read', 'Catalog')).toBe(false);
  });

  it('keeps indefinite and future grants and drops expired ones', () => {
    const ability = defineAbilityFor(
      user,
      [
        grant({ resource: 'Catalog' }),
        grant({ resource: 'GymInfo', expiresOn: '2026-09-26T00:00:00Z' }),
        grant({ resource: 'Metrics', expiresOn: new Date('2026-09-24T00:00:00Z') }),
        grant({ resource: 'CheckIn', expiresOn: now }),
      ],
      now,
    );

    expect(ability.can('read', 'Catalog')).toBe(true);
    expect(ability.can('read', 'GymInfo')).toBe(true);
    expect(ability.can('read', 'Metrics')).toBe(false);
    expect(ability.can('read', 'CheckIn')).toBe(false);
  });

  it('lets a denied row win over a granted one regardless of order', () => {
    const denied = grant({ effect: 'denied' });
    const granted = grant({});

    expect(defineAbilityFor(user, [denied, granted], now).can('read', 'Catalog')).toBe(false);
    expect(defineAbilityFor(user, [granted, denied], now).can('read', 'Catalog')).toBe(false);
  });

  it('ignores an expired denial', () => {
    const ability = defineAbilityFor(
      user,
      [grant({}), grant({ effect: 'denied', expiresOn: '2026-09-01T00:00:00Z' })],
      now,
    );

    expect(ability.can('read', 'Catalog')).toBe(true);
  });

  it('limits self scope to the acting user records', () => {
    const ability = defineAbilityFor(user, [grant({ resource: 'TrainingPlan', scope: 'self' })], now);

    expect(ability.can('read', subject('TrainingPlan', { userId: 'user-1' }))).toBe(true);
    expect(ability.can('read', subject('TrainingPlan', { userId: 'user-2' }))).toBe(false);
  });

  it('unions multiple policies and lets manage imply every action', () => {
    const ability = defineAbilityFor(
      user,
      [grant({ resource: 'MemberApp' }), grant({ operation: 'manage', resource: 'Catalog' })],
      now,
    );

    expect(ability.can('read', 'MemberApp')).toBe(true);
    expect(ability.can('update', 'Catalog')).toBe(true);
    expect(ability.can('read', 'StaffApp')).toBe(false);
  });

  it('ignores operations or resources outside the shared vocabulary', () => {
    const ability = defineAbilityFor(user, [grant({ operation: 'fly' }), grant({ resource: 'Spaceship' })], now);

    expect(ability.rules).toHaveLength(0);
  });
});
