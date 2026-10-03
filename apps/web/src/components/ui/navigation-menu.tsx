'use client';

import { cn } from 'cn';
import { NavigationMenu as NavigationMenuPrimitive } from 'radix-ui';
import type * as React from 'react';

// No Viewport: each Content renders under its own Item, so the panel sits right below its trigger
// instead of being measured and moved by a shared viewport.
function NavigationMenu({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Root>) {
  return <NavigationMenuPrimitive.Root data-slot="navigation-menu" className={cn('relative', className)} {...props} />;
}

function NavigationMenuList({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return <NavigationMenuPrimitive.List data-slot="navigation-menu-list" className={cn('flex', className)} {...props} />;
}

function NavigationMenuItem({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn('relative flex', className)}
      {...props}
    />
  );
}

function NavigationMenuTrigger(props: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return <NavigationMenuPrimitive.Trigger data-slot="navigation-menu-trigger" {...props} />;
}

// The outer element only bridges the gap to the trigger (padding, not margin), so moving the pointer down
// from the trigger never leaves the hover area and the panel does not close on the way.
function NavigationMenuContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        'absolute top-full left-0 z-50 pt-1.5 duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none',
        className,
      )}
      {...props}
    >
      <div className="min-w-48 rounded-md border border-kit-line bg-kit p-1 text-kit-foreground shadow-popover">
        {children}
      </div>
    </NavigationMenuPrimitive.Content>
  );
}

function NavigationMenuLink(props: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return <NavigationMenuPrimitive.Link data-slot="navigation-menu-link" {...props} />;
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
};
