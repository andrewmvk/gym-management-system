import { APP_NAME } from '@shared/index';
import { describe, expect, it } from 'vitest';

describe('shared package', () => {
  it('is importable', () => {
    expect(APP_NAME).toBe('Cadence');
  });
});
