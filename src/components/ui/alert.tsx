import * as React from 'react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'neutral' | 'warning' | 'danger' | 'success' | 'info';

const alertVariantClasses: Record<AlertVariant, string> = {
  neutral: 'border-border bg-background text-foreground',
  warning:
    'border-[color:var(--warning)] bg-[var(--warning-light)] text-[color:var(--warning)] dark:border-[rgba(245,230,163,0.35)] dark:bg-[rgba(181,138,16,0.12)] dark:text-[#f5e6a3]',
  danger:
    'border-[color:var(--danger)] bg-[var(--danger-light)] text-[color:var(--danger)] dark:border-[rgba(240,128,128,0.45)] dark:bg-[rgba(192,57,43,0.15)] dark:text-[#f5b4ad]',
  success:
    'border-primary bg-[var(--accent-light)] text-primary dark:border-[rgba(61,153,96,0.5)] dark:bg-[rgba(26,92,58,0.2)] dark:text-[#8fd4a8]',
  info: 'border-[color:var(--info)] bg-[var(--info-light)] text-[color:var(--info)] dark:border-[rgba(135,206,250,0.35)] dark:bg-[rgba(26,82,122,0.2)] dark:text-[#b8d9f0]',
};

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'neutral', ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'relative w-full rounded-[var(--rl)] border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:pl-7',
        alertVariantClasses[variant],
        className
      )}
      {...props}
    />
  )
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-body text-muted-foreground', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
