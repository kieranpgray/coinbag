import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import type { Expense } from '@/types/domain';
import { ExpenseList } from './ExpenseList';
import { calculateMonthlyEquivalent } from '@/features/expenses/utils';
import { filterByExpenseType } from '../utils/filtering';
import { getExpenseTypeLabel, getExpenseTypeLabelPlural, getExpenseTypeLabelSingular, getExpenseTypesFromExpenses, type ExpenseType } from '../utils/expenseTypeMapping';
import { convertToFrequency, getFrequencyLabelForDisplay, type Frequency } from '../utils/frequencyConversion';

interface ExpensesSectionProps {
  expenses: Expense[];
  categoryMap: Map<string, string>;
  accountMap: Map<string, string>;
  uncategorisedId?: string;
  /** When false, empty state prompts income first (surplus needs income). */
  hasIncome: boolean;
  onAddIncome: () => void;
  onCreate: (expenseType?: ExpenseType) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onCategoryChanged?: (
    expense: Expense,
    nextCategoryId: string,
    previousCategoryId: string,
    isRepaymentCategory: boolean
  ) => void;
  frequency: Frequency;
}

/**
 * Expenses section component
 * List only (ExpenseList + tabs). No card view; inline editing retained.
 * Frequency is controlled at page level — no local selector.
 */
export function ExpensesSection({
  expenses,
  categoryMap,
  accountMap,
  uncategorisedId,
  hasIncome,
  onAddIncome,
  onCreate,
  onEdit,
  onDelete,
  onCategoryChanged,
  frequency,
}: ExpensesSectionProps) {
  const { t } = useTranslation('pages');
  const [activeTab, setActiveTab] = useState<ExpenseType | 'all'>('all');

  const totalMonthlyExpenses = useMemo(() => {
    return expenses.reduce((sum, expense) => {
      return sum + calculateMonthlyEquivalent(expense.amount, expense.frequency);
    }, 0);
  }, [expenses]);

  const displayExpenses = convertToFrequency(totalMonthlyExpenses, 'monthly', frequency);

  const availableExpenseTypes = useMemo(() => {
    const types = getExpenseTypesFromExpenses(expenses, categoryMap, uncategorisedId);
    return types.filter(type => {
      const filtered = filterByExpenseType(expenses, type, categoryMap, uncategorisedId);
      return filtered.length > 0;
    });
  }, [expenses, categoryMap, uncategorisedId]);

  const filteredExpenses = useMemo(() => {
    return filterByExpenseType(expenses, activeTab, categoryMap, uncategorisedId);
  }, [expenses, activeTab, categoryMap, uncategorisedId]);

  return (
    <section className="space-y-6" aria-label="Expenses section">
      {/* Header: no icon. Add Expense = primary CTA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-h2-sm sm:text-h2-md lg:text-h2-lg font-medium mb-1">Expenses</h2>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
            <span className="text-balance font-medium text-foreground">
              {formatCurrency(displayExpenses)}
            </span>
            <span className="text-muted-foreground text-body-sm">
              per {getFrequencyLabelForDisplay(frequency)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap"
            onClick={() => onCreate()}
            aria-label="Add expense"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Tabs + ExpenseList only (inline edit retained) */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExpenseType | 'all')} className="w-full">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="all" className="data-[state=active]:bg-background">
            All
          </TabsTrigger>
          {availableExpenseTypes.map((type) => (
            <TabsTrigger key={type} value={type} className="data-[state=active]:bg-background">
              {getExpenseTypeLabel(type)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {expenses.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/20 py-10 px-4 text-center">
              <p className="text-muted-foreground text-body-sm mb-4 text-balance max-w-md mx-auto">
                {hasIncome
                  ? t('emptyStates.budgetNoExpenses.body')
                  : t('emptyStates.budgetNoExpensesNeedIncome.body')}
              </p>
              <Button
                size="sm"
                onClick={() => (hasIncome ? onCreate() : onAddIncome())}
                className="bg-primary text-primary-foreground"
                aria-label={
                  hasIncome ? t('emptyStates.budgetNoExpenses.cta') : t('emptyStates.budgetNoExpensesNeedIncome.cta')
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                {hasIncome ? t('emptyStates.budgetNoExpenses.cta') : t('emptyStates.budgetNoExpensesNeedIncome.cta')}
              </Button>
            </div>
          ) : (
            <ExpenseList
              expenses={expenses}
              categoryMap={categoryMap}
              accountMap={accountMap}
              uncategorisedId={uncategorisedId}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreate={() => onCreate()}
              onCategoryChanged={onCategoryChanged}
              displayFrequency={frequency}
            />
          )}
        </TabsContent>

        {availableExpenseTypes.map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            {filteredExpenses.length > 0 ? (
              <ExpenseList
                expenses={filteredExpenses}
                categoryMap={categoryMap}
                accountMap={accountMap}
                uncategorisedId={uncategorisedId}
                onEdit={onEdit}
                onDelete={onDelete}
                onCreate={() => onCreate(category)}
                onCategoryChanged={onCategoryChanged}
                displayFrequency={frequency}
              />
            ) : (
              <div className="rounded-lg border border-border bg-muted/20 py-10 px-4 text-center">
                <p className="text-muted-foreground text-body-sm mb-4">
                  No {getExpenseTypeLabelPlural(category)} yet. Add one to track.
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
    </section>
  );
}
