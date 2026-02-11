import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants/routes';
import { formatAmountByFrequency } from '../utils/frequencyNormalization';

interface UnallocatedWarningProps {
  amount: number; // Monthly amount
}

/**
 * Warning banner for expenses without account assignment
 * Shows total unallocated amount and navigation to assign accounts
 */
export function UnallocatedWarning({ amount }: UnallocatedWarningProps) {
  const navigate = useNavigate();

  const handleAssignAccounts = () => {
    // Navigate to budget page where user can assign accounts to expenses
    navigate(ROUTES.app.budget);
  };

  return (
    <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-200">Unallocated Expenses</AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
        <p className="mb-2">
          You have {formatAmountByFrequency(amount, 'monthly')} in recurring expenses not assigned to an account.
          Assign accounts to see accurate transfer needs.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAssignAccounts}
          className="mt-2 border-yellow-600 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-400 dark:text-yellow-200 dark:hover:bg-yellow-900"
        >
          Assign Accounts
        </Button>
      </AlertDescription>
    </Alert>
  );
}
