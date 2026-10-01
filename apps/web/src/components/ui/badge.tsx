import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';
import type * as React from 'react';

// State is carried by form as well as hue: solid is a settled determination, dashed is still
// pending, struck is unavailable. A technical failure (retry) is dashed and red, never solid.
const badgeVariants = cva(
  'group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent px-2 font-display text-xs leading-none font-semibold tracking-widest whitespace-nowrap uppercase transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3.5!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border-input text-foreground',
        live: 'bg-success text-success-foreground',
        negative: 'bg-destructive text-destructive-foreground',
        pending: 'border-dashed border-foreground/40 text-foreground',
        retry: 'border-dashed border-destructive text-destructive',
        unavailable: 'border-input text-muted-foreground line-through decoration-1',
        tape: 'bg-tape text-tape-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        ghost: 'text-muted-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
