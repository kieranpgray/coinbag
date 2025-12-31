import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface WealthBreakdownProps {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

/**
 * Wealth breakdown component
 * Displays Assets, Liabilities, and Net Worth with status indicators
 * No frequency selector (wealth is point-in-time, not recurring)
 */
export function WealthBreakdown({
  totalAssets,
  totalLiabilities,
  netWorth,
}: WealthBreakdownProps) {
  return (
    <Card className="border border-neutral-200">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold text-foreground">
            Breakdown
          </h2>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 space-y-3">
          {/* Assets Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Assets</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">
                {formatCurrency(totalAssets)}
              </span>
              <div className="h-2 w-2 rounded-full bg-success" aria-label="Positive status" />
            </div>
          </div>

          {/* Liabilities Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Liabilities</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">
                -{formatCurrency(totalLiabilities)}
              </span>
              <div className="h-2 w-2 rounded-full bg-error" aria-label="Liability status" />
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-neutral-200 my-2" />

          {/* Net Worth Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Net Worth</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">
                {formatCurrency(netWorth)}
              </span>
              <div
                className={`h-2 w-2 rounded-full ${
                  netWorth >= 0 ? 'bg-success' : 'bg-error'
                }`}
                aria-label={netWorth >= 0 ? 'Positive status' : 'Negative status'}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

