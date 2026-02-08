import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DatePicker } from '@/components/ui/date-picker';
import type { Liability, SubscriptionFrequency } from '@/types/domain';

const liabilitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['Loans', 'Credit Cards', 'Other']),
  balance: z.number().min(0, 'Balance must be positive'),
  interestRate: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = typeof val === 'number' ? val : Number(val);
      return Number.isNaN(num) ? undefined : num;
    },
    z.number().min(0).max(100).optional()
  ),
  monthlyPayment: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = typeof val === 'number' ? val : Number(val);
      return Number.isNaN(num) ? undefined : num;
    },
    z.number().min(0).optional()
  ),
  dueDate: z.string().min(1, 'Due date is required'),
  institution: z.string().optional(),
  repaymentAmount: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = typeof val === 'number' ? val : Number(val);
      return Number.isNaN(num) ? undefined : num;
    },
    z.number().min(0).optional()
  ),
  repaymentFrequency: z.enum(['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly']).optional(),
});

type LiabilityFormData = z.infer<typeof liabilitySchema>;

interface LiabilityFormProps {
  liability?: Liability;
  onSubmit: (data: Omit<Liability, 'id'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function LiabilityForm({
  liability,
  onSubmit,
  onCancel,
  isLoading,
}: LiabilityFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LiabilityFormData>({
    resolver: zodResolver(liabilitySchema) as Resolver<LiabilityFormData>,
    defaultValues: liability
      ? {
          name: liability.name,
          type: liability.type,
          balance: liability.balance,
          interestRate: liability.interestRate,
          monthlyPayment: liability.monthlyPayment,
          dueDate: liability.dueDate ? liability.dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
          institution: liability.institution,
          repaymentAmount: liability.repaymentAmount,
          repaymentFrequency: liability.repaymentFrequency,
        }
      : {
          type: 'Loans',
          dueDate: new Date().toISOString().split('T')[0],
        },
  });

  const selectedType = watch('type') || 'Loans'; // Ensure always defined for controlled Select
  const isLoan = selectedType === 'Loans';
  const isLoanOrCreditCard = selectedType === 'Loans' || selectedType === 'Credit Cards';

  const onSubmitForm = (formData: LiabilityFormData) => {
    onSubmit({
      name: formData.name,
      type: formData.type,
      balance: formData.balance,
      interestRate: formData.interestRate,
      monthlyPayment: isLoan ? formData.monthlyPayment : undefined,
      dueDate: new Date(formData.dueDate).toISOString(),
      institution: formData.institution,
      repaymentAmount: formData.repaymentAmount,
      repaymentFrequency: formData.repaymentFrequency,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm as (data: LiabilityFormData) => void)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={errors.name ? 'border-destructive' : ''}
          {...register('name')}
          placeholder="Liability name"
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">
          Type <span className="text-destructive">*</span>
        </Label>
        <SearchableSelect
          id="type"
          value={selectedType}
          onValueChange={(value) => setValue('type', value as LiabilityFormData['type'])}
          options={[
            { value: 'Loans', label: 'Loans' },
            { value: 'Credit Cards', label: 'Credit Cards' },
            { value: 'Other', label: 'Other' },
          ]}
          placeholder="Select liability type"
          error={errors.type?.message}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="balance">
          Balance ($) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="balance"
          type="number"
          step="0.01"
          placeholder="0.00"
          clearOnFocus
          clearValue={0}
          aria-invalid={errors.balance ? 'true' : 'false'}
          aria-describedby={errors.balance ? 'balance-error' : undefined}
          className={errors.balance ? 'border-destructive' : ''}
          {...register('balance', { valueAsNumber: true })}
        />
        {errors.balance && (
          <p id="balance-error" className="text-sm text-destructive" role="alert">
            {errors.balance.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="interestRate">Interest Rate (%)</Label>
        <Input
          id="interestRate"
          type="number"
          step="0.01"
          placeholder="0.00"
          clearOnFocus
          clearValue={0}
          aria-invalid={errors.interestRate ? 'true' : 'false'}
          aria-describedby={errors.interestRate ? 'interestRate-error' : undefined}
          className={errors.interestRate ? 'border-destructive' : ''}
          {...register('interestRate', { valueAsNumber: true })}
        />
        {errors.interestRate && (
          <p id="interestRate-error" className="text-sm text-destructive" role="alert">
            {errors.interestRate.message}
          </p>
        )}
      </div>

      {isLoan && (
        <div className="space-y-2">
          <Label htmlFor="monthlyPayment">Monthly Payment ($)</Label>
          <Input
            id="monthlyPayment"
            type="number"
            step="0.01"
            placeholder="0.00"
            clearOnFocus
            clearValue={0}
            aria-invalid={errors.monthlyPayment ? 'true' : 'false'}
            aria-describedby={errors.monthlyPayment ? 'monthlyPayment-error' : undefined}
            className={errors.monthlyPayment ? 'border-destructive' : ''}
            {...register('monthlyPayment', { valueAsNumber: true })}
          />
          {errors.monthlyPayment && (
            <p id="monthlyPayment-error" className="text-sm text-destructive" role="alert">
              {errors.monthlyPayment.message}
            </p>
          )}
        </div>
      )}

      {isLoanOrCreditCard && (
        <>
          <div className="space-y-2">
            <Label htmlFor="repaymentAmount">Repayment Amount ($)</Label>
            <Input
              id="repaymentAmount"
              type="number"
              step="0.01"
              placeholder="0.00"
              clearOnFocus
              clearValue={0}
              aria-invalid={errors.repaymentAmount ? 'true' : 'false'}
              aria-describedby={errors.repaymentAmount ? 'repaymentAmount-error' : undefined}
              className={errors.repaymentAmount ? 'border-destructive' : ''}
              {...register('repaymentAmount', { valueAsNumber: true })}
            />
            {errors.repaymentAmount && (
              <p id="repaymentAmount-error" className="text-sm text-destructive" role="alert">
                {errors.repaymentAmount.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="repaymentFrequency">Repayment Frequency</Label>
            <SearchableSelect
              id="repaymentFrequency"
              value={watch('repaymentFrequency') || ''}
              onValueChange={(value) => setValue('repaymentFrequency', value as SubscriptionFrequency | undefined)}
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'fortnightly', label: 'Fortnightly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
              placeholder="Select frequency"
              error={errors.repaymentFrequency?.message}
            />
            {errors.repaymentFrequency && (
              <p id="repaymentFrequency-error" className="text-sm text-destructive" role="alert">
                {errors.repaymentFrequency.message}
              </p>
            )}
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="dueDate">
          Due Date <span className="text-destructive">*</span>
        </Label>
        <DatePicker
          id="dueDate"
          shouldShowCalendarButton
          {...(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { disabled, ...registerProps } = register('dueDate');
            return registerProps;
          })()}
        />
        {errors.dueDate && (
          <p id="dueDate-error" className="text-sm text-destructive" role="alert">
            {errors.dueDate.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="institution">Institution</Label>
        <Input id="institution" {...register('institution')} placeholder="Optional" />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : liability ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

