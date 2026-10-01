import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PageHeadingProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}

function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 rounded-sm font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <ArrowLeftIcon className="size-4" />
      {label}
    </Link>
  );
}

function PageHeadingRoot({ title, description, actions, back }: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-3">
        {back && <BackLink {...back} />}
        <h1 className="font-display text-4xl leading-none font-extrabold text-balance uppercase sm:text-5xl">
          {title}
        </h1>
        {description && <p className="max-w-2xl text-pretty text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// h-9 / sm:h-12 are the line boxes of the text-4xl / sm:text-5xl title at leading-none; h-6 is one body line.
function PageHeadingSkeleton({
  hasDescription = true,
  back,
}: {
  hasDescription?: boolean;
  back?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-3">
      {back && <BackLink {...back} />}
      <Skeleton className="h-9 w-64 sm:h-12 sm:w-80" />
      {hasDescription && <Skeleton className="h-6 w-full max-w-md" />}
    </div>
  );
}

export const PageHeading = Object.assign(PageHeadingRoot, { Skeleton: PageHeadingSkeleton });
