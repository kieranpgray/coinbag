import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: 'positive' | 'negative' | 'neutral';
  label: string; // For screen readers
  className?: string;
}

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const colorClass = {
    positive: 'bg-success',
    negative: 'bg-error',
    neutral: 'bg-muted-foreground'
  }[status];

  return (
    <span
      role="status"
      aria-label={label}
      className={cn('h-2 w-2 rounded-full', colorClass, className)}
    />
  );
}