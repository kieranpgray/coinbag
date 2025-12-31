import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { Goal } from '@/types/domain';

const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  description: z.string().optional(),
  type: z.enum(['Grow', 'Save', 'Pay Off', 'Invest']),
  source: z.string().optional(),
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

const GOAL_TYPES: Goal['type'][] = ['Grow', 'Save', 'Pay Off', 'Invest'];

const SOURCE_OPTIONS = [
  'Cash',
  'Bank account',
  'Savings account',
  'Credit card',
  'Shareholdings',
  'Other',
];

export function GoalForm({ goal, onSubmit, onCancel, isLoading }: GoalFormProps) {
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
          type: goal.type,
          source: goal.source,
          currentAmount: goal.currentAmount,
          targetAmount: goal.targetAmount,
          deadline: goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : undefined,
        }
      : {
          type: 'Grow',
          currentAmount: 0,
          targetAmount: 0,
        },
  });

  const type = watch('type') || 'Grow'; // Ensure always defined for controlled Select
  const source = watch('source') || ''; // Ensure always defined for controlled Select

  const onSubmitForm = (data: GoalFormData) => {
    onSubmit({
      ...data,
      deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Goal</Label>
        <Input
          id="name"
          placeholder="E.g. Emergency Fund, Net Worth"
          {...register('name')}
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        {errors.name && (
          <p className="text-sm text-destructive" role="alert">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Goal Type</Label>
          <SearchableSelect
            id="type"
            value={type}
            onValueChange={(value) => setValue('type', value as Goal['type'])}
            options={GOAL_TYPES.map((goalType) => ({
              value: goalType,
              label: goalType,
            }))}
            placeholder="Select type"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <SearchableSelect
            id="source"
            value={source || ''}
            onValueChange={(value) => setValue('source', value || undefined)}
            options={SOURCE_OPTIONS.map((option) => ({
              value: option,
              label: option,
            }))}
            placeholder="Select a source"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currentAmount">Current Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="currentAmount"
              type="number"
              step="0.01"
              className="pl-7"
              placeholder="0.00"
              clearOnFocus
              clearValue={0}
              {...register('currentAmount', { valueAsNumber: true })}
              aria-invalid={errors.currentAmount ? 'true' : 'false'}
            />
          </div>
          {errors.currentAmount && (
            <p className="text-sm text-destructive" role="alert">
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
              className="pl-7"
              placeholder="0.00"
              clearOnFocus
              clearValue={0}
              {...register('targetAmount', { valueAsNumber: true })}
              aria-invalid={errors.targetAmount ? 'true' : 'false'}
            />
          </div>
          {errors.targetAmount && (
            <p className="text-sm text-destructive" role="alert">
              {errors.targetAmount.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deadline">Target Date</Label>
        <Input
          id="deadline"
          type="date"
          {...register('deadline')}
          aria-invalid={errors.deadline ? 'true' : 'false'}
        />
        {errors.deadline && (
          <p className="text-sm text-destructive" role="alert">
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

