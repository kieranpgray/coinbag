import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
import { useAccounts } from '@/features/accounts/hooks/useAccounts';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Goal } from '@/types/domain';

const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  description: z.string().optional(),
  source: z.string().optional(),
  accountId: z.string().uuid('Invalid account ID').optional(),
  currentAmount: z.number().min(0, 'Current amount must be non-negative'),
  targetAmount: z.number().min(0.01, 'Target amount must be greater than 0'),
  deadline: z.string().optional(),
});

export type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormProps {
  goal?: Goal;
  onSubmit: (data: GoalFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const SOURCE_OPTIONS = [
  'Cash',
  'Savings account',
  'Bank account',
  'Credit card',
  'Loan',
  'Investment',
  'Other',
] as const;

// Map source types to account types for filtering
const getAccountTypesForSource = (source: string): string[] => {
  switch (source) {
    case 'Savings account':
      return ['Savings'];
    case 'Bank account':
      // Antifragile: handle both 'Bank Account' (current) and 'Checking' (legacy)
      return ['Bank Account', 'Checking'];
    case 'Credit card':
      return ['Credit Card'];
    case 'Loan':
      return ['Loan'];
    default:
      return [];
  }
};

export function GoalForm({ goal, onSubmit, onCancel, isLoading }: GoalFormProps) {
  const { data: accounts = [] } = useAccounts();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: goal
      ? {
          name: goal.name,
          description: goal.description,
          source: goal.source,
          accountId: goal.accountId,
          currentAmount: goal.currentAmount,
          targetAmount: goal.targetAmount,
          deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : undefined,
        }
      : {
          currentAmount: 0,
          targetAmount: 0,
        },
  });

  const source = watch('source') || '';
  const accountId = watch('accountId') || '';

  // Filter accounts based on selected source type
  const filteredAccounts = useMemo(() => {
    if (!source) return [];
    
    const accountTypes = getAccountTypesForSource(source);
    if (accountTypes.length === 0) return [];
    
    return accounts.filter((account) => accountTypes.includes(account.accountType));
  }, [accounts, source]);

  // Check if account linking should be shown
  const showAccountLinking = useMemo(() => {
    return ['Savings account', 'Bank account', 'Credit card', 'Loan'].includes(source);
  }, [source]);

  // Clear accountId when source changes to a type that doesn't support linking
  const handleSourceChange = (value: string | undefined) => {
    setValue('source', value || undefined);
    if (!value || !getAccountTypesForSource(value).length) {
      setValue('accountId', undefined);
    }
  };

  const onSubmitForm = (data: GoalFormData) => {
    onSubmit({
      ...data,
      deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
      accountId: data.accountId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Goal</Label>
        <Input
          id="name"
          placeholder="E.g. Emergency Fund, Net Worth"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={errors.name ? 'border-destructive' : ''}
          {...register('name')}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Add a description for your goal"
          {...register('description')}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="source">Source</Label>
        <SearchableSelect
          id="source"
          value={source || ''}
          onValueChange={handleSourceChange}
          options={SOURCE_OPTIONS.map((option) => ({
            value: option,
            label: option,
          }))}
          placeholder="Select a source"
        />
      </div>

      {showAccountLinking && (
        <div className="space-y-2">
          <Label htmlFor="accountId">Link to Account (Optional)</Label>
          <SearchableSelect
            id="accountId"
            value={accountId || ''}
            onValueChange={(value) => setValue('accountId', value || undefined)}
            options={filteredAccounts.map((account) => ({
              value: account.id,
              label: `${account.institution} - ${account.accountName}`,
            }))}
            placeholder="Select an account to link"
          />
          {filteredAccounts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No accounts found for this source type. Create an account first.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currentAmount">Current Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="currentAmount"
              type="number"
              step="0.01"
              className={cn("pl-7", errors.currentAmount && 'border-destructive')}
              placeholder="0.00"
              clearOnFocus
              clearValue={0}
              aria-invalid={errors.currentAmount ? 'true' : 'false'}
              aria-describedby={errors.currentAmount ? 'currentAmount-error' : undefined}
              {...register('currentAmount', { valueAsNumber: true })}
            />
          </div>
          {errors.currentAmount && (
            <p id="currentAmount-error" className="text-sm text-destructive" role="alert">
              {errors.currentAmount.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetAmount">Target Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              className={cn("pl-7", errors.targetAmount && 'border-destructive')}
              placeholder="0.00"
              clearOnFocus
              clearValue={0}
              aria-invalid={errors.targetAmount ? 'true' : 'false'}
              aria-describedby={errors.targetAmount ? 'targetAmount-error' : undefined}
              {...register('targetAmount', { valueAsNumber: true })}
            />
          </div>
          {errors.targetAmount && (
            <p id="targetAmount-error" className="text-sm text-destructive" role="alert">
              {errors.targetAmount.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deadline">Target Date</Label>
        <DatePicker
          id="deadline"
          shouldShowCalendarButton
          {...(() => {
            const { disabled, ...registerProps } = register('deadline');
            return registerProps;
          })()}
          aria-invalid={errors.deadline ? 'true' : 'false'}
        />
        {errors.deadline && (
          <p id="deadline-error" className="text-sm text-destructive" role="alert">
            {errors.deadline.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {goal ? 'Update Goal' : 'Create Goal'}
        </Button>
      </div>
    </form>
  );
}
