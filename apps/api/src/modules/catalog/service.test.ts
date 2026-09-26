import { describe, expect, it } from 'vitest';
import { isExerciseAvailable } from '@api/modules/catalog/service';

describe('isExerciseAvailable (RN-04)', () => {
  it('is available when no equipment is linked', () => {
    expect(isExerciseAvailable([])).toBe(true);
  });

  it('is available when the one linked item is available', () => {
    expect(isExerciseAvailable([{ isAvailable: true }])).toBe(true);
  });

  it('is unavailable when the one linked item is unavailable', () => {
    expect(isExerciseAvailable([{ isAvailable: false }])).toBe(false);
  });

  it('is available when at least one of several linked items is available', () => {
    expect(isExerciseAvailable([{ isAvailable: false }, { isAvailable: true }, { isAvailable: false }])).toBe(true);
  });

  it('is unavailable when every linked item is unavailable', () => {
    expect(isExerciseAvailable([{ isAvailable: false }, { isAvailable: false }])).toBe(false);
  });
});
