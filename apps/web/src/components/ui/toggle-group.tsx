'use client';

import { cn } from 'cn';
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import type * as React from 'react';

// Connected segments that read as one control: the chosen one fills cobalt, and in a single group one press
// replaces the other. One tab stop for the whole group, arrow keys move inside it.
function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn(
        'inline-flex divide-x divide-input overflow-hidden rounded-sm border border-input bg-card',
        className,
      )}
      {...props}
    />
  );
}

function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        'h-8 px-2.5 text-xs font-semibold text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/45 focus-visible:ring-inset data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
