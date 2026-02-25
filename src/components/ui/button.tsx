import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(
          'inline-flex items-center justify-center text-body font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 disabled:cursor-default',
          {
            // Primary button: pill-shaped, flat solid color, white text
            'rounded-full bg-primary text-white hover:bg-primary/90': variant === 'default',
            // Destructive button: pill-shaped, flat red background
            'rounded-full bg-error text-white hover:bg-error/90': variant === 'destructive',
            // Outline button: pill-shaped with border, flat hover
            'rounded-full border border-border bg-background hover:bg-muted/50 hover:text-foreground': variant === 'outline',
            // Secondary button: tonal style with lighter background, flat hover
            'rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            // Ghost button: no background, flat hover effect
            'rounded-full hover:bg-muted/50 hover:text-foreground': variant === 'ghost',
            // Link button: no background, underline on hover
            'text-link underline-offset-4 hover:underline': variant === 'link',
          },
          {
            // Default size: 40-48px height, responsive horizontal padding
            'h-12 px-4 sm:px-6 min-h-[44px]': size === 'default',
            // Small size: smaller height and responsive padding
            'h-9 px-3 sm:px-4 min-h-[44px]': size === 'sm',
            // Large size: larger height, responsive horizontal padding
            'h-14 px-4 sm:px-6 min-h-[44px]': size === 'lg',
            // Icon button: circular, 40px diameter, no text wrapping needed
            'h-10 w-10 rounded-full p-0 whitespace-nowrap': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };

