import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CategoryInput } from './CategoryInput';
import type { Subscription, SubscriptionFrequency } from '@/types/domain';
import {
  validateSubscriptionDates,
  validateSubscriptionAmount,
  getDefaultSubscription,
  calculateNextDueDate,
} from '../utils';
import { format } from 'date-fns';
import { useCategories } from '@/features/categories/hooks';
import { findUncategorisedCategoryId } from '@/data/categories/ensureDefaults';

const subscriptionSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  amount: z.number()
    .min(0.01, 'Amount must be greater than $0.00')
    .max(100000, 'Amount must be less than $100,000')
    .refine((val) => Number.isFinite(val), 'Amount must be a valid number'),
  frequency: z.enum(['weekly', 'fortnightly', 'monthly', 'yearly'] as const),
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
  if (!validateSubscriptionDates(data.chargeDate, data.nextDueDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Next due date must be after or equal to charge date',
      path: ['nextDueDate'],
    });
  }

  if (!validateSubscriptionAmount(data.amount, data.frequency)) {
    const ranges: Record<SubscriptionFrequency, string> = {
      weekly: '$1-2000',
      fortnightly: '$1-4000',
      monthly: '$1-10000',
      yearly: '$1-50000',
    };
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Amount must be between ${ranges[data.frequency]} for ${data.frequency} frequency`,
      path: ['amount'],
    });
  }
});

type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

interface SubscriptionFormProps {
  defaultValues?: Partial<Subscription>;
  onSubmit: (data: Omit<Subscription, 'id'>) => void;
  isSubmitting?: boolean;
}

const FREQUENCIES = [
  { value: 'weekly' as SubscriptionFrequency, label: 'Weekly' },
  { value: 'fortnightly' as SubscriptionFrequency, label: 'Fortnightly' },
  { value: 'monthly' as SubscriptionFrequency, label: 'Monthly' },
  { value: 'yearly' as SubscriptionFrequency, label: 'Yearly' },
] as const;

export function SubscriptionForm({ defaultValues, onSubmit, isSubmitting }: SubscriptionFormProps) {
  const { data: categories = [], refetch: refetchCategories } = useCategories();
  const [categoriesReady, setCategoriesReady] = useState(false);
  
  // Find uncategorised category or use first available
  const uncategorisedId = findUncategorisedCategoryId(categories);
  const defaultCategoryId = defaultValues?.categoryId || uncategorisedId || categories[0]?.id || '';

  const defaultSubscription = getDefaultSubscription(defaultCategoryId);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: defaultValues?.name || defaultSubscription.name,
      amount: defaultValues?.amount || defaultSubscription.amount,
      frequency: defaultValues?.frequency || defaultSubscription.frequency,
      chargeDate: defaultValues?.chargeDate ? format(new Date(defaultValues.chargeDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      nextDueDate: defaultValues?.nextDueDate ? format(new Date(defaultValues.nextDueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      categoryId: defaultCategoryId,
      notes: defaultValues?.notes || defaultSubscription.notes || '',
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
        console.warn('Failed to auto-calculate next due date:', error);
      }
    }
  }, [watchedFrequency, watchedChargeDate, setValue, defaultValues?.nextDueDate]);

  const handleFormSubmit = (data: SubscriptionFormData) => {
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Netflix Subscription"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount ($)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            {...register('amount', { valueAsNumber: true })}
            placeholder="19.99"
          />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="frequency">Frequency</Label>
          <SearchableSelect
            id="frequency"
            value={watchedFrequency}
            onValueChange={(value) => setValue('frequency', value as Subscription['frequency'])}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="chargeDate">Charge Date</Label>
          <Input
            id="chargeDate"
            type="date"
            {...register('chargeDate')}
          />
          {errors.chargeDate && (
            <p className="text-sm text-destructive">{errors.chargeDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nextDueDate">Next Due Date</Label>
          <Input
            id="nextDueDate"
            type="date"
            {...register('nextDueDate')}
          />
          {errors.nextDueDate && (
            <p className="text-sm text-destructive">{errors.nextDueDate.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes about this subscription"
          rows={3}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isSubmitting || !categoriesReady}>
          {isSubmitting ? 'Saving...' : 'Save Subscription'}
        </Button>
      </div>
    </form>
  );
}
