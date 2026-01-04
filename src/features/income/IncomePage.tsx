import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIncomes, useCreateIncome, useUpdateIncome, useDeleteIncome } from '@/features/income/hooks';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { IncomeCard } from '@/features/income/components/IncomeCard';
import { IncomeList } from '@/features/income/components/IncomeList';
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
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

const incomeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  source: z.enum(['Salary', 'Freelance', 'Business', 'Investments', 'Rental', 'Other']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  frequency: z.enum(['weekly', 'fortnightly', 'monthly', 'yearly']),
  nextPaymentDate: z.string().min(1, 'Next payment date is required'),
  notes: z.string().optional(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

export function IncomePage() {
  const { data: incomes = [], isLoading, error, refetch } = useIncomes();
  const createMutation = useCreateIncome();
  const updateMutation = useUpdateIncome();
  const deleteMutation = useDeleteIncome();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null);

  // Handle query params for auto-opening create modal
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === '1';
    if (shouldCreate) {
      setCreateModalOpen(true);
      // Clear the query params after processing
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

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
      nextPaymentDate: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    },
  });

  const watchedSource = watch('source') || ''; // Ensure always defined for controlled Select
  const watchedFrequency = watch('frequency') || ''; // Ensure always defined for controlled Select

  const handleCreate = (data: IncomeFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setCreateModalOpen(false);
        reset();
      },
    });
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    reset({
      name: income.name,
      source: income.source,
      amount: income.amount,
      frequency: income.frequency,
      nextPaymentDate: format(new Date(income.nextPaymentDate), 'yyyy-MM-dd'),
      notes: income.notes || '',
    });
  };

  const handleUpdate = (data: IncomeFormData) => {
    if (!editingIncome) return;
    updateMutation.mutate(
      { id: editingIncome.id, data },
      {
        onSuccess: () => {
          setEditingIncome(null);
          reset();
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
            <h1 className="text-3xl font-bold tracking-tight">Income</h1>
            <div className="space-y-0.5">
              <div className="text-4xl font-bold mb-4">
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
          <h1 className="text-3xl font-bold tracking-tight">Income</h1>
          <div className="space-y-0.5">
            <div className="text-4xl font-bold mb-4">
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
          <div className="flex items-center gap-3">
            <Label htmlFor="view-mode" className="text-sm text-muted-foreground">
              List view
            </Label>
            <Switch
              id="view-mode"
              checked={viewMode === 'cards'}
              onCheckedChange={(checked) => setViewMode(checked ? 'cards' : 'list')}
              aria-label="Toggle between list view and card view"
            />
            <Label htmlFor="view-mode" className="text-sm text-muted-foreground">
              Card view
            </Label>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      <div className="mt-4">
        {viewMode === 'list' ? (
          <IncomeList
            incomes={incomes}
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
          <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
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
                {...(() => {
                  const { disabled, ...registerProps } = register('nextPaymentDate');
                  return registerProps;
                })()}
              />
              {errors.nextPaymentDate && (
                <p id="nextPaymentDate-error" className="text-sm text-destructive" role="alert">
                  {errors.nextPaymentDate.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea id="notes" {...register('notes')} placeholder="Any additional notes" rows={3} />
              {errors.notes && (
                <p id="notes-error" className="text-sm text-destructive" role="alert">
                  {errors.notes.message}
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Income'}
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
            <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
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
                  {...(() => {
                    const { disabled, ...registerProps } = register('nextPaymentDate');
                    return registerProps;
                  })()}
                />
                {errors.nextPaymentDate && (
                  <p id="edit-nextPaymentDate-error" className="text-sm text-destructive" role="alert">
                    {errors.nextPaymentDate.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes (Optional)</Label>
                <Textarea id="edit-notes" {...register('notes')} rows={3} />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingIncome(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
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

