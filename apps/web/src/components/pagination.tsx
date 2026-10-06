import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  noun?: string;
  className?: string;
}

function pageWindow(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  return sorted.flatMap((p, index) => (index > 0 && p - sorted[index - 1]! > 1 ? ['gap' as const, p] : [p]));
}

export function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  noun = 'items',
  className,
}: PaginationProps) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex flex-col-reverse items-center justify-between gap-3 sm:flex-row', className)}
    >
      <p className="text-sm text-muted-foreground">
        <span key={first} className="numerals inline-block animate-tick text-base font-semibold text-foreground">
          {first}-{last}
        </span>{' '}
        of <span className="numerals text-base font-semibold text-foreground">{total}</span> {noun}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </Button>
          {pageWindow(page, pageCount).map((item, index) =>
            item === 'gap' ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: gaps have no identity, the window is recomputed on every render.
              <span key={`gap-${index}`} className="px-1 text-muted-foreground" aria-hidden>
                ...
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? 'default' : 'ghost'}
                size="icon-sm"
                className="numerals text-base"
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            ),
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={page === pageCount}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      )}
    </nav>
  );
}
