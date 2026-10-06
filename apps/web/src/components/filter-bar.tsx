import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function FilterBarRoot({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="filter-bar"
      className={cn('flex flex-col gap-3 lg:flex-row lg:items-center', className)}
      {...props}
    />
  );
}

function FilterBarTrailing({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="filter-bar-trailing"
      className={cn('flex flex-col gap-3 lg:ml-auto lg:flex-row lg:items-center', className)}
      {...props}
    />
  );
}

export const FilterBar = Object.assign(FilterBarRoot, { Trailing: FilterBarTrailing });
