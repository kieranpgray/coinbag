import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants/routes';
import { formatAmountByFrequency } from '../utils/frequencyNormalization';

interface UnallocatedWarningProps {
  /** Total unallocated amount in monthly terms (from calculateUnallocatedTotal); display format controlled by viewMode */
  amount: number;
  viewMode: 'weekly' | 'fortnightly' | 'monthly';
}

/**
 * Warning banner for expenses without account assignment
 * Shows total unallocated amount and navigation to assign accounts
 */
export function UnallocatedWarning({ amount, viewMode }: UnallocatedWarningProps) {
  const navigate = useNavigate();

  const handleAssignAccounts = () => {
    // Navigate to budget page where user can assign accounts to expenses
    navigate(ROUTES.app.budget);
  };

  return (
    <Alert className="border-[var(--warning)] bg-[var(--warning-light)]">
      <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
      <AlertTitle className="text-[var(--warning)]">Unallocated Expenses</AlertTitle>
      <AlertDescription className="text-[var(--warning)]">
        <p className="mb-2">
          You have {formatAmountByFrequency(amount, viewMode)} in recurring expenses not assigned to an account.
          Assign accounts to see accurate transfer needs.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAssignAccounts}
          className="mt-2 border-[var(--warning)] text-[var(--warning)] hover:bg-[var(--warning-light)]"
        >
          Assign Accounts
        </Button>
      </AlertDescription>
    </Alert>
  );
}
