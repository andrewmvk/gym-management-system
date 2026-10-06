'use client';

import { cn } from 'cn';
import { Tabs as TabsPrimitive } from 'radix-ui';
import type * as React from 'react';
import { useSlidingIndicator } from '@/hooks/use-sliding-indicator';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-5', className)} {...props} />;
}

// The baseline is an inset shadow rather than a border, so the active trigger's underline can sit on it
// without a negative margin; a negative margin inside an overflow-x container forces a vertical scrollbar.
function TabsList({ className, children, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  const ref = useSlidingIndicator<HTMLDivElement>('[data-state="active"]');

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'group/tabs-list relative flex w-full items-end gap-6 overflow-x-auto overflow-y-hidden inset-shadow-baseline scrollbar-none',
        className,
      )}
      {...props}
      ref={ref}
    >
      {/* The underline glides to the chosen tab; each tab keeps a transparent border so its height holds. */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 hidden h-0.75 w-(--slide-w) translate-x-(--slide-x) bg-primary transition-[translate,width] duration-300 ease-(--ease-out-expo) group-data-sliding/tabs-list:block motion-reduce:transition-none"
      />
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'relative inline-flex h-10 shrink-0 items-center gap-2 border-b-3 border-transparent font-display text-base font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase transition-colors outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-foreground group-data-sliding/tabs-list:data-[state=active]:border-transparent',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('animate-in duration-200 outline-none fade-in-0', className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
