import { cn, formatCurrency } from '@/lib/utils';

interface SurplusCardProps {
  amount: number;           // computed surplus value; negative = shortfall
  label?: string;           // default: "Remaining this pay cycle"
  sublabel?: string;        // optional: "per fortnight" etc.
  currency?: string;        // default: 'AUD'
  className?: string;
}

export function SurplusCard({
  amount,
  label = 'Remaining this pay cycle',
  sublabel,
  className,
}: SurplusCardProps) {
  const isShortfall = amount < 0;

  return (
    <div className={cn('surplus-card', isShortfall && 'shortfall', className)}>
      <div>
        <div className="surplus-label">{label}</div>
        {sublabel && <div className="surplus-sub">{sublabel}</div>}
      </div>
      <div className="surplus-amount">
        {isShortfall ? '-' : ''}{formatCurrency(Math.abs(amount))}
      </div>
    </div>
  );
}
