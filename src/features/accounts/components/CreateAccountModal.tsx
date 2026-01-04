import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AccountForm } from './AccountForm';
import { StatementUploadStep } from './StatementUploadStep';
import type { AccountCreate } from '@/contracts/accounts';
import type { Account } from '@/types/domain';

interface CreateAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AccountCreate) => void;
  isLoading?: boolean;
  error?: { error: string; code: string };
  createdAccount?: Account | null; // Account created successfully, triggers transition to statements step
}

type Step = 'account' | 'statements';

export function CreateAccountModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  error,
  createdAccount: propCreatedAccount,
}: CreateAccountModalProps) {
  const { t } = useTranslation(['accounts', 'common']);
  const [step, setStep] = useState<Step>('account');
  const [createdAccount, setCreatedAccount] = useState<Account | null>(null);

  // Sync with prop when account is created - transition to statements step
  useEffect(() => {
    if (propCreatedAccount && !createdAccount && step === 'account') {
      setCreatedAccount(propCreatedAccount);
      setStep('statements');
    }
  }, [propCreatedAccount, createdAccount, step]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('account');
      setCreatedAccount(null);
    }
  }, [open]);

  const handleAccountSubmit = (data: AccountCreate) => {
    onSubmit(data);
    // Parent will handle account creation and pass createdAccount prop
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    // Reset state and close modal
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset state when canceling
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'account' 
              ? 'Add New Account'
              : t('createModal.uploadStatements', { ns: 'accounts' })}
          </DialogTitle>
          <DialogDescription>
            {step === 'account'
              ? ''
              : t('createModal.uploadDescription', { ns: 'accounts' })}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert className="border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">{error.error}</AlertDescription>
          </Alert>
        )}
        {step === 'account' ? (
          <AccountForm
            onSubmit={handleAccountSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        ) : createdAccount ? (
          <StatementUploadStep
            accountId={createdAccount.id}
            accountName={createdAccount.accountName}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

