'use client';

import { DownloadIcon, PlusSquareIcon, ShareIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePwaInstall } from '@/lib/pwa-install';
import { cn } from '@/lib/utils';

export function InstallAppButton({ className }: { className?: string }) {
  const install = usePwaInstall();
  const buttonClass = cn('text-kit-foreground hover:bg-white/10 aria-expanded:bg-white/10', className);

  if (install.status === 'installed' || install.status === 'unavailable') return null;

  if (install.status === 'promptable') {
    return (
      <Button variant="ghost" size="icon" className={buttonClass} onClick={() => void install.install()}>
        <DownloadIcon className="size-5" />
        <span className="sr-only">Install app</span>
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={buttonClass}>
          <DownloadIcon className="size-5" />
          <span className="sr-only">Install app</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 text-sm text-pretty">
        <p className="mb-2 font-semibold text-popover-foreground">Install Cadence</p>
        <ol className="flex flex-col gap-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <ShareIcon className="size-4 shrink-0" aria-hidden />
            Tap Share in Safari's toolbar
          </li>
          <li className="flex items-center gap-2">
            <PlusSquareIcon className="size-4 shrink-0" aria-hidden />
            Then tap "Add to Home Screen"
          </li>
        </ol>
      </PopoverContent>
    </Popover>
  );
}
