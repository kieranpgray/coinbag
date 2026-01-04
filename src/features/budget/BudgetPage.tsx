import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIncomes, useCreateIncome, useUpdateIncome, useDeleteIncome } from '@/features/income/hooks';
import { useExpenses } from '@/features/expenses/hooks';
import { useCategories } from '@/features/categories/hooks';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { IncomeSection } from './components/IncomeSection';
import { ExpensesSection } from './components/ExpensesSection';
import { VisualDivider } from './components/VisualDivider';
import { BudgetBreakdown } from './components/BudgetBreakdown';
import { calculateMonthlyIncome } from './utils/calculations';
import { filterByExpenseType } from './utils/filtering';
import { calculateMonthlyEquivalent } from '@/features/expenses/utils';
import { type Frequency } from './utils/frequencyConversion';
import type { Income } from '@/types/domain';
import type { Expense } from '@/types/domain';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CreateExpenseModal } from '@/features/expenses/components/CreateExpenseModal';
import { EditExpenseModal } from '@/features/expenses/components/EditExpenseModal';
import { DeleteExpenseDialog } from '@/features/expenses/components/DeleteExpenseDialog';
import { findCategoryIdByExpenseType } from './utils/categoryMapping';
import type { ExpenseType } from './utils/expenseTypeMapping';
import { findUncategorisedCategoryId } from '@/data/categories/ensureDefaults';

const incomeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  source: z.enum(['Salary', 'Freelance', 'Business', 'Investments', 'Rental', 'Other']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  frequency: z.enum(['weekly', 'fortnightly', 'monthly', 'yearly']),
  nextPaymentDate: z.string().min(1, 'Next payment date is required'),
  notes: z.string().optional(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

/**
 * Budget page component
 * Unified view for income and expenses
 */
export function BudgetPage() {
  // Data hooks
  const { data: incomes = [], isLoading: incomesLoading, error: incomesError, refetch: refetchIncomes } = useIncomes();
  const { data: expenses = [], isLoading: expensesLoading, error: expensesError, refetch: refetchExpenses } = useExpenses();
  const { data: categories = [] } = useCategories();

  // Mutations
  const createIncomeMutation = useCreateIncome();
  const updateIncomeMutation = useUpdateIncome();
  const deleteIncomeMutation = useDeleteIncome();

  // State
  const [searchParams, setSearchParams] = useSearchParams();
  const [createIncomeModalOpen, setCreateIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null);
  const [createExpenseModalOpen, setCreateExpenseModalOpen] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>(undefined);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  
  // Frequency state
  const [breakdownFrequency, setBreakdownFrequency] = useState<Frequency>('monthly');
  const [incomeFrequency, setIncomeFrequency] = useState<Frequency | undefined>(undefined);
  const [expensesFrequency, setExpensesFrequency] = useState<Frequency | undefined>(undefined);
  
  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');

  // Handle query params for auto-opening create modal
  useEffect(() => {
    const shouldCreate = searchParams.get('create');
    if (shouldCreate === 'income') {
      setCreateIncomeModalOpen(true);
      setSearchParams({});
    } else if (shouldCreate === 'expense' || shouldCreate === 'subscription') {
      setCreateExpenseModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Create category map for quick lookups
  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c.name]));
  }, [categories]);

  // Get Uncategorised category ID for fallback handling
  const uncategorisedId = useMemo(() => {
    return findUncategorisedCategoryId(categories);
  }, [categories]);

  // Calculate totals (memoized)
  const totalMonthlyIncome = useMemo(() => {
    return calculateMonthlyIncome(incomes);
  }, [incomes]);

  // Calculate separate totals for savings, repayments, subscriptions, and all expenses
  const totalMonthlySavings = useMemo(() => {
    const savingsExpenses = filterByExpenseType(expenses, 'savings', categoryMap, uncategorisedId);
    return savingsExpenses.reduce((sum, expense) => {
      return sum + calculateMonthlyEquivalent(expense.amount, expense.frequency);
    }, 0);
  }, [expenses, categoryMap, uncategorisedId]);

  const totalMonthlyRepayments = useMemo(() => {
    const repaymentsExpenses = filterByExpenseType(expenses, 'repayments', categoryMap, uncategorisedId);
    return repaymentsExpenses.reduce((sum, expense) => {
      return sum + calculateMonthlyEquivalent(expense.amount, expense.frequency);
    }, 0);
  }, [expenses, categoryMap, uncategorisedId]);


  // Calculate total monthly expenses (ALL expenses dynamically - no hardcoded types)
  const totalMonthlyExpenses = useMemo(() => {
    // Sum ALL expenses dynamically - this ensures future expense types are automatically included
    return expenses.reduce((sum, expense) => {
      return sum + calculateMonthlyEquivalent(expense.amount, expense.frequency);
    }, 0);
  }, [expenses]);

  // Form handling for income
  const {
    register: registerIncome,
    handleSubmit: handleSubmitIncome,
    formState: { errors: incomeErrors },
    reset: resetIncome,
    setValue: setIncomeValue,
    watch: watchIncome,
  } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      name: '',
      source: 'Salary',
      amount: 0,
      frequency: 'monthly',
      nextPaymentDate: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    },
  });

  const watchedSource = watchIncome('source') || '';
  const watchedFrequency = watchIncome('frequency') || '';

  // Income handlers
  const handleCreateIncome = (data: IncomeFormData) => {
    createIncomeMutation.mutate(data, {
      onSuccess: () => {
        setCreateIncomeModalOpen(false);
        resetIncome();
      },
    });
  };

  const handleEditIncome = (income: Income) => {
    setEditingIncome(income);
    resetIncome({
      name: income.name,
      source: income.source,
      amount: income.amount,
      frequency: income.frequency,
      nextPaymentDate: format(new Date(income.nextPaymentDate), 'yyyy-MM-dd'),
      notes: income.notes || '',
    });
  };

  const handleUpdateIncome = (data: IncomeFormData) => {
    if (!editingIncome) return;
    updateIncomeMutation.mutate(
      { id: editingIncome.id, data },
      {
        onSuccess: () => {
          setEditingIncome(null);
          resetIncome();
        },
      }
    );
  };

  const handleDeleteIncome = (income: Income) => {
    setDeletingIncome(income);
  };

  const handleConfirmDeleteIncome = () => {
    if (!deletingIncome) return;
    deleteIncomeMutation.mutate(deletingIncome.id, {
      onSuccess: () => {
        setDeletingIncome(null);
      },
    });
  };

  // Expense handlers
  const handleCreateExpense = (expenseType?: ExpenseType) => {
    // Find matching category for the expense type
    const categoryId = expenseType && categories.length > 0
      ? findCategoryIdByExpenseType(expenseType, categories)
      : undefined;
    
    setDefaultCategoryId(categoryId);
    setCreateExpenseModalOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
  };

  const handleDeleteExpense = (expense: Expense) => {
    setDeletingExpense(expense);
  };

  // Loading state
  const isLoading = incomesLoading || expensesLoading;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-14 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error states (show available data even if one section fails)
  const hasIncomesError = !!incomesError;
  const hasExpensesError = !!expensesError;

  // Calculate remaining budget (income - all expenses)
  const remaining = totalMonthlyIncome - totalMonthlyExpenses;

  return (
    <div className="space-y-12">
      {/* Budget Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Budget</h1>
        <div className="flex items-center gap-3">
          <Label htmlFor="view-mode-budget" className="text-sm text-muted-foreground">
            List view
          </Label>
          <Switch
            id="view-mode-budget"
            checked={viewMode === 'cards'}
            onCheckedChange={(checked) => setViewMode(checked ? 'cards' : 'list')}
            aria-label="Toggle between list view and card view"
          />
          <Label htmlFor="view-mode-budget" className="text-sm text-muted-foreground">
            Card view
          </Label>
        </div>
      </div>

      {/* Budget Breakdown */}
      <BudgetBreakdown
        totalIncome={totalMonthlyIncome}
        totalExpenses={totalMonthlyExpenses}
        totalSavings={totalMonthlySavings}
        totalRepayments={totalMonthlyRepayments}
        remaining={remaining}
        frequency={breakdownFrequency}
        onFrequencyChange={(frequency) => {
          setBreakdownFrequency(frequency);
          // Reset child frequencies if they match the old breakdown frequency (to allow sync)
          if (incomeFrequency === breakdownFrequency || incomeFrequency === undefined) {
            setIncomeFrequency(undefined);
          }
          if (expensesFrequency === breakdownFrequency || expensesFrequency === undefined) {
            setExpensesFrequency(undefined);
          }
        }}
      />

      {/* Income Section */}
      {hasIncomesError ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load income</AlertTitle>
          <AlertDescription className="mt-2">
            We couldn't load your income sources. Please try again.
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchIncomes()}
            className="mt-4"
            disabled={incomesLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${incomesLoading ? 'animate-spin' : ''}`} />
            Try again
          </Button>
        </Alert>
      ) : (
        <IncomeSection
          totalIncome={totalMonthlyIncome}
          incomeSources={incomes}
          onCreate={() => setCreateIncomeModalOpen(true)}
          onEdit={handleEditIncome}
          onDelete={handleDeleteIncome}
          parentFrequency={breakdownFrequency}
          onFrequencyChange={setIncomeFrequency}
          viewMode={viewMode}
        />
      )}

      {/* Visual Divider */}
      <VisualDivider />

      {/* Expenses Section */}
      {hasExpensesError ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load expenses</AlertTitle>
          <AlertDescription className="mt-2">
            We couldn't load your expenses. Please try again.
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchExpenses()}
            className="mt-4"
            disabled={expensesLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${expensesLoading ? 'animate-spin' : ''}`} />
            Try again
          </Button>
        </Alert>
      ) : (
        <ExpensesSection
          expenses={expenses}
          categoryMap={categoryMap}
          uncategorisedId={uncategorisedId}
          onCreate={handleCreateExpense}
          onEdit={handleEditExpense}
          onDelete={handleDeleteExpense}
          parentFrequency={breakdownFrequency}
          onFrequencyChange={setExpensesFrequency}
          viewMode={viewMode}
        />
      )}

      {/* Income Create Modal */}
      <Dialog open={createIncomeModalOpen} onOpenChange={setCreateIncomeModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Income Source</DialogTitle>
            <DialogDescription>Add a new source of income to track your earnings.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitIncome(handleCreateIncome)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  aria-invalid={incomeErrors.name ? 'true' : 'false'}
                  aria-describedby={incomeErrors.name ? 'name-error' : undefined}
                  className={incomeErrors.name ? 'border-destructive' : ''}
                  {...registerIncome('name')}
                  placeholder="e.g., Main Salary"
                />
                {incomeErrors.name && (
                  <p id="name-error" className="text-sm text-destructive" role="alert">
                    {incomeErrors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <SearchableSelect
                  id="source"
                  value={watchedSource}
                  onValueChange={(value) => setIncomeValue('source', value as Income['source'])}
                  options={[
                    { value: 'Salary', label: 'Salary' },
                    { value: 'Freelance', label: 'Freelance' },
                    { value: 'Business', label: 'Business' },
                    { value: 'Investments', label: 'Investments' },
                    { value: 'Rental', label: 'Rental' },
                    { value: 'Other', label: 'Other' },
                  ]}
                  placeholder="Select source"
                  error={incomeErrors.source?.message}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  clearOnFocus
                  clearValue={0}
                  aria-invalid={incomeErrors.amount ? 'true' : 'false'}
                  aria-describedby={incomeErrors.amount ? 'amount-error' : undefined}
                  className={incomeErrors.amount ? 'border-destructive' : ''}
                  {...registerIncome('amount', { valueAsNumber: true })}
                />
                {incomeErrors.amount && (
                  <p id="amount-error" className="text-sm text-destructive" role="alert">
                    {incomeErrors.amount.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <SearchableSelect
                  id="frequency"
                  value={watchedFrequency}
                  onValueChange={(value) => setIncomeValue('frequency', value as Income['frequency'])}
                  options={[
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'fortnightly', label: 'Fortnightly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly', label: 'Yearly' },
                  ]}
                  placeholder="Select frequency"
                  error={incomeErrors.frequency?.message}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextPaymentDate">Next Payment Date</Label>
              <DatePicker
                id="nextPaymentDate"
                shouldShowCalendarButton
                {...(() => {
                  const { disabled, ...registerProps } = registerIncome('nextPaymentDate');
                  return registerProps;
                })()}
              />
              {incomeErrors.nextPaymentDate && (
                <p id="nextPaymentDate-error" className="text-sm text-destructive" role="alert">
                  {incomeErrors.nextPaymentDate.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea id="notes" {...registerIncome('notes')} placeholder="Any additional notes" rows={3} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setCreateIncomeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createIncomeMutation.isPending}>
                {createIncomeMutation.isPending ? 'Adding...' : 'Add Income'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Income Edit Modal */}
      {editingIncome && (
        <Dialog open={!!editingIncome} onOpenChange={(open) => !open && setEditingIncome(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Income Source</DialogTitle>
              <DialogDescription>Update your income source details.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitIncome(handleUpdateIncome)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    aria-invalid={incomeErrors.name ? 'true' : 'false'}
                    aria-describedby={incomeErrors.name ? 'edit-name-error' : undefined}
                    className={incomeErrors.name ? 'border-destructive' : ''}
                    {...registerIncome('name')}
                  />
                  {incomeErrors.name && (
                    <p id="edit-name-error" className="text-sm text-destructive" role="alert">
                      {incomeErrors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-source">Source</Label>
                  <SearchableSelect
                    id="edit-source"
                    value={watchedSource}
                    onValueChange={(value) => setIncomeValue('source', value as Income['source'])}
                    options={[
                      { value: 'Salary', label: 'Salary' },
                      { value: 'Freelance', label: 'Freelance' },
                      { value: 'Business', label: 'Business' },
                      { value: 'Investments', label: 'Investments' },
                      { value: 'Rental', label: 'Rental' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    placeholder="Select source"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount ($)</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    clearOnFocus
                    clearValue={0}
                    aria-invalid={incomeErrors.amount ? 'true' : 'false'}
                    aria-describedby={incomeErrors.amount ? 'edit-amount-error' : undefined}
                    className={incomeErrors.amount ? 'border-destructive' : ''}
                    {...registerIncome('amount', { valueAsNumber: true })}
                  />
                  {incomeErrors.amount && (
                    <p id="edit-amount-error" className="text-sm text-destructive" role="alert">
                      {incomeErrors.amount.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-frequency">Frequency</Label>
                  <SearchableSelect
                    id="edit-frequency"
                    value={watchedFrequency}
                    onValueChange={(value) => setIncomeValue('frequency', value as Income['frequency'])}
                    options={[
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'fortnightly', label: 'Fortnightly' },
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'yearly', label: 'Yearly' },
                    ]}
                    placeholder="Select frequency"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nextPaymentDate">Next Payment Date</Label>
                <DatePicker
                  id="edit-nextPaymentDate"
                  shouldShowCalendarButton
                  {...(() => {
                    const { disabled, ...registerProps } = registerIncome('nextPaymentDate');
                    return registerProps;
                  })()}
                />
                {incomeErrors.nextPaymentDate && (
                  <p id="edit-nextPaymentDate-error" className="text-sm text-destructive" role="alert">
                    {incomeErrors.nextPaymentDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes (Optional)</Label>
                <Textarea id="edit-notes" {...registerIncome('notes')} rows={3} />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingIncome(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateIncomeMutation.isPending}>
                  {updateIncomeMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Income Delete Dialog */}
      {deletingIncome && (
        <Dialog open={!!deletingIncome} onOpenChange={(open) => !open && setDeletingIncome(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Income Source</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingIncome.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setDeletingIncome(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDeleteIncome} disabled={deleteIncomeMutation.isPending}>
                {deleteIncomeMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Expense Modals */}
      <CreateExpenseModal
        open={createExpenseModalOpen}
        onOpenChange={(open) => {
          setCreateExpenseModalOpen(open);
          if (!open) {
            // Clear default category when modal closes
            setDefaultCategoryId(undefined);
          }
        }}
        defaultCategoryId={defaultCategoryId}
      />

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          open={!!editingExpense}
          onOpenChange={(open) => {
            if (!open) setEditingExpense(null);
          }}
        />
      )}

      {deletingExpense && (
        <DeleteExpenseDialog
          expense={deletingExpense}
          open={!!deletingExpense}
          onOpenChange={(open) => {
            if (!open) setDeletingExpense(null);
          }}
        />
      )}
    </div>
  );
}

