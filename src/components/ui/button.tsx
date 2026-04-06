import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'white'
    | 'ghost-dark';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const buttonClassName = cn(
      'inline-flex items-center justify-center gap-2 text-body font-semibold ring-offset-background transition-[color,box-shadow,transform,background-color,border-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed',
      {
        'rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-px hover:shadow-[0_8px_24px_var(--accent-glow)] active:translate-y-0':
          variant === 'default',
        'rounded-full bg-error text-white hover:bg-error/90 active:translate-y-0': variant === 'destructive',
        'rounded-full border border-border bg-background text-foreground hover:bg-muted/50': variant === 'outline',
        'rounded-full border-[1.5px] border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground':
          variant === 'secondary',
        'rounded-full border border-transparent bg-transparent text-foreground hover:bg-muted/50 hover:text-foreground':
          variant === 'ghost',
        'h-auto min-h-0 rounded-none border-0 bg-transparent p-0 text-link underline-offset-4 shadow-none hover:underline':
          variant === 'link',
        'rounded-full bg-white text-primary hover:bg-[var(--paper)] hover:-translate-y-px hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)] active:translate-y-0':
          variant === 'white',
        'rounded-full border border-white/20 bg-transparent text-white/80 hover:bg-white/10 hover:border-white/35':
          variant === 'ghost-dark',
      },
      variant !== 'link' && {
        'h-12 px-7 min-h-[44px]': size === 'default',
        'h-9 px-5 min-h-[44px] text-sm': size === 'sm',
        'h-14 px-7 min-h-[44px]': size === 'lg',
        'h-10 w-10 rounded-full p-0 whitespace-nowrap': size === 'icon',
      },
      loading && !asChild && 'cursor-wait',
      asChild && isDisabled && 'pointer-events-none opacity-45 cursor-not-allowed',
      className
    );

    // Radix Slot requires exactly one React element child — never mix loader + child here.
    // Slot is not a native control: do not pass `disabled` (invalid on SlotProps); use aria-disabled + classes.
    if (asChild) {
      return (
        <Slot
          data-variant={variant}
          className={buttonClassName}
          ref={ref}
          aria-disabled={isDisabled ? true : undefined}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        data-variant={variant}
        className={buttonClassName}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
