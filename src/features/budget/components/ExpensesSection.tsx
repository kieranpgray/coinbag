import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import type { Expense } from '@/types/domain';
import { ExpenseList } from './ExpenseList';
import { calculateMonthlyEquivalent } from '@/features/expenses/utils';
import { filterByExpenseType } from '../utils/filtering';
import { getExpenseTypeLabel, getExpenseTypeLabelPlural, getExpenseTypeLabelSingular, getExpenseTypesFromExpenses, type ExpenseType } from '../utils/expenseTypeMapping';
import { convertToFrequency, getFrequencyLabelForDisplay, type Frequency, FREQUENCY_OPTIONS } from '../utils/frequencyConversion';

interface ExpensesSectionProps {
  expenses: Expense[];
  categoryMap: Map<string, string>;
  accountMap: Map<string, string>;
  uncategorisedId?: string;
  onCreate: (expenseType?: ExpenseType) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  parentFrequency?: Frequency;
  onFrequencyChange?: (frequency: Frequency) => void;
}

/**
 * Expenses section component
 * List only (ExpenseList + tabs). No card view; inline editing retained.
 */
export function ExpensesSection({
  expenses,
  categoryMap,
  accountMap,
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

  useEffect(() => {
    if (parentFrequency !== undefined) {
      if (!hasManualOverride.current) {
        setLocalFrequency(parentFrequency);
      } else if (localFrequency === parentFrequency) {
        hasManualOverride.current = false;
      }
    }
  }, [parentFrequency, localFrequency]);

  const totalMonthlyExpenses = useMemo(() => {
    return expenses.reduce((sum, expense) => {
      return sum + calculateMonthlyEquivalent(expense.amount, expense.frequency);
    }, 0);
  }, [expenses]);

  const displayFrequency = localFrequency || parentFrequency || 'monthly';
  const displayExpenses = convertToFrequency(totalMonthlyExpenses, 'monthly', displayFrequency);

  const handleFrequencyChange = (frequency: Frequency) => {
    setLocalFrequency(frequency);
    hasManualOverride.current = true;
    onFrequencyChange?.(frequency);
  };

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
          <h2 className="text-foreground text-h2-sm sm:text-h2-md lg:text-h2-lg font-semibold mb-1">Expenses</h2>
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
            <span className="text-balance font-bold text-foreground">
              {formatCurrency(displayExpenses)}
            </span>
            <span className="text-muted-foreground text-body-sm">
              per {getFrequencyLabelForDisplay(displayFrequency)}
            </span>
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
              <p className="text-muted-foreground text-body-sm mb-4">
                Add expenses to see your total spend and remaining budget.
              </p>
              <Button size="sm" onClick={() => onCreate()} className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Add expense
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
              displayFrequency={displayFrequency}
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
                displayFrequency={displayFrequency}
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

