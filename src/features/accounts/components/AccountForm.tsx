import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { accountCreateSchema, type AccountCreate } from '@/contracts/accounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatCurrency } from '@/lib/utils';
import type { Account } from '@/types/domain';

const ACCOUNT_TYPES = [
  'Bank Account',
  'Savings',
  'Credit Card',
  'Loan',
  'Other',
] as const;

type AccountFormData = z.input<typeof accountCreateSchema>;

interface AccountFormProps {
  account?: Account;
  onSubmit: (data: AccountCreate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AccountForm({ account, onSubmit, onCancel, isLoading }: AccountFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountCreateSchema),
    defaultValues: account
      ? {
          institution: account.institution,
          accountName: account.accountName,
          balance: account.balance,
          accountType: account.accountType,
          creditLimit: account.creditLimit,
          balanceOwed: account.balanceOwed,
          lastUpdated: account.lastUpdated,
          hidden: account.hidden,
        } satisfies Partial<AccountFormData>
      : {
          accountType: 'Bank Account',
          lastUpdated: new Date().toISOString(),
          hidden: false,
        } satisfies Partial<AccountFormData>,
  });

  const selectedType = watch('accountType') || 'Bank Account';
  const creditLimit = watch('creditLimit');
  const balanceOwed = watch('balanceOwed');

  // Check if account type requires credit fields
  const isCreditAccount = selectedType === 'Credit Card' || selectedType === 'Loan';

  // Watch credit fields to auto-calculate balance for credit accounts
  // Only calculate when both values are valid numbers (not NaN, not undefined/null)
  React.useEffect(() => {
    if (isCreditAccount) {
      // Only calculate if both values are valid finite numbers
      const limit = typeof creditLimit === 'number' && !isNaN(creditLimit) && isFinite(creditLimit) && creditLimit >= 0 ? creditLimit : undefined;
      const owed = typeof balanceOwed === 'number' && !isNaN(balanceOwed) && isFinite(balanceOwed) && balanceOwed >= 0 ? balanceOwed : undefined;
      
      if (limit !== undefined && owed !== undefined) {
        // For credit cards/loans: balance is negative (what you owe)
        const calculatedBalance = -owed;
        
        // Only set if value is valid finite number
        if (isFinite(calculatedBalance)) {
          setValue('balance', calculatedBalance, { shouldValidate: false });
        }
      }
      // Don't set to 0 if fields are empty - let them stay undefined/empty
    } else {
      // When switching away from credit account, clear balance field to show placeholder
      const currentBalance = watch('balance');
      
      // Clear balance if it's NaN or invalid (let user enter new value)
      if (typeof currentBalance !== 'number' || isNaN(currentBalance) || !isFinite(currentBalance)) {
        setValue('balance', undefined, { shouldValidate: false });
      }
    }
  }, [creditLimit, balanceOwed, isCreditAccount, setValue, watch]);

  const onSubmitForm = (data: AccountFormData) => {
    // For credit accounts, validate required fields and calculate balance
    if (isCreditAccount) {
      // Validate credit fields are valid numbers (schema validation should catch this, but double-check)
      const limit = typeof data.creditLimit === 'number' && !isNaN(data.creditLimit) ? data.creditLimit : undefined;
      const owed = typeof data.balanceOwed === 'number' && !isNaN(data.balanceOwed) ? data.balanceOwed : undefined;
      
      if (limit === undefined || limit === null || limit < 0) {
        setValue('creditLimit', 0, { shouldValidate: true });
        return; // Form validation will catch this
      }
      if (owed === undefined || owed === null || owed < 0) {
        setValue('balanceOwed', 0, { shouldValidate: true });
        return; // Form validation will catch this
      }
      
      // Calculate balance synchronously before submission
      data.balance = -owed;
    } else {
      // For non-credit accounts, ensure balance is provided (default to 0 if undefined/empty)
      if (data.balance === undefined || data.balance === null || data.balance === '' || isNaN(Number(data.balance))) {
        data.balance = 0;
      } else {
        data.balance = Number(data.balance);
      }
    }

    // Remove currency from submission (not relevant)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { currency, ...submitData } = data;
    
    onSubmit({
      ...submitData,
      hidden: submitData.hidden ?? false, // Ensure hidden is always boolean
      lastUpdated: submitData.lastUpdated || new Date().toISOString(),
    } as AccountCreate);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      {/* Field 1: Account Name */}
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
        />
        {errors.accountName && (
          <p id="accountName-error" className="text-body text-destructive" role="alert">
            {errors.accountName.message}
          </p>
        )}
      </div>

      {/* Field 2: Account Type */}
      <div className="space-y-2">
        <Label htmlFor="accountType">
          Account Type <span className="text-destructive">*</span>
        </Label>
        <SearchableSelect
          id="accountType"
          value={selectedType}
          onValueChange={(value) => setValue('accountType', value)}
          options={ACCOUNT_TYPES.map((type) => ({
            value: type,
            label: type,
          }))}
          placeholder="Select account type"
          error={errors.accountType?.message}
        />
      </div>

      {/* Field 3: Institution (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="institution">
          Institution
        </Label>
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

      {/* Field 4: Balance or Credit Fields */}
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
                min="0"
                clearOnFocus
                clearValue={0}
                aria-invalid={errors.creditLimit ? 'true' : 'false'}
                aria-describedby={errors.creditLimit ? 'creditLimit-error' : undefined}
                className={errors.creditLimit ? 'border-destructive' : ''}
                {...register('creditLimit', { 
                  valueAsNumber: true,
                  setValueAs: (value) => {
                    if (value === '' || value === null || value === undefined) return undefined;
                    const num = Number(value);
                    return isNaN(num) ? undefined : num;
                  }
                })}
              />
              <p className="text-caption text-muted-foreground">
                {selectedType === 'Credit Card' 
                  ? 'Your total credit limit' 
                  : 'The original loan amount'}
              </p>
              {errors.creditLimit && (
                <p id="creditLimit-error" className="text-body text-destructive" role="alert">
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
                min="0"
                clearOnFocus
                clearValue={0}
                aria-invalid={errors.balanceOwed ? 'true' : 'false'}
                aria-describedby={errors.balanceOwed ? 'balanceOwed-error' : undefined}
                className={errors.balanceOwed ? 'border-destructive' : ''}
                {...register('balanceOwed', { 
                  valueAsNumber: true,
                  setValueAs: (value) => {
                    if (value === '' || value === null || value === undefined) return undefined;
                    const num = Number(value);
                    return isNaN(num) ? undefined : num;
                  }
                })}
              />
              <p className="text-caption text-muted-foreground">
                How much you currently owe
              </p>
              {errors.balanceOwed && (
                <p id="balanceOwed-error" className="text-body text-destructive" role="alert">
                  {errors.balanceOwed.message}
                </p>
              )}
            </div>
          </div>

          {/* Calculated values preview */}
          {typeof creditLimit === 'number' && !isNaN(creditLimit) && creditLimit > 0 &&
           typeof balanceOwed === 'number' && !isNaN(balanceOwed) && balanceOwed >= 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-body font-medium text-foreground">Calculated Values</p>
              <div className="grid grid-cols-2 gap-4 text-body">
                <div>
                  <span className="text-muted-foreground">Account Balance:</span>
                  <span className="ml-2 font-medium text-destructive">
                    {formatCurrency(-balanceOwed)}
                  </span>
                  <p className="text-caption text-muted-foreground mt-1">Negative balance (amount owed)</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Credit Limit:</span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(creditLimit)}
                  </span>
                  <p className="text-caption text-muted-foreground mt-1">Total credit available</p>
                </div>
              </div>
            </div>
          )}
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
            {...register('balance', { 
              valueAsNumber: true,
              setValueAs: (value) => {
                if (value === '' || value === null || value === undefined) return undefined;
                const num = Number(value);
                return isNaN(num) ? undefined : num;
              }
            })}
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
          {isLoading ? 'Saving...' : account ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
