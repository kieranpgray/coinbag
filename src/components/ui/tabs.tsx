import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const TabsVariantContext = React.createContext<'pill' | 'underline'>('pill');

export type TabsProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
  variant?: 'pill' | 'underline';
};

const Tabs = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Root>, TabsProps>(
  ({ variant = 'pill', className, ...props }, ref) => (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.Root ref={ref} className={className} {...props} />
    </TabsVariantContext.Provider>
  )
);
Tabs.displayName = 'Tabs';

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const tabsVariant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'inline-flex flex-wrap h-auto items-center justify-start text-muted-foreground',
        tabsVariant === 'pill' && 'gap-1 rounded-full bg-[var(--paper-2)] p-1',
        tabsVariant === 'underline' && 'gap-0 rounded-none border-b border-border bg-transparent p-0',
        className
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const tabsVariant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap text-body font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation',
        tabsVariant === 'pill' &&
          'min-h-[44px] rounded-full px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        tabsVariant === 'underline' &&
          'min-h-[44px] rounded-none border-b-2 border-transparent bg-transparent px-3 pb-2 pt-2 data-[state=active]:border-primary data-[state=active]:text-foreground',
        className
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
