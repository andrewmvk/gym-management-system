import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const pageContainerVariants = cva('mx-auto flex w-full flex-col gap-2 px-4 py-8 sm:px-6', {
  variants: {
    width: {
      narrow: 'max-w-3xl',
      wide: 'max-w-5xl',
    },
  },
  defaultVariants: { width: 'narrow' },
});

interface PageContainerProps extends VariantProps<typeof pageContainerVariants> {
  className?: string;
  children: ReactNode;
}

export function PageContainer({ width, className, children }: PageContainerProps) {
  return <main className={cn(pageContainerVariants({ width }), className)}>{children}</main>;
}
