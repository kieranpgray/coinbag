import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'gold' | 'warning';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          {
            'border-transparent bg-[var(--accent-light)] text-primary hover:bg-[var(--accent-light)]/90':
              variant === 'default',
            'border-transparent bg-[rgba(15,14,12,0.08)] text-foreground dark:bg-white/10':
              variant === 'secondary',
            'border-transparent bg-[var(--danger-light)] text-[color:var(--danger)] hover:bg-[var(--danger-light)]/90':
              variant === 'destructive',
            'border-border bg-transparent text-foreground': variant === 'outline',
            'border-transparent bg-[var(--gold-light)] text-[color:var(--gold)]': variant === 'gold',
            'border-transparent bg-[var(--warning-light)] text-[color:var(--warning)]': variant === 'warning',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
