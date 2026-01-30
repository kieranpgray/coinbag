import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIncomes, useCreateIncome, useUpdateIncome, useDeleteIncome } from '@/features/income/hooks';
import { useAccounts } from '@/features/accounts/hooks';
import { useViewMode } from '@/hooks/useViewMode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { RefreshCw, AlertTriangle, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { IncomeCard } from '@/features/income/components/IncomeCard';
import { IncomeList } from '@/features/income/components/IncomeList';
import { ViewModeToggle } from '@/components/shared/ViewModeToggle';
import type { Income } from '@/types/domain';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { AccountSelect } from '@/components/shared/AccountSelect';
import { useAccountLinking } from '@/hooks/useAccountLinking';

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

export function IncomePage() {
  const { data: incomes = [], isLoading, error, refetch } = useIncomes();
  const { data: accounts = [] } = useAccounts();
  const createMutation = useCreateIncome();
  const updateMutation = useUpdateIncome();
  const deleteMutation = useDeleteIncome();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useViewMode();

  // Create account map for quick lookups
  const accountMap = useMemo(() => {
    return new Map(accounts.map((a) => [a.id, a.accountName]));
  }, [accounts]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Use custom hook for account linking state management
  const {
    isAccountBeingCreated,
    linkedAccountIdRef,
    handleAccountChange,
    handleAccountCreationStateChange,
    getFinalAccountId,
    shouldPreventSubmission,
  } = useAccountLinking(editingIncome?.paidToAccountId);

  // Handle query params for auto-opening create modal
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === '1';
    if (shouldCreate) {
      setCreateModalOpen(true);
      // Clear the query params after processing
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Clear errors when modals open
  useEffect(() => {
    if (createModalOpen) {
      setCreateError(null);
    }
  }, [createModalOpen]);

  // Sync ref with defaultValues (for editing existing income)
  useEffect(() => {
    if (editingIncome?.paidToAccountId) {
      linkedAccountIdRef.current = editingIncome.paidToAccountId;
    }
  }, [editingIncome?.paidToAccountId]);

  // Calculate total monthly income
  const totalMonthlyIncome = useMemo(() => {
    return incomes.reduce((sum, income) => {
      const multiplier = {
        weekly: 52 / 12,
        fortnightly: 26 / 12,
        monthly: 1,
        yearly: 1 / 12,
      }[income.frequency];
      return sum + income.amount * multiplier;
    }, 0);
  }, [incomes]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
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

  const watchedSource = watch('source') || ''; // Ensure always defined for controlled Select
  const watchedFrequency = watch('frequency') || ''; // Ensure always defined for controlled Select
  const watchedPaidToAccountId = watch('paidToAccountId') || ''; // Ensure always defined for controlled Select

  const handleCreate = (data: IncomeFormData) => {
    const finalAccountId = getFinalAccountId(data.paidToAccountId);

    // Keep null as null (don't convert to undefined) so repository can include it in insert
    // Type assertion needed because Income type uses string | undefined, but schema accepts null
    const payload = {
      ...data,
      nextPaymentDate: data.nextPaymentDate ?? null,
      paidToAccountId: finalAccountId,
    } as Omit<Income, 'id'>;

    createMutation.mutate(payload, {
      onSuccess: () => {
        setCreateModalOpen(false);
        setCreateError(null);
        reset();
      },
      onError: (error: any) => {
        setCreateError(error?.error || 'Failed to create income');
      },
    });
  };

  const handleEdit = (income: Income) => {
    // Safely format the date (optional field)
    let formattedDate: string | undefined;
    if (income.nextPaymentDate) {
      try {
        const dateObj = new Date(income.nextPaymentDate);
        if (isNaN(dateObj.getTime())) {
          // If invalid date, leave undefined (optional)
          formattedDate = undefined;
        } else {
          formattedDate = format(dateObj, 'yyyy-MM-dd');
        }
      } catch (error) {
        formattedDate = undefined;
      }
    }

    setEditingIncome(income);
    setUpdateError(null); // Clear any previous errors
    reset({
      name: income.name,
      source: income.source,
      amount: income.amount,
      frequency: income.frequency,
      nextPaymentDate: formattedDate,
      paidToAccountId: income.paidToAccountId,
    });
  };

  const handleUpdate = (data: IncomeFormData) => {
    if (!editingIncome) return;

    const finalAccountId = getFinalAccountId(data.paidToAccountId);

    // Keep null as null (don't convert to undefined) so repository can include it in update
    // Type assertion needed because Income type uses string | undefined, but schema accepts null
    const updateData = {
      ...data,
      nextPaymentDate: data.nextPaymentDate ?? null,
      paidToAccountId: finalAccountId
    } as Partial<Income>;

    updateMutation.mutate(
      {
        id: editingIncome.id,
        data: updateData
      },
      {
        onSuccess: () => {
          setEditingIncome(null);
          setUpdateError(null);
          reset();
        },
        onError: (error: any) => {
          setUpdateError(error?.error || 'Failed to update income');
        },
      }
    );
  };

  const handleDelete = (income: Income) => {
    setDeletingIncome(income);
  };

  const handleConfirmDelete = () => {
    if (!deletingIncome) return;
    deleteMutation.mutate(deletingIncome.id, {
      onSuccess: () => {
        setDeletingIncome(null);
      },
    });
  };

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold tracking-tight">Income</h1>
            <div className="space-y-0.5">
              <div className="text-data-lg-sm sm:text-data-lg-md lg:text-data-lg-lg font-bold mb-4">
                {formatCurrency(totalMonthlyIncome)}
              </div>
              <p className="text-sm text-muted-foreground">Total monthly income</p>
            </div>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Income
          </Button>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load income</AlertTitle>
          <AlertDescription className="mt-2">
            We couldn't load your income sources. Please try again.
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Try again
          </Button>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Skeleton className="h-9 w-32" />
            <div className="space-y-0.5">
              <Skeleton className="h-9 w-48 mb-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Total Value */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold tracking-tight">Income</h1>
          <div className="space-y-0.5">
            <div className="text-data-lg-sm sm:text-data-lg-md lg:text-data-lg-lg font-bold mb-4">
              {formatCurrency(totalMonthlyIncome)}
            </div>
            <p className="text-sm text-muted-foreground">Total monthly income</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-4">
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Income
          </Button>
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {/* Content based on view mode */}
      <div className="mt-4">
        {viewMode === 'list' ? (
          <IncomeList
            incomes={incomes}
            accountMap={accountMap}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCreate={() => setCreateModalOpen(true)}
          />
        ) : (
          incomes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    No income sources found. Add your first income source to track your earnings.
                  </p>
                  <Button
                    onClick={() => setCreateModalOpen(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Income Source
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {incomes.map((income) => (
                <IncomeCard
                  key={income.id}
                  income={income}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Income Source</DialogTitle>
            <DialogDescription>Add a new source of income to track your earnings.</DialogDescription>
          </DialogHeader>
          {createError && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-destructive">Error</AlertTitle>
              <AlertDescription className="text-destructive">{createError}</AlertDescription>
            </Alert>
          )}
          <form
            onSubmit={(e) => {
              if (shouldPreventSubmission()) {
                e.preventDefault();
                return;
              }
              handleSubmit(handleCreate)(e);
            }}
            className={`space-y-4 ${isAccountBeingCreated ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  aria-invalid={errors.name ? 'true' : 'false'}
                  aria-describedby={errors.name ? 'name-error' : undefined}
                  className={errors.name ? 'border-destructive' : ''}
                  {...register('name')}
                  placeholder="e.g., Main Salary"
                />
                {errors.name && (
                  <p id="name-error" className="text-sm text-destructive" role="alert">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <SearchableSelect
                  id="source"
                  value={watchedSource}
                  onValueChange={(value) => setValue('source', value as Income['source'])}
                  options={[
                    { value: 'Salary', label: 'Salary' },
                    { value: 'Freelance', label: 'Freelance' },
                    { value: 'Business', label: 'Business' },
                    { value: 'Investments', label: 'Investments' },
                    { value: 'Rental', label: 'Rental' },
                    { value: 'Other', label: 'Other' },
                  ]}
                  placeholder="Select source"
                  error={errors.source?.message}
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
                  aria-invalid={errors.amount ? 'true' : 'false'}
                  aria-describedby={errors.amount ? 'amount-error' : undefined}
                  className={errors.amount ? 'border-destructive' : ''}
                  {...register('amount', { valueAsNumber: true })} 
                />
                {errors.amount && (
                  <p id="amount-error" className="text-sm text-destructive" role="alert">
                    {errors.amount.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <SearchableSelect
                  id="frequency"
                  value={watchedFrequency}
                  onValueChange={(value) => setValue('frequency', value as Income['frequency'])}
                  options={[
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'fortnightly', label: 'Fortnightly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'quarterly', label: 'Quarterly' },
                    { value: 'yearly', label: 'Yearly' },
                  ]}
                  placeholder="Select frequency"
                  error={errors.frequency?.message}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextPaymentDate">Next Payment Date</Label>
              <DatePicker
                id="nextPaymentDate"
                shouldShowCalendarButton
                allowClear={true}
                placeholder="No next payment date (optional)"
                {...register('nextPaymentDate')}
              />
              {errors.nextPaymentDate && (
                <p id="nextPaymentDate-error" className="text-sm text-destructive" role="alert">
                  {errors.nextPaymentDate.message}
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
                  setValue('paidToAccountId', value);
                  handleAccountChange(value);
                }}
                onAccountCreationStateChange={handleAccountCreationStateChange}
                onAccountCreationError={(_error) => {
                  // Handle account creation errors if needed
                }}
                placeholder="Select account this income is paid to"
                error={errors.paidToAccountId?.message}
                context="income"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || isAccountBeingCreated}>
                {createMutation.isPending ? 'Adding...' : isAccountBeingCreated ? 'Creating Account...' : 'Add Income'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {editingIncome && (
        <Dialog open={!!editingIncome} onOpenChange={(open) => !open && setEditingIncome(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Income Source</DialogTitle>
              <DialogDescription>Update your income source details.</DialogDescription>
            </DialogHeader>
            {updateError && (
              <Alert className="border-destructive bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-destructive">Error</AlertTitle>
                <AlertDescription className="text-destructive">{updateError}</AlertDescription>
              </Alert>
            )}
            <form
              onSubmit={(e) => {
                if (shouldPreventSubmission()) {
                  e.preventDefault();
                  return;
                }
                handleSubmit(handleUpdate)(e);
              }}
              className={`space-y-4 ${isAccountBeingCreated ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    aria-invalid={errors.name ? 'true' : 'false'}
                    aria-describedby={errors.name ? 'edit-name-error' : undefined}
                    className={errors.name ? 'border-destructive' : ''}
                    {...register('name')}
                  />
                  {errors.name && (
                    <p id="edit-name-error" className="text-sm text-destructive" role="alert">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-source">Source</Label>
                  <SearchableSelect
                    id="edit-source"
                    value={watchedSource}
                    onValueChange={(value) => setValue('source', value as Income['source'])}
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
                    aria-invalid={errors.amount ? 'true' : 'false'}
                    aria-describedby={errors.amount ? 'edit-amount-error' : undefined}
                    className={errors.amount ? 'border-destructive' : ''}
                    {...register('amount', { valueAsNumber: true })} 
                  />
                  {errors.amount && (
                    <p id="edit-amount-error" className="text-sm text-destructive" role="alert">
                      {errors.amount.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-frequency">Frequency</Label>
                  <SearchableSelect
                    id="edit-frequency"
                    value={watchedFrequency}
                    onValueChange={(value) => setValue('frequency', value as Income['frequency'])}
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
                allowClear={true}
                placeholder="No next payment date (optional)"
                {...register('nextPaymentDate')}
              />
                {errors.nextPaymentDate && (
                  <p id="edit-nextPaymentDate-error" className="text-sm text-destructive" role="alert">
                    {errors.nextPaymentDate.message}
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
                    setValue('paidToAccountId', value);
                    handleAccountChange(value);
                  }}
                  onAccountCreationStateChange={handleAccountCreationStateChange}
                  onAccountCreationError={(_error) => {
                    // Handle account creation errors if needed
                  }}
                  placeholder="Select account this income is paid to"
                  error={errors.paidToAccountId?.message}
                  context="income"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingIncome(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || isAccountBeingCreated}>
                  {updateMutation.isPending ? 'Saving...' : isAccountBeingCreated ? 'Creating Account...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Dialog */}
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
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

