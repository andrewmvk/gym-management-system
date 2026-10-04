import { describeProfileEvent } from '@shared/schemas/profile-events';
import { describe, expect, it } from 'vitest';

describe('describeProfileEvent', () => {
  it('reads as the label followed by the description', () => {
    expect(describeProfileEvent('injury', { description: 'Sore left knee' })).toBe('Injury: Sore left knee');
    expect(describeProfileEvent('medication_change', { description: 'Started a new pill' })).toBe(
      'Medication change: Started a new pill',
    );
  });

  it('falls back to the label alone when the payload has no description', () => {
    expect(describeProfileEvent('life_event', { other: 1 })).toBe('Life event');
    expect(describeProfileEvent('state_update', null)).toBe('Update');
  });
});
