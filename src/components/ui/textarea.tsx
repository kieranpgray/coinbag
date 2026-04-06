import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    const hasError = ariaInvalid === true || ariaInvalid === 'true' || className?.includes('border-destructive');

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-[12px] border bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground',
          hasError
            ? 'border-[color:var(--danger)] shadow-[0_0_0_3px_rgba(192,57,43,0.1)]'
            : 'border-border hover:border-neutral-mid',
          'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-ring)] focus-visible:border-primary',
          hasError &&
            'focus-visible:border-[color:var(--danger)] focus-visible:shadow-[0_0_0_3px_rgba(192,57,43,0.15)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        aria-invalid={ariaInvalid}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
