'use client';

import { type Locale, LocaleSchema } from '@cadence/shared/schemas/locale';
import { LanguagesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { cn } from '@/lib/utils';

// Each language is named in itself, so a person who cannot read the current one still finds their own.
const LOCALE_OPTIONS: readonly { value: Locale; name: string; short: string }[] = [
  { value: 'pt', name: 'Português', short: 'PT' },
  { value: 'en', name: 'English', short: 'EN' },
];

function onLocaleValue(value: string, setLocale: (locale: Locale) => void) {
  const parsed = LocaleSchema.safeParse(value);
  if (parsed.success) setLocale(parsed.data);
}

// Sign-in and sign-up: no app header there, so the switch sits under the card.
export function LocaleToggle({ className }: { className?: string }) {
  const { t, locale, setLocale } = useI18n();

  return (
    <ToggleGroup
      type="single"
      value={locale}
      onValueChange={(value) => onLocaleValue(value, setLocale)}
      aria-label={t('Language')}
      className={className}
    >
      {LOCALE_OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} aria-label={option.name} className="numerals">
          {option.short}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

// The public header, next to the theme menu and in the same style.
export function LocaleMenu({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('text-kit-foreground hover:bg-white/10 aria-expanded:bg-white/10', className)}
        >
          <LanguagesIcon className="size-5" />
          <span className="sr-only">{t('Change language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <LocaleMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// The language section of a dropdown, shared by the public header and the account menu.
export function LocaleMenuItems({ withSeparator = true }: { withSeparator?: boolean }) {
  const { t, locale, setLocale } = useI18n();

  return (
    <>
      <DropdownMenuLabel className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {t('Language')}
      </DropdownMenuLabel>
      {withSeparator && <DropdownMenuSeparator />}
      <DropdownMenuRadioGroup value={locale} onValueChange={(value) => onLocaleValue(value, setLocale)}>
        {LOCALE_OPTIONS.map((option) => (
          <DropdownMenuRadioItem key={option.value} value={option.value} lang={option.value === 'pt' ? 'pt-BR' : 'en'}>
            {option.name}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}
