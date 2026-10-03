import { ChevronRightIcon, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface OverviewRowProps {
  href: string;
  icon: LucideIcon;
  title: string;
  count: number;
  detail: ReactNode;
}

// One line of the overview: a number, what it counts, one sentence about it, and the page it opens.
function OverviewRowRoot({ href, icon: Icon, title, count, detail }: OverviewRowProps) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-4 px-5 py-5 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 sm:gap-6 sm:px-6"
      >
        <span className="numerals flex w-16 shrink-0 justify-end text-5xl leading-none font-extrabold sm:w-20 sm:text-6xl">
          {count}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2 font-display text-xl font-bold tracking-wide uppercase">
            <Icon className="size-5 text-muted-foreground" aria-hidden />
            {title}
          </span>
          <span className="text-sm text-pretty text-muted-foreground">{detail}</span>
        </span>
        <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

function OverviewRowSkeleton() {
  return (
    <li className="flex items-center gap-4 px-5 py-5 sm:gap-6 sm:px-6">
      <span className="flex w-16 justify-end sm:w-20">
        <Skeleton className="h-12 w-12 sm:h-15" />
      </span>
      <span className="flex flex-1 flex-col gap-1">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-5 w-64 max-w-full" />
      </span>
    </li>
  );
}

export const OverviewRow = Object.assign(OverviewRowRoot, { Skeleton: OverviewRowSkeleton });
