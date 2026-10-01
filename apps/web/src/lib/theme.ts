'use client';

import { useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY } from '@/lib/theme-script';

export type ThemePreference = 'light' | 'dark' | 'system';

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function systemIsDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(preference: ThemePreference) {
  const isDark = preference === 'dark' || (preference === 'system' && systemIsDark());
  document.documentElement.classList.toggle('dark', isDark);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemChange = () => {
    if (readPreference() === 'system') applyTheme('system');
    listener();
  };
  media.addEventListener('change', handleSystemChange);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', handleSystemChange);
  };
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {}
  applyTheme(preference);
  for (const listener of listeners) listener();
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => 'system');
}

export function useResolvedTheme(): 'light' | 'dark' {
  const preference = useThemePreference();
  const isSystemDark = useSyncExternalStore(subscribe, systemIsDark, () => false);
  if (preference === 'system') return isSystemDark ? 'dark' : 'light';
  return preference;
}
