import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

/**
 * TransactionsPage - Redirects to Accounts page
 * Transactions are now accessed via /accounts/:accountId
 * This component handles the redirect for backward compatibility
 */
export function TransactionsPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to accounts page
    navigate('/accounts', { replace: true });
  }, [navigate]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Redirecting to Accounts...</p>
        </CardContent>
      </Card>
    </div>
  );
}

