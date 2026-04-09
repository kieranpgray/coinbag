import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { AccountSelect } from '@/components/shared/AccountSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePayCycle } from '../hooks';
import { useAccounts } from '@/features/accounts/hooks';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { PayCycleConfig } from '@/types/domain';
import { format } from 'date-fns';
import { ROUTES } from '@/lib/constants/routes';
import { useTranslation } from 'react-i18next';

const payCycleSchema = z.object({
  frequency: z.enum(['weekly', 'fortnightly', 'monthly']),
  nextPayDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    'Invalid date format'
  ),
  primaryIncomeAccountId: z.string().uuid('Please select an account'),
  savingsAccountId: z.string().uuid('Invalid account selected').optional(),
});

type PayCycleFormData = z.infer<typeof payCycleSchema>;

export interface PayCycleSetupProps {
  /** Called after pay cycle is successfully saved; e.g. close modal when used inside a dialog */
  onSuccess?: () => void;
}

/**
 * Component for setting up pay cycle configuration
 * Shown when user hasn't configured their pay cycle yet
 */
export function PayCycleSetup({ onSuccess }: PayCycleSetupProps = {}) {
  const { t } = useTranslation('pages');
  const { payCycle, updatePayCycle, isUpdating, error } = usePayCycle();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PayCycleFormData>({
    resolver: zodResolver(payCycleSchema),
    defaultValues: payCycle
      ? {
          frequency: payCycle.frequency,
          nextPayDate: payCycle.nextPayDate,
          primaryIncomeAccountId: payCycle.primaryIncomeAccountId,
          savingsAccountId: payCycle.savingsAccountId,
        }
      : {
          frequency: 'fortnightly',
          nextPayDate: format(new Date(), 'yyyy-MM-dd'),
        },
  });

  const onSubmit = async (data: PayCycleFormData) => {
    const config: PayCycleConfig = {
      frequency: data.frequency,
      nextPayDate: data.nextPayDate,
      primaryIncomeAccountId: data.primaryIncomeAccountId,
      savingsAccountId: data.savingsAccountId || undefined,
    };
    await updatePayCycle(config);
    onSuccess?.();
  };

  if (accountsLoading) {
    return (
      <div className="space-y-1 py-2">
        <p className="text-base font-medium">Set Up Your Pay Cycle</p>
        <p className="text-sm text-muted-foreground">Loading accounts...</p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-base font-medium">Set Up Your Pay Cycle</p>
          <p className="text-sm text-muted-foreground">
            You need at least one account to set up pay cycle
          </p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please create an account first before setting up your pay cycle.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-base font-medium">Set Up Your Pay Cycle</p>
        <p className="text-sm text-muted-foreground">
          This helps calculate when to move money between accounts
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert className="border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to save pay cycle configuration'}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="frequency">How often do you get paid?</Label>
          <Controller
            name="frequency"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="fortnightly">Fortnightly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.frequency && (
            <p className="text-body text-destructive">{errors.frequency.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nextPayDate">When is your next payday?</Label>
          <Controller
            name="nextPayDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                id="nextPayDate"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                shouldShowCalendarButton
                minDate={format(new Date(), 'yyyy-MM-dd')}
              />
            )}
          />
          {errors.nextPayDate && (
            <p className="text-body text-destructive">{errors.nextPayDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="primaryIncomeAccountId">
            Which account receives your main income? <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="primaryIncomeAccountId"
            control={control}
            render={({ field }) => (
              <AccountSelect
                id="primaryIncomeAccountId"
                value={field.value}
                onChange={field.onChange}
                placeholder="Select primary income account"
                error={errors.primaryIncomeAccountId?.message}
              />
            )}
          />
          {errors.primaryIncomeAccountId && (
            <p className="text-body text-destructive">{errors.primaryIncomeAccountId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="savingsAccountId">
            Which account should receive surplus funds? (Optional)
          </Label>
          <Controller
            name="savingsAccountId"
            control={control}
            render={({ field }) => (
              <AccountSelect
                id="savingsAccountId"
                value={field.value}
                onChange={field.onChange}
                placeholder="Select savings account (optional)"
                error={errors.savingsAccountId?.message}
              />
            )}
          />
          {errors.savingsAccountId && (
            <p className="text-body text-destructive">{errors.savingsAccountId.message}</p>
          )}
          <p className="text-caption text-muted-foreground">
            Any money left over after covering expenses will be suggested for transfer here.
          </p>
        </div>

        {payCycle && (
          <p className="text-caption text-muted-foreground">
            {t('allocate.editContextNote')}{' '}
            <Link
              to={ROUTES.app.budget}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              {t('allocate.editContextNoteLinkText')}
            </Link>
            .
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {payCycle ? t('allocate.saveCta') : 'Save Pay Cycle'}
          </Button>
        </div>
      </form>
    </div>
  );
}
