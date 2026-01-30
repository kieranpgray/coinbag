import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { AccountForm } from './AccountForm';
import type { AccountCreate } from '@/contracts/accounts';

interface CreateAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AccountCreate) => void;
  isLoading?: boolean;
  error?: { error: string; code: string };
}

export function CreateAccountModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  error,
}: CreateAccountModalProps) {
  const { t } = useTranslation(['accounts', 'common']);

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {t('createModal.addNewAccount', { ns: 'accounts' })}
          </DialogTitle>
          <DialogDescription>
            {t('createModal.createDescription', { ns: 'accounts' })}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert className="border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">{error.error}</AlertDescription>
          </Alert>
        )}
        <AccountForm
          onSubmit={onSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}

