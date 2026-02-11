import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIncomes, useCreateIncome, useUpdateIncome, useDeleteIncome } from '@/features/income/hooks';
import { useExpenses } from '@/features/expenses/hooks';
import { useCategories } from '@/features/categories/hooks';
import { useAccounts } from '@/features/accounts/hooks';
import { AccountSelect } from '@/components/shared/AccountSelect';
import { useAccountLinking } from '@/hooks/useAccountLinking';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IncomeSection } from './components/IncomeSection';
import { ExpensesSection } from './components/ExpensesSection';
import { VisualDivider } from './components/VisualDivider';
import { BudgetBreakdown } from './components/BudgetBreakdown';
import { ROUTES } from '@/lib/constants/routes';
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CreateExpenseModal } from '@/features/expenses/components/CreateExpenseModal';
import { EditExpenseModal } from '@/features/expenses/components/EditExpenseModal';
import { DeleteExpenseDialog } from '@/features/expenses/components/DeleteExpenseDialog';
import { findCategoryIdByExpenseType } from './utils/categoryMapping';
import type { ExpenseType } from './utils/expenseTypeMapping';
import { findUncategorisedCategoryId } from '@/data/categories/ensureDefaults';
import { formatCurrency } from '@/lib/utils';

const incomeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  source: z.enum(['Salary', 'Freelance', 'Business', 'Investments', 'Rental', 'Other']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  frequency: z.enum(['weekly', 'fortnightly', 'monthly', 'yearly']),
  nextPaymentDate: z.string().optional().nullable().transform((val) => {
    // Convert empty strings to null for consistency
    return (val === '') ? null : val;
  }),
  paidToAccountId: z.string().uuid('Invalid account selected').optional(),
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
  const { data: accounts = [] } = useAccounts();

  // Mutations
  const createIncomeMutation = useCreateIncome();
  const updateIncomeMutation = useUpdateIncome();
  const deleteIncomeMutation = useDeleteIncome();

  // State
  const [searchParams, setSearchParams] = useSearchParams();
  const [createIncomeModalOpen, setCreateIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null);
  const [createIncomeError, setCreateIncomeError] = useState<string | null>(null);
  const [updateIncomeError, setUpdateIncomeError] = useState<string | null>(null);
  const [createExpenseModalOpen, setCreateExpenseModalOpen] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>(undefined);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  
  // Frequency state
  const [breakdownFrequency, setBreakdownFrequency] = useState<Frequency>('monthly');
  const [incomeFrequency, setIncomeFrequency] = useState<Frequency | undefined>(undefined);
  const [expensesFrequency, setExpensesFrequency] = useState<Frequency | undefined>(undefined);

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

  // Create account map for quick lookups
  const accountMap = useMemo(() => {
    return new Map(accounts.map((a) => [a.id, a.accountName]));
  }, [accounts]);

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

  // Use custom hook for account linking state management
  const {
    isAccountBeingCreated,
    linkedAccountIdRef,
    handleAccountChange,
    handleAccountCreationStateChange,
    getFinalAccountId,
    shouldPreventSubmission,
  } = useAccountLinking(editingIncome?.paidToAccountId);

  // Form handling for income
  const {
    register: registerIncome,
    handleSubmit: handleSubmitIncome,
    formState: { errors: incomeErrors },
    reset: resetIncome,
    setValue: setIncomeValue,
    watch: watchIncome,
    control,
  } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      name: '',
      source: 'Salary',
      amount: 0,
      frequency: 'monthly',
      nextPaymentDate: undefined,
      paidToAccountId: undefined,
    },
  });

  const watchedSource = watchIncome('source') || '';
  const watchedFrequency = watchIncome('frequency') || '';
  const watchedPaidToAccountId = watchIncome('paidToAccountId') || '';

  // Sync ref with defaultValues (for editing existing income)
  useEffect(() => {
    if (editingIncome?.paidToAccountId) {
      linkedAccountIdRef.current = editingIncome.paidToAccountId;
    }
  }, [editingIncome?.paidToAccountId]);

  // Clear errors when income modals open
  useEffect(() => {
    if (createIncomeModalOpen) {
      setCreateIncomeError(null);
    }
  }, [createIncomeModalOpen]);

  // Income handlers
  const handleCreateIncome = (data: IncomeFormData) => {
    const finalAccountId = getFinalAccountId(data.paidToAccountId);

    // Keep null as null (don't convert to undefined) so repository can include it in insert
    // Type assertion needed because Income type uses string | undefined, but schema accepts null
    const payload = {
      ...data,
      nextPaymentDate: data.nextPaymentDate ?? null,
      paidToAccountId: finalAccountId,
    } as Omit<Income, 'id'>;

    createIncomeMutation.mutate(payload, {
      onSuccess: () => {
        setCreateIncomeModalOpen(false);
        setCreateIncomeError(null);
        resetIncome();
      },
      onError: () => {
        setCreateIncomeError('Failed to create income');
      },
    });
  };

  const handleEditIncome = (income: Income) => {
    setEditingIncome(income);
    setUpdateIncomeError(null); // Clear any previous errors
    resetIncome({
      name: income.name,
      source: income.source,
      amount: income.amount,
      frequency: income.frequency,
      nextPaymentDate: income.nextPaymentDate ? format(new Date(income.nextPaymentDate), 'yyyy-MM-dd') : undefined,
      paidToAccountId: income.paidToAccountId,
    });
  };

  const handleUpdateIncome = (data: IncomeFormData) => {
    if (!editingIncome) return;

    const finalAccountId = getFinalAccountId(data.paidToAccountId);

    // Keep null as null (don't convert to undefined) so repository can include it in update
    // Type assertion needed because Income type uses string | undefined, but schema accepts null
    const updateData = {
      ...data,
      nextPaymentDate: data.nextPaymentDate ?? null,
      paidToAccountId: finalAccountId
    } as Partial<Income>;

    updateIncomeMutation.mutate(
      {
        id: editingIncome.id,
        data: updateData
      },
      {
        onSuccess: () => {
          setEditingIncome(null);
          setUpdateIncomeError(null);
          resetIncome();
        },
      onError: () => {
        setUpdateIncomeError('Failed to update income');
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
      {/* Budget Header: title + Plan transfers link */}
      <div className="flex items-center justify-between">
        <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold tracking-tight">Budget</h1>
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
          <Link to={ROUTES.app.transfers}>
            Plan transfers
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Optional Remaining strip — reduces busyness, not hero */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
        <span className="text-body-sm text-muted-foreground">Remaining</span>
        <span className={`text-body-lg font-semibold ${remaining >= 0 ? 'text-success' : 'text-error'}`}>
          {remaining >= 0 ? '' : '-'}{formatCurrency(Math.abs(remaining))}
        </span>
      </div>

      {/* In and Out */}
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
          accountMap={accountMap}
          onCreate={() => setCreateIncomeModalOpen(true)}
          onEdit={handleEditIncome}
          onDelete={handleDeleteIncome}
          parentFrequency={breakdownFrequency}
          onFrequencyChange={setIncomeFrequency}
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
          accountMap={accountMap}
          uncategorisedId={uncategorisedId}
          onCreate={handleCreateExpense}
          onEdit={handleEditExpense}
          onDelete={handleDeleteExpense}
          parentFrequency={breakdownFrequency}
          onFrequencyChange={setExpensesFrequency}
        />
      )}

      {/* Income Create Modal */}
      <Dialog
        open={createIncomeModalOpen}
        onOpenChange={(open) => {
          setCreateIncomeModalOpen(open);
          if (!open) {
            // Reset form when closing
            resetIncome();
            setCreateIncomeError(null);
          } else if (!editingIncome) {
            // Reset form when opening for new income (not editing)
            resetIncome();
            setCreateIncomeError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Income Source</DialogTitle>
            <DialogDescription>Add a new source of income to track your earnings.</DialogDescription>
          </DialogHeader>
          {createIncomeError && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-destructive">Error</AlertTitle>
              <AlertDescription className="text-destructive">{createIncomeError}</AlertDescription>
            </Alert>
          )}
          <form
            onSubmit={(e) => {
              if (shouldPreventSubmission()) {
                e.preventDefault();
                return;
              }
              handleSubmitIncome(handleCreateIncome)(e);
            }}
            className={`space-y-4 ${isAccountBeingCreated ? 'opacity-60 pointer-events-none' : ''}`}
          >
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
                  <Controller
                name="nextPaymentDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    id="nextPaymentDate"
                    value={field.value || undefined} // ISO format from form state, convert null to undefined
                    onChange={(e) => {
                      // DatePicker emits ISO format in e.target.value
                      field.onChange(e.target.value);
                    }}
                    shouldShowCalendarButton
                    allowClear={true}
                    placeholder="No next payment date (optional)"
                  />
                )}
              />
              {incomeErrors.nextPaymentDate && (
                <p id="nextPaymentDate-error" className="text-sm text-destructive" role="alert">
                  {incomeErrors.nextPaymentDate.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">Optional: Leave empty if payment date is unknown</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidToAccountId">Paid to (Optional)</Label>
              <AccountSelect
                id="paidToAccountId"
                value={watchedPaidToAccountId}
                onChange={(value) => {
                  setIncomeValue('paidToAccountId', value);
                  handleAccountChange(value);
                }}
                onAccountCreationStateChange={handleAccountCreationStateChange}
                onAccountCreationError={(_error) => {
                  // Handle account creation errors if needed
                }}
                placeholder="Select account this income is paid to"
                error={incomeErrors.paidToAccountId?.message}
                context="income"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setCreateIncomeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createIncomeMutation.isPending || isAccountBeingCreated}>
                {createIncomeMutation.isPending ? 'Adding...' : isAccountBeingCreated ? 'Creating Account...' : 'Add Income'}
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
            {updateIncomeError && (
              <Alert className="border-destructive bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-destructive">Error</AlertTitle>
                <AlertDescription className="text-destructive">{updateIncomeError}</AlertDescription>
              </Alert>
            )}
            <form
              onSubmit={(e) => {
                if (shouldPreventSubmission()) {
                  e.preventDefault();
                  return;
                }
                handleSubmitIncome(handleUpdateIncome)(e);
              }}
              className={`space-y-4 ${isAccountBeingCreated ? 'opacity-60 pointer-events-none' : ''}`}
            >
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
                <Controller
                  name="nextPaymentDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      id="edit-nextPaymentDate"
                      value={field.value || undefined} // ISO format from form state, convert null to undefined
                      onChange={(e) => {
                        // DatePicker emits ISO format in e.target.value
                        field.onChange(e.target.value);
                      }}
                      shouldShowCalendarButton
                      allowClear={true}
                      placeholder="No next payment date (optional)"
                    />
                  )}
                />
                {incomeErrors.nextPaymentDate && (
                  <p id="edit-nextPaymentDate-error" className="text-sm text-destructive" role="alert">
                    {incomeErrors.nextPaymentDate.message}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Optional: Leave empty if payment date is unknown</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-paidToAccountId">Paid to (Optional)</Label>
                <AccountSelect
                  id="edit-paidToAccountId"
                  value={watchedPaidToAccountId}
                  onChange={(value) => {
                    setIncomeValue('paidToAccountId', value);
                    handleAccountChange(value);
                  }}
                  onAccountCreationStateChange={handleAccountCreationStateChange}
                  onAccountCreationError={(_error) => {
                    // Handle account creation errors if needed
                  }}
                  placeholder="Select account this income is paid to"
                  error={incomeErrors.paidToAccountId?.message}
                  context="income"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingIncome(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateIncomeMutation.isPending || isAccountBeingCreated}>
                  {updateIncomeMutation.isPending ? 'Saving...' : isAccountBeingCreated ? 'Creating Account...' : 'Save Changes'}
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

