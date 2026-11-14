import { DEFAULT_LOCALE, parseLocale } from '@shared/schemas/locale';
import { describe, expect, it } from 'vitest';

describe('parseLocale', () => {
  it('keeps a supported language', () => {
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('pt')).toBe('pt');
  });

  it('falls back to the default for anything else', () => {
    expect(DEFAULT_LOCALE).toBe('pt');
    expect(parseLocale(undefined)).toBe('pt');
    expect(parseLocale('fr')).toBe('pt');
    expect(parseLocale(42)).toBe('pt');
    expect(parseLocale('EN')).toBe('pt');
  });
});
