import { describe, expect, it } from 'vitest';
import { endOfLocalDay, startOfLocalDay, todayLocal } from '@api/lib/dates';

describe('dates', () => {
  describe('todayLocal', () => {
    it('gives the right day just before local midnight', () => {
      expect(todayLocal(new Date(2026, 5, 15, 23, 59, 59))).toBe('2026-06-15');
    });

    it('gives the right day just after local midnight', () => {
      expect(todayLocal(new Date(2026, 5, 16, 0, 0, 1))).toBe('2026-06-16');
    });

    it('pads single-digit months and days', () => {
      expect(todayLocal(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05');
    });
  });

  describe('startOfLocalDay / endOfLocalDay', () => {
    it('gives the exact local midnight boundaries for a date', () => {
      expect(startOfLocalDay('2026-06-15')).toEqual(new Date(2026, 5, 15, 0, 0, 0, 0));
      expect(endOfLocalDay('2026-06-15')).toEqual(new Date(2026, 5, 16, 0, 0, 0, 0));
    });
  });
});
