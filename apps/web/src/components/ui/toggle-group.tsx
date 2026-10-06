'use client';

import { cn } from 'cn';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import type * as React from 'react';
import { useSlidingIndicator } from '@/hooks/use-sliding-indicator';

// Connected segments that read as one control: the chosen one fills cobalt, and in a single group one press
// replaces the other. One tab stop for the whole group, arrow keys move inside it. In a single group the
// cobalt fill is one marker that glides from the old choice to the new one.
function ToggleGroup({ className, children, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  const ref = useSlidingIndicator<HTMLDivElement>('[data-state="on"]');
  const isSingle = props.type === 'single';

  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(
        'group/toggle-group relative inline-flex divide-x divide-input overflow-hidden rounded-sm border border-input bg-card',
        className,
      )}
      {...props}
      ref={ref}
    >
      {isSingle && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-(--slide-w) translate-x-(--slide-x) border-0 bg-primary transition-[translate,width] duration-300 ease-(--ease-out-expo) group-data-sliding/toggle-group:block motion-reduce:transition-none"
        />
      )}
      {children}
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        'relative h-8 px-2.5 text-xs font-semibold text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/45 focus-visible:ring-inset data-[state=on]:bg-primary data-[state=on]:text-primary-foreground group-data-sliding/toggle-group:data-[state=on]:bg-transparent group-data-sliding/toggle-group:data-[state=on]:hover:bg-transparent',
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
