import type { Locale } from '@cadence/shared/schemas/locale';

const LANGUAGE_INSTRUCTIONS: Record<Locale, string> = {
  en: '',
  pt:
    ' Write every piece of text the member will read (the reply, reasons, notes, summaries, tips, remembered ' +
    'facts and quick replies) in Brazilian Portuguese, in a friendly and direct tone. Keep ids, dates, enum ' +
    'values and JSON keys exactly as specified, and keep exercise names as they appear in the catalog.',
};

// The prompts stay in English so the AI's behavior does not depend on the language; only the text the member
// reads changes language, through one closing instruction.
export function withLanguage(systemPrompt: string, locale: Locale): string {
  return systemPrompt + LANGUAGE_INSTRUCTIONS[locale];
}

const UNUSABLE_PROPOSAL_NOTES: Record<Locale, string> = {
  en: "\n\nI couldn't turn that into a plan change, so nothing has been proposed. Ask me again and I'll rebuild it.",
  pt: '\n\nNão consegui transformar isso em uma mudança no treino, então nada foi proposto. Peça de novo e eu refaço.',
};

export function unusableProposalNote(locale: Locale): string {
  return UNUSABLE_PROPOSAL_NOTES[locale];
}
