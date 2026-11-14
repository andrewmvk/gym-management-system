import { unusableProposalNote, withLanguage } from '@api/lib/locale';
import { describe, expect, it } from 'vitest';

describe('withLanguage', () => {
  it('leaves an English prompt as it is', () => {
    expect(withLanguage('You are a coach.', 'en')).toBe('You are a coach.');
  });

  it('asks for Brazilian Portuguese and keeps the structure of the answer', () => {
    const prompt = withLanguage('You are a coach.', 'pt');

    expect(prompt.startsWith('You are a coach.')).toBe(true);
    expect(prompt).toContain('Brazilian Portuguese');
    expect(prompt).toContain('ids, dates, enum values and JSON keys');
  });
});

describe('unusableProposalNote', () => {
  it('speaks the chosen language', () => {
    expect(unusableProposalNote('en')).toContain("I couldn't turn that into a plan change");
    expect(unusableProposalNote('pt')).toContain('Não consegui transformar isso');
  });
});
