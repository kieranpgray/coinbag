import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
import { CategoryInput } from './CategoryInput';
import type { Expense, ExpenseFrequency } from '@/types/domain';
import {
  validateExpenseDates,
  validateExpenseAmount,
  getDefaultExpense,
  calculateNextDueDate,
} from '../utils';
import { format } from 'date-fns';
import { useCategories } from '@/features/categories/hooks';
import { findUncategorisedCategoryId } from '@/data/categories/ensureDefaults';

const expenseSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  amount: z.number()
    .min(0, 'Amount must be at least $0.00')
    .max(100000, 'Amount must be less than $100,000')
    .refine((val) => Number.isFinite(val), 'Amount must be a valid number'),
  frequency: z.enum(['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'] as const),
  chargeDate: z.string()
    .min(1, 'Charge date is required')
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
  nextDueDate: z.string()
    .min(1, 'Next due date is required')
    .refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
  categoryId: z.string()
    .min(1, 'Category is required')
    .uuid('Invalid category selected'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
}).superRefine((data, ctx) => {
  if (!validateExpenseDates(data.chargeDate, data.nextDueDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Next due date must be after or equal to charge date',
      path: ['nextDueDate'],
    });
  }

  if (!validateExpenseAmount(data.amount, data.frequency)) {
      const ranges: Record<ExpenseFrequency, string> = {
      weekly: '$0-2000',
      fortnightly: '$0-4000',
      monthly: '$0-10000',
      quarterly: '$0-30000',
      yearly: '$0-50000',
    };
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Amount must be between ${ranges[data.frequency]} for ${data.frequency} frequency`,
      path: ['amount'],
    });
  }
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  defaultValues?: Partial<Expense>;
  onSubmit: (data: Omit<Expense, 'id'>) => void;
  isSubmitting?: boolean;
}

const FREQUENCIES = [
  { value: 'weekly' as ExpenseFrequency, label: 'Weekly' },
  { value: 'fortnightly' as ExpenseFrequency, label: 'Fortnightly' },
  { value: 'monthly' as ExpenseFrequency, label: 'Monthly' },
  { value: 'quarterly' as ExpenseFrequency, label: 'Quarterly' },
  { value: 'yearly' as ExpenseFrequency, label: 'Yearly' },
] as const;

export function ExpenseForm({ defaultValues, onSubmit, isSubmitting }: ExpenseFormProps) {
  const { data: categories = [], refetch: refetchCategories } = useCategories();
  const [categoriesReady, setCategoriesReady] = useState(false);
  
  // Find uncategorised category or use first available
  const uncategorisedId = findUncategorisedCategoryId(categories);
  const defaultCategoryId = defaultValues?.categoryId || uncategorisedId || categories[0]?.id || '';

  const defaultExpense = getDefaultExpense(defaultCategoryId);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: defaultValues?.name || defaultExpense.name,
      amount: defaultValues?.amount || defaultExpense.amount,
      frequency: defaultValues?.frequency || defaultExpense.frequency,
      chargeDate: defaultValues?.chargeDate ? format(new Date(defaultValues.chargeDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      nextDueDate: defaultValues?.nextDueDate ? format(new Date(defaultValues.nextDueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      categoryId: defaultCategoryId,
      notes: defaultValues?.notes || defaultExpense.notes || '',
    },
  });

  // Once categories are loaded and we have a default, mark as ready
  useEffect(() => {
    if (categories.length > 0 && defaultCategoryId) {
      setCategoriesReady(true);
      // Set the form value if it wasn't already set
      if (!watch('categoryId')) {
        setValue('categoryId', defaultCategoryId);
      }
    }
  }, [categories.length, defaultCategoryId, setValue, watch]);

  const watchedFrequency = watch('frequency') || ''; // Ensure always defined for controlled Select
  const watchedChargeDate = watch('chargeDate') || ''; // Ensure always defined for controlled Select
  const watchedCategoryId = watch('categoryId') || ''; // Ensure always defined for controlled Select

  // Auto-calculate next due date when frequency or charge date changes
  useEffect(() => {
    if (watchedFrequency && watchedChargeDate && !defaultValues?.nextDueDate) {
      try {
        const nextDue = calculateNextDueDate(watchedChargeDate, watchedFrequency);
        setValue('nextDueDate', format(new Date(nextDue), 'yyyy-MM-dd'));
      } catch (error) {
        // If calculation fails, keep the current value
        logger.warn('EXPENSE:FORM', 'Failed to auto-calculate next due date', { error });
      }
    }
  }, [watchedFrequency, watchedChargeDate, setValue, defaultValues?.nextDueDate]);

  const handleFormSubmit = (data: ExpenseFormData) => {
    onSubmit({
      name: data.name,
      amount: data.amount,
      frequency: data.frequency,
      chargeDate: data.chargeDate,
      nextDueDate: data.nextDueDate,
      categoryId: data.categoryId,
      notes: data.notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit as (data: ExpenseFormData) => void)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={errors.name ? 'border-destructive' : ''}
            {...register('name')}
            placeholder="Netflix Subscription"
          />
          {errors.name && (
            <p id="name-error" className="text-sm text-destructive" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount ($)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="frequency">Frequency</Label>
          <SearchableSelect
            id="frequency"
            value={watchedFrequency}
            onValueChange={(value) => setValue('frequency', value as Expense['frequency'])}
            options={FREQUENCIES.map((freq) => ({
              value: freq.value,
              label: freq.label,
            }))}
            placeholder="Select frequency"
            error={errors.frequency?.message}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <CategoryInput
            id="categoryId"
            value={watchedCategoryId}
            onChange={(value) => setValue('categoryId', value)}
            placeholder="Select category"
            error={errors.categoryId?.message}
            onCategoriesRefresh={refetchCategories}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="chargeDate">Charge Date</Label>
          <DatePicker
            id="chargeDate"
            shouldShowCalendarButton
            {...(() => {
              const { disabled, ...registerProps } = register('chargeDate');
              return registerProps;
            })()}
          />
          {errors.chargeDate && (
            <p id="chargeDate-error" className="text-sm text-destructive" role="alert">
              {errors.chargeDate.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nextDueDate">Next Due Date</Label>
          <DatePicker
            id="nextDueDate"
            shouldShowCalendarButton
            {...(() => {
              const { disabled, ...registerProps } = register('nextDueDate');
              return registerProps;
            })()}
          />
          {errors.nextDueDate && (
            <p id="nextDueDate-error" className="text-sm text-destructive" role="alert">
              {errors.nextDueDate.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes about this expense"
          rows={3}
        />
        {errors.notes && (
          <p id="notes-error" className="text-sm text-destructive" role="alert">
            {errors.notes.message}
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isSubmitting || !categoriesReady}>
          {isSubmitting ? 'Saving...' : 'Save Expense'}
        </Button>
      </div>
    </form>
  );
}

