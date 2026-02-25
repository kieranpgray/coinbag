import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatCurrency } from '@/lib/utils';
import { type AccountCreate } from '@/contracts/accounts';

const ACCOUNT_TYPES = [
  'Bank Account',
  'Savings',
  'Credit Card',
  'Loan',
  'Other',
] as const;

const simplifiedAccountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required').max(100, 'Account name must be less than 100 characters'),
  accountType: z.enum(['Bank Account', 'Savings', 'Credit Card', 'Loan', 'Other'], {
    errorMap: () => ({ message: 'Account type is required' }),
  }),
  balance: z.number({
    required_error: 'Balance is required',
    invalid_type_error: 'Balance must be a valid number'
  }).min(-1000000, 'Balance must be greater than -$1,000,000').max(10000000, 'Balance must be less than $10,000,000').optional(),
  institution: z.string().max(100, 'Institution must be less than 100 characters').optional(),
  creditLimit: z.number().min(0, 'Credit limit must be positive').max(1000000, 'Credit limit must be less than $1,000,000').optional(),
  balanceOwed: z.number().min(0, 'Balance owed must be positive').max(1000000, 'Balance owed must be less than $1,000,000').optional(),
}).refine(
  (data) => {
    // Credit Card and Loan require creditLimit and balanceOwed
    if (data.accountType === 'Credit Card' || data.accountType === 'Loan') {
      return data.creditLimit !== undefined && data.balanceOwed !== undefined;
    }
    // Regular accounts require balance
    if (data.accountType === 'Bank Account' || data.accountType === 'Savings' || data.accountType === 'Other') {
      return data.balance !== undefined && data.balance !== null && !isNaN(data.balance);
    }
    return true;
  },
  {
    message: 'Required fields are missing for this account type',
    path: ['balance'],
  }
);

type SimplifiedAccountFormData = z.infer<typeof simplifiedAccountSchema>;

