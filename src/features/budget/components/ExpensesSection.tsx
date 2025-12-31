import { useState, useMemo, useEffect, useRef } from 'react';
import { TrendingDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import type { Subscription } from '@/types/domain';
import { ExpenseItem } from './ExpenseItem';
import { BudgetSummaryCard } from './BudgetSummaryCard';
import { calculateMonthlyEquivalent } from '@/features/subscriptions/utils';
import {
  filterByExpenseType,
  groupByCategory,
} from '../utils/filtering';
import { getExpenseTypeLabelPlural, getExpenseTypeLabelSingular, getExpenseType, type ExpenseType } from '../utils/expenseTypeMapping';
import { getCategoryNameSafe } from '../utils/categoryHelpers';
import { convertToFrequency, getFrequencyLabelForDisplay, type Frequency, FREQUENCY_OPTIONS } from '../utils/frequencyConversion';

interface ExpensesSectionProps {
  subscriptions: Subscription[];
  categoryMap: Map<string, string>;
  uncategorisedId?: string;
  onCreate: (expenseType?: ExpenseType) => void;
  onEdit: (subscription: Subscription) => void;
  onDelete: (subscription: Subscription) => void;
  parentFrequency?: Frequency;
  onFrequencyChange?: (frequency: Frequency) => void;
}

/**
 * Expenses section component
 * Displays total monthly expenses with category-based filtering
 */
export function ExpensesSection({
  subscriptions,
  categoryMap,
  uncategorisedId,
  onCreate,
  onEdit,
  onDelete,
  parentFrequency,
  onFrequencyChange,
}: ExpensesSectionProps) {
  const [activeTab, setActiveTab] = useState<ExpenseType | 'all'>('all');
  const [localFrequency, setLocalFrequency] = useState<Frequency | undefined>(parentFrequency);
  const hasManualOverride = useRef(false);

  // Update local frequency when parent frequency changes (if not manually overridden)
  useEffect(() => {
    if (parentFrequency !== undefined) {
      if (!hasManualOverride.current) {
        // Sync with parent if user hasn't manually overridden
        setLocalFrequency(parentFrequency);
      } else if (localFrequency === parentFrequency) {
        // If user's manual override matches parent, clear the override flag
        hasManualOverride.current = false;
      }
    }
  }, [parentFrequency, localFrequency]);

  // Calculate total monthly expenses (excluding savings and repayments)
  const totalMonthlyExpenses = useMemo(() => {
    return subscriptions.reduce((sum, subscription) => {
      const categoryName = getCategoryNameSafe(subscription.categoryId, categoryMap, uncategorisedId);
      const expenseType = getExpenseType(categoryName);
      // Exclude savings and repayments from general expenses
      if (expenseType === 'savings' || expenseType === 'repayments') {
        return sum;
      }
      return sum + calculateMonthlyEquivalent(subscription.amount, subscription.frequency);
    }, 0);
  }, [subscriptions, categoryMap, uncategorisedId]);

  const displayFrequency = localFrequency || parentFrequency || 'monthly';
  const displayExpenses = convertToFrequency(totalMonthlyExpenses, 'monthly', displayFrequency);

  const handleFrequencyChange = (frequency: Frequency) => {
    setLocalFrequency(frequency);
    hasManualOverride.current = true; // Mark as manually overridden
    onFrequencyChange?.(frequency);
  };

  // Filter expenses based on active tab
  const filteredExpenses = useMemo(() => {
    return filterByExpenseType(subscriptions, activeTab, categoryMap, uncategorisedId);
  }, [subscriptions, activeTab, categoryMap, uncategorisedId]);

  // Group expenses by category for "All" tab
  const expensesByCategory = useMemo(() => {
    if (activeTab === 'all') {
      return groupByCategory(subscriptions, categoryMap, uncategorisedId);
    }
    return {};
  }, [subscriptions, activeTab, categoryMap, uncategorisedId]);

  // Get category name for a subscription (deprecated categories become "Uncategorised")
  const getCategoryName = (categoryId: string) => {
    return getCategoryNameSafe(categoryId, categoryMap, uncategorisedId);
  };

  return (
    <section className="space-y-6" aria-label="Expenses section">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-neutral-600 text-xl sm:text-2xl font-semibold">Expenses</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold">
              {formatCurrency(displayExpenses)}
            </span>
            <span className="text-neutral-500">per {getFrequencyLabelForDisplay(displayFrequency)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={displayFrequency} onValueChange={(value) => handleFrequencyChange(value as Frequency)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="border-neutral-300 whitespace-nowrap"
            onClick={() => onCreate()}
            aria-label="Add expense"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExpenseType | 'all')} className="w-full">
        <TabsList className="bg-neutral-100 p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-white">
            All
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-white">
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="bills" className="data-[state=active]:bg-white">
            Bills
          </TabsTrigger>
          <TabsTrigger value="repayments" className="data-[state=active]:bg-white">
            Repayments
          </TabsTrigger>
          <TabsTrigger value="savings" className="data-[state=active]:bg-white">
            Savings
          </TabsTrigger>
          <TabsTrigger value="living" className="data-[state=active]:bg-white">
            Living
          </TabsTrigger>
          <TabsTrigger value="lifestyle" className="data-[state=active]:bg-white">
            Lifestyle
          </TabsTrigger>
        </TabsList>

        {/* All Tab */}
        <TabsContent value="all" className="mt-6 space-y-6">
          {Object.keys(expensesByCategory).length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                <TrendingDown className="h-8 w-8 text-neutral-400" />
              </div>
              <h3 className="text-neutral-900 mb-2">No expenses yet</h3>
              <p className="text-neutral-500 text-sm mb-4">
                Add your first expense to start tracking your spending
              </p>
                <Button size="sm" variant="outline" onClick={() => onCreate()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Expense
                </Button>
            </div>
          ) : (
            Object.entries(expensesByCategory).map(([category, items]) => {
              const categoryTotalMonthly = items.reduce((sum, item) => {
                return sum + calculateMonthlyEquivalent(item.amount, item.frequency);
              }, 0);
              const categoryTotalDisplay = convertToFrequency(categoryTotalMonthly, 'monthly', displayFrequency);

              return (
                <div key={category}>
                  <div className="flex items-baseline justify-between mb-3">
                    <h3 className="text-neutral-700 capitalize font-semibold">{category}</h3>
                    <span className="text-sm text-neutral-500">
                      {items.length} {items.length === 1 ? 'item' : 'items'} • {formatCurrency(categoryTotalDisplay)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((expense) => (
                      <ExpenseItem
                        key={expense.id}
                        subscription={expense}
                        categoryName={category}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        displayFrequency={displayFrequency}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* Individual Category Tabs */}
        {(['subscriptions', 'bills', 'repayments', 'savings', 'living', 'lifestyle'] as ExpenseType[]).map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            {filteredExpenses.length > 0 ? (
              <div className="space-y-2">
                {filteredExpenses.map((expense) => (
                  <ExpenseItem
                    key={expense.id}
                    subscription={expense}
                    categoryName={getCategoryName(expense.categoryId)}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    displayFrequency={displayFrequency}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                  <TrendingDown className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="text-neutral-900 mb-2">No {getExpenseTypeLabelPlural(category)} added yet</h3>
                <p className="text-neutral-500 text-sm mb-4">
                  Add your first {getExpenseTypeLabelSingular(category)} to start tracking
                </p>
                <Button size="sm" variant="outline" onClick={() => onCreate(category)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add {getExpenseTypeLabelSingular(category)}
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Summary card at bottom */}
      {subscriptions.length > 0 && <BudgetSummaryCard subscriptions={subscriptions} />}
    </section>
  );
}

