import type { Locale } from '@cadence/shared/schemas/locale';
import { createElement, Fragment, type ReactNode } from 'react';
import { PT } from '@/lib/i18n/pt';

// Every message key is the English text itself, so the source stays readable and English needs no table.
// A key missing from PT is a type error at the call site, which is what keeps the translation complete.
export type MessageKey = keyof typeof PT;

type Placeholders<S extends string> = S extends `${string}{${infer Name}}${infer Rest}`
  ? Name | Placeholders<Rest>
  : never;

// A key with no {placeholder}: what a label held in a constant (a nav entry, a filter option) is typed as.
export type LabelKey = { [K in MessageKey]: [Placeholders<K>] extends [never] ? K : never }[MessageKey];

type VarsArgs<K extends string, V> = [Placeholders<K>] extends [never] ? [] : [vars: Record<Placeholders<K>, V>];

export type Translate = <K extends MessageKey>(key: K, ...vars: VarsArgs<K, string | number>) => string;
export type TranslateNodes = <K extends MessageKey>(key: K, vars: Record<Placeholders<K>, ReactNode>) => ReactNode;

// A Portuguese entry that drops or renames a {placeholder} would print the raw braces, so the dictionary is
// checked against its keys at compile time: this constant only type checks while every pair matches.
type PlaceholderMismatch = {
  [K in MessageKey]: [Placeholders<K>] extends [Placeholders<(typeof PT)[K]>]
    ? [Placeholders<(typeof PT)[K]>] extends [Placeholders<K>]
      ? never
      : K
    : K;
}[MessageKey];
export const PLACEHOLDERS_MATCH: [PlaceholderMismatch] extends [never] ? true : PlaceholderMismatch = true;

const DYNAMIC: Readonly<Record<string, string>> = PT;

// When one English word needs two Portuguese ones ("Back" the button, "Back" the muscle group), the key carries
// a context before "::" that English never shows: "group::Back".
function englishText(key: string): string {
  const separator = key.indexOf('::');
  return separator === -1 ? key : key.slice(separator + 2);
}

function template(locale: Locale, key: string): string {
  return locale === 'pt' ? (DYNAMIC[key] ?? englishText(key)) : englishText(key);
}

function interpolate(text: string, vars: Record<string, string | number> | undefined): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

export function createTranslate(locale: Locale): Translate {
  return (key, ...vars) => interpolate(template(locale, key), vars[0] as Record<string, string | number>);
}

// For text that comes from data rather than from the code (a catalog exercise, a muscle, a validation or
// server message): translated when the dictionary knows it, shown as it is otherwise.
export function createTranslateText(locale: Locale) {
  return (text: string): string => template(locale, text);
}

// For a sentence with a link or a numeral inside it: the parts are placed where the placeholders sit.
export function createTranslateNodes(locale: Locale): TranslateNodes {
  return (key, vars) => {
    const parts = template(locale, key).split(/\{(\w+)\}/g);
    const values = vars as Record<string, ReactNode>;
    return createElement(
      Fragment,
      null,
      ...parts.map((part, index) =>
        createElement(Fragment, { key: index }, index % 2 === 1 ? (values[part] ?? `{${part}}`) : part),
      ),
    );
  };
}

export function intlLocale(locale: Locale) {
  return locale === 'pt' ? 'pt-BR' : 'en-US';
}

export function htmlLang(locale: Locale) {
  return locale === 'pt' ? 'pt-BR' : 'en';
}
