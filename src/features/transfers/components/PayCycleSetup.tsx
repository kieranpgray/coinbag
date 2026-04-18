import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePayCycle } from '../hooks';
import { useAccounts } from '@/features/accounts/hooks';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { PayCycleConfig } from '@/types/domain';
import { ROUTES } from '@/lib/constants/routes';
import { useTranslation } from 'react-i18next';
import {
  payCycleSchema,
  PayCycleFormData,
  PayCycleFormFields,
  defaultPayCycleFormValues,
} from './PayCycleFormFields';

export interface PayCycleSetupProps {
  /** Called after pay cycle is successfully saved; e.g. close modal when used inside a dialog */
  onSuccess?: () => void;
}

/**
 * Component for setting up pay cycle configuration.
 * Shown when user hasn't configured their pay cycle yet (first-time wizard).
 * Uses shared PayCycleFormFields for the form fields.
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
      : defaultPayCycleFormValues(),
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

        <PayCycleFormFields control={control} errors={errors} fieldClassName="space-y-2" />

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
