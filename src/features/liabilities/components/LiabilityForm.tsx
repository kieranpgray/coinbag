import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { Liability } from '@/types/domain';

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
    resolver: zodResolver(liabilitySchema) as any,
    defaultValues: liability
      ? {
          name: liability.name,
          type: liability.type,
          balance: liability.balance,
          interestRate: liability.interestRate,
          monthlyPayment: liability.monthlyPayment,
          dueDate: liability.dueDate ? liability.dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
          institution: liability.institution,
        }
      : {
          type: 'Loans',
          dueDate: new Date().toISOString().split('T')[0],
        },
  });

  const selectedType = watch('type') || 'Loans'; // Ensure always defined for controlled Select
  const isLoan = selectedType === 'Loans';

  const onSubmitForm = (formData: LiabilityFormData) => {
    onSubmit({
      name: formData.name,
      type: formData.type,
      balance: formData.balance,
      interestRate: formData.interestRate,
      monthlyPayment: isLoan ? formData.monthlyPayment : undefined,
      dueDate: new Date(formData.dueDate).toISOString(),
      institution: formData.institution,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm as any)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input id="name" {...register('name')} placeholder="Liability name" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
          {...register('balance', { valueAsNumber: true })}
        />
        {errors.balance && <p className="text-sm text-destructive">{errors.balance.message}</p>}
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
          {...register('interestRate', { valueAsNumber: true })}
        />
        {errors.interestRate && (
          <p className="text-sm text-destructive">{errors.interestRate.message}</p>
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
            {...register('monthlyPayment', { valueAsNumber: true })}
          />
          {errors.monthlyPayment && (
            <p className="text-sm text-destructive">{errors.monthlyPayment.message}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="dueDate">
          Due Date <span className="text-destructive">*</span>
        </Label>
        <Input id="dueDate" type="date" {...register('dueDate')} />
        {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate.message}</p>}
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

