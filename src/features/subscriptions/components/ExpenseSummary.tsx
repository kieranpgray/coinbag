import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Subscription } from '@/types/domain';
import { calculateMonthlyEquivalent } from '../utils';
import { useCategories } from '@/features/categories/hooks';

interface ExpenseSummaryProps {
  subscriptions: Subscription[];
  showGrouped: boolean;
}

type TimePeriod = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly';

const TIME_PERIODS: { value: TimePeriod; label: string; multiplier: number }[] = [
  { value: 'weekly', label: 'Weekly', multiplier: 1 / 4.33 }, // ~0.231
  { value: 'fortnightly', label: 'Fortnightly', multiplier: 1 / 2.167 }, // ~0.462
  { value: 'monthly', label: 'Monthly', multiplier: 1 },
  { value: 'quarterly', label: 'Quarterly', multiplier: 3 },
  { value: 'yearly', label: 'Yearly', multiplier: 12 },
];

export function ExpenseSummary({ subscriptions, showGrouped }: ExpenseSummaryProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('monthly');
  const { data: categories = [] } = useCategories();
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  // Calculate totals by category
  const categoryTotals = subscriptions.reduce((acc, subscription) => {
    const monthlyAmount = calculateMonthlyEquivalent(subscription.amount, subscription.frequency);
    const category = categoryNameById.get(subscription.categoryId) || 'Unknown category';

    if (!acc[category]) {
      acc[category] = {
        total: 0,
        count: 0,
        subscriptions: [],
      };
    }

    acc[category].total += monthlyAmount;
    acc[category].count += 1;
    acc[category].subscriptions.push(subscription);

    return acc;
  }, {} as Record<string, { total: number; count: number; subscriptions: Subscription[] }>);

  // Calculate overall total
  const overallTotal = Object.values(categoryTotals).reduce((sum, category) => sum + category.total, 0);

  // Get period multiplier
  const periodMultiplier = TIME_PERIODS.find(p => p.value === selectedPeriod)?.multiplier || 1;

  // Calculate period total
  const periodTotal = overallTotal * periodMultiplier;

  // Sort categories by total amount (descending)
  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b.total - a.total);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Expense Summary</CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="period-select" className="text-sm text-muted-foreground">
              Time period:
            </Label>
            <Select value={selectedPeriod} onValueChange={(value: TimePeriod) => setSelectedPeriod(value)}>
              <SelectTrigger id="period-select" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Total */}
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-foreground">
              ${periodTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-muted-foreground">
              Total {selectedPeriod} expenses
            </div>
          </div>

          {/* Category Breakdown (only when grouped view is enabled) */}
          {showGrouped && sortedCategories.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">By Category</h4>
              <div className="space-y-2">
                {sortedCategories.map(([category, data]) => {
                  const categoryPeriodTotal = data.total * periodMultiplier;
                  const percentage = overallTotal > 0 ? (data.total / overallTotal) * 100 : 0;

                  return (
                    <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{category}</div>
                        <div className="text-sm text-muted-foreground">
                          {data.count} subscription{data.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          ${categoryPeriodTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {percentage.toFixed(1)}% of total
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">{subscriptions.length}</div>
              <div className="text-sm text-muted-foreground">Total Subscriptions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {Object.keys(categoryTotals).length}
              </div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