interface SimplifiedAccountFormProps {
  onSubmit: (data: AccountCreate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SimplifiedAccountForm({ onSubmit, onCancel, isLoading }: SimplifiedAccountFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SimplifiedAccountFormData>({
    resolver: zodResolver(simplifiedAccountSchema),
    defaultValues: {
      accountType: 'Bank Account',
      balance: 0,
    },
  });

  // Check if account type requires credit fields
  const selectedType = watch('accountType') || 'Bank Account';
  const isCreditAccount = selectedType === 'Credit Card' || selectedType === 'Loan';

  // Reset balance when switching account types
  React.useEffect(() => {
    if (selectedType === 'Bank Account' || selectedType === 'Savings' || selectedType === 'Other') {
      // For regular accounts, ensure balance is set
      const currentBalance = watch('balance');
      if (currentBalance === undefined || currentBalance === null) {
        setValue('balance', 0);
      }
    }
  }, [selectedType, setValue, watch]);

  const onSubmitForm = (data: SimplifiedAccountFormData) => {
    let finalBalance: number;

    if (isCreditAccount) {
      // For credit accounts, balance is negative of balance owed
      finalBalance = -data.balanceOwed!;
    } else {
      // For regular accounts, use the balance field
      finalBalance = data.balance!;
    }

    // Convert to AccountCreate format
    const accountCreateData: AccountCreate = {
      accountName: data.accountName,
      accountType: data.accountType,
      balance: finalBalance,
      institution: data.institution || undefined,
      creditLimit: data.creditLimit,
      balanceOwed: data.balanceOwed,
      lastUpdated: new Date().toISOString(),
      hidden: false,
    };

    onSubmit(accountCreateData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      {/* Account Name */}
      <div className="space-y-2">
        <Label htmlFor="accountName">
          Account Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="accountName"
          aria-invalid={errors.accountName ? 'true' : 'false'}
          aria-describedby={errors.accountName ? 'accountName-error' : undefined}
          className={errors.accountName ? 'border-destructive' : ''}
          {...register('accountName')}
          placeholder="e.g., Everyday Account"
          autoFocus
        />
        {errors.accountName && (
          <p id="accountName-error" className="text-body text-destructive" role="alert">
            {errors.accountName.message}
          </p>
        )}
      </div>

      {/* Account Type */}
      <div className="space-y-2">
        <Label htmlFor="accountType">
          Account Type <span className="text-destructive">*</span>
        </Label>
        <SearchableSelect
          id="accountType"
          value={selectedType}
          onValueChange={(value) => setValue('accountType', value as SimplifiedAccountFormData['accountType'])}
          options={ACCOUNT_TYPES.map((type) => ({
            value: type,
            label: type,
          }))}
          placeholder="Select account type"
          error={errors.accountType?.message}
        />
      </div>

      {/* Institution (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="institution">Institution</Label>
        <Input
          id="institution"
          aria-invalid={errors.institution ? 'true' : 'false'}
          aria-describedby={errors.institution ? 'institution-error' : undefined}
          className={errors.institution ? 'border-destructive' : ''}
          {...register('institution')}
          placeholder="e.g., ANZ, Commonwealth Bank (optional)"
        />
        {errors.institution && (
          <p id="institution-error" className="text-body text-destructive" role="alert">
            {errors.institution.message}
          </p>
        )}
      </div>

      {/* Balance or Credit Fields */}
      {isCreditAccount ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="creditLimit">
                {selectedType === 'Credit Card' ? 'Credit Limit' : 'Loan Amount'} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="creditLimit"
                type="number"
                step="0.01"
                placeholder="0.00"
                clearOnFocus
                clearValue={0}
                aria-invalid={errors.creditLimit ? 'true' : 'false'}
                aria-describedby={errors.creditLimit ? 'creditLimit-error' : undefined}
                className={errors.creditLimit ? 'border-destructive' : ''}
                {...register('creditLimit', { valueAsNumber: true })}
              />
              <p className="text-caption text-muted-foreground">
                {selectedType === 'Credit Card'
                  ? 'Your total credit limit'
                  : 'The original loan amount'}
              </p>
              {errors.creditLimit && (
                <p id="creditlimit-error" className="text-body text-destructive" role="alert">
                  {errors.creditLimit.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="balanceOwed">
                Balance Owed <span className="text-destructive">*</span>
              </Label>
              <Input
                id="balanceOwed"
                type="number"
                step="0.01"
                placeholder="0.00"
                clearOnFocus
                clearValue={0}
                aria-invalid={errors.balanceOwed ? 'true' : 'false'}
                aria-describedby={errors.balanceOwed ? 'balanceOwed-error' : undefined}
                className={errors.balanceOwed ? 'border-destructive' : ''}
                {...register('balanceOwed', { valueAsNumber: true })}
              />
              <p className="text-caption text-muted-foreground">How much you currently owe</p>
              {errors.balanceOwed && (
                <p id="balanceowed-error" className="text-body text-destructive" role="alert">
                  {errors.balanceOwed.message}
                </p>
              )}
            </div>
          </div>

          {/* Calculated values preview */}
          {(() => {
            const creditLimit = watch('creditLimit');
            const balanceOwed = watch('balanceOwed');
            const hasValidValues = typeof creditLimit === 'number' && !isNaN(creditLimit) && creditLimit > 0 &&
                                 typeof balanceOwed === 'number' && !isNaN(balanceOwed) && balanceOwed >= 0;

            if (!hasValidValues) return null;

            return (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-body font-medium text-foreground">Calculated Values</p>
                <div className="grid grid-cols-2 gap-4 text-body">
                  <div>
                    <span className="text-muted-foreground">Account Balance:</span>
                    <span className="ml-2 font-medium text-destructive">
                      {formatCurrency(-balanceOwed!, undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <p className="text-caption text-muted-foreground mt-1">Negative balance (amount owed)</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Credit Limit:</span>
                    <span className="ml-2 font-medium">
                      {formatCurrency(creditLimit!, undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <p className="text-caption text-muted-foreground mt-1">Total credit available</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Regular account balance field */
        <div className="space-y-2">
          <Label htmlFor="balance">
            Current Balance <span className="text-destructive">*</span>
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
          <p className="text-caption text-muted-foreground">Current account balance</p>
          {errors.balance && (
            <p id="balance-error" className="text-body text-destructive" role="alert">
              {errors.balance.message}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Account'}
        </Button>
      </div>
    </form>
  );
}
