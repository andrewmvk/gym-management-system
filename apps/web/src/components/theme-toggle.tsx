'use client';

import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
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
import { useI18n } from '@/lib/i18n/i18n-provider';
import type { LabelKey } from '@/lib/i18n/translate';
import { setThemePreference, type ThemePreference, useResolvedTheme, useThemePreference } from '@/lib/theme';
import { cn } from '@/lib/utils';

export const THEME_OPTIONS: { value: ThemePreference; label: LabelKey; icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const preference = useThemePreference();
  const resolved = useResolvedTheme();
  const Icon = resolved === 'dark' ? MoonIcon : SunIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('text-kit-foreground hover:bg-white/10 aria-expanded:bg-white/10', className)}
        >
          <Icon className="size-5" />
          <span className="sr-only">{t('Change theme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {t('Theme')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => setThemePreference(value as ThemePreference)}
        >
          {THEME_OPTIONS.map(({ value, label, icon: OptionIcon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <OptionIcon />
              {t(label)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
