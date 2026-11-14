'use client';

import Link from 'next/link';
import { Brand } from '@/components/brand';
import { InstallAppButton } from '@/components/install-app-button';
import { KitBar } from '@/components/kit-bar';
import { LocaleMenu } from '@/components/locale-switch';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { LOGIN_PATH } from '@/lib/routes';

export function PublicHeader() {
  const { t } = useI18n();

  return (
    <KitBar>
      <Link href="/" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Brand />
      </Link>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <InstallAppButton />
        <LocaleMenu />
        <ThemeToggle />
        <Button asChild variant="ghost" className="hidden text-kit-foreground hover:bg-white/10 sm:inline-flex">
          <Link href="/gym">{t('Gym info')}</Link>
        </Button>
        <Button asChild variant="ghost" className="text-kit-foreground hover:bg-white/10">
          <Link href={LOGIN_PATH}>{t('Sign in')}</Link>
        </Button>
        <Button asChild variant="tape">
          <Link href="/signup">{t('Join')}</Link>
        </Button>
      </div>
    </KitBar>
  );
}
