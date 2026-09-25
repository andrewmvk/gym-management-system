import { describe, expect, it } from 'vitest';
import { APP_NAME } from '@shared/index';

describe('shared package', () => {
  it('is importable', () => {
    expect(APP_NAME).toBe('Cadence');
  });
});
