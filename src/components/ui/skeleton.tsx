import * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--rl)] bg-[length:200%_100%] bg-gradient-to-r from-[var(--paper-2)] via-[var(--paper-3)] to-[var(--paper-2)] animate-skeleton-shimmer',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
