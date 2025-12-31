import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccounts, useDeleteAccount, useAccount } from '@/features/accounts/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Eye, EyeOff, RefreshCw, AlertTriangle, Trash2, ArrowLeft } from 'lucide-react';
import { DeleteAccountDialog } from '@/features/accounts/components/DeleteAccountDialog';
import { TransactionList } from '@/features/transactions/components/TransactionList';
import type { Account } from '@/types/domain';

export function AccountsPage() {
  const { accountId } = useParams<{ accountId?: string }>();
  const navigate = useNavigate();
  const { data: accounts = [], isLoading, error, refetch } = useAccounts();
  const { data: selectedAccountData, isLoading: isLoadingAccount } = useAccount(accountId || '');
  const deleteMutation = useDeleteAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Filter and search accounts
  const filteredAccounts = useMemo(() => {
    let filtered = accounts;

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((account) => account.accountType === typeFilter);
    }

    // Search by name or institution
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (account) =>
          account.accountName.toLowerCase().includes(query) ||
          account.institution.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [accounts, typeFilter, searchQuery]);

  const accountTypes = ['all', 'Checking', 'Savings', 'Investment', 'Credit Card', 'Loan', 'Crypto'];

  const handleDelete = (account: Account) => {
    setSelectedAccount(account);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedAccount) return;
    deleteMutation.mutate(selectedAccount.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setSelectedAccount(null);
        // If we're viewing the deleted account, navigate back to accounts list
        if (accountId === selectedAccount.id) {
          navigate('/accounts');
        }
      },
    });
  };

  const handleAccountClick = (account: Account) => {
    navigate(`/accounts/${account.id}`);
  };

  const handleBackToAccounts = () => {
    navigate('/accounts');
  };

  // Account Detail View (when accountId is in URL)
  if (accountId) {
    if (isLoadingAccount) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    if (!selectedAccountData) {
      return (
        <div className="space-y-6">
          <Button variant="ghost" onClick={handleBackToAccounts} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accounts
          </Button>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Account not found</AlertTitle>
            <AlertDescription className="mt-2">
              The account you're looking for doesn't exist or has been deleted.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackToAccounts}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accounts
          </Button>
        </div>

        {/* Account Summary */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{selectedAccountData.accountName}</h1>
                <p className="text-muted-foreground mb-4">{selectedAccountData.institution}</p>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Type</span>
                    <p className="font-medium">{selectedAccountData.accountType}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Balance</span>
                    <p className="font-medium">{formatCurrency(selectedAccountData.balance)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Available</span>
                    <p className="font-medium">
                      {formatCurrency(selectedAccountData.availableBalance)}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Last Updated</span>
                    <p className="font-medium">{formatDate(selectedAccountData.lastUpdated)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedAccountData.hidden ? (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Eye className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <TransactionList accountId={accountId} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Accounts</h1>
          <Button disabled className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            ADD NEW ACCOUNT
          </Button>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load accounts</AlertTitle>
          <AlertDescription className="mt-2">
            We couldn't load your accounts. Please try again.
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Try again
          </Button>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Show page-level empty state when no accounts exist
  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Accounts</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-12 h-12 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No accounts yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Add an account to track balances and unlock transaction history.
            </p>
            <Button onClick={() => {
              alert('Account creation not yet implemented');
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Accounts</h1>
        <Button onClick={() => {
          alert('Account creation not yet implemented');
        }} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          ADD NEW ACCOUNT
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search accounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {accountTypes.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type}
            </option>
          ))}
        </select>
      </div>

      {/* Accounts Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Institution</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Available Balance</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No accounts found
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => (
                <TableRow
                  key={account.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleAccountClick(account)}
                >
                  <TableCell className="font-medium">{account.institution}</TableCell>
                  <TableCell>{account.accountName}</TableCell>
                  <TableCell>{account.accountType}</TableCell>
                  <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(account.availableBalance)}
                  </TableCell>
                  <TableCell>{formatDate(account.lastUpdated)}</TableCell>
                  <TableCell className="text-right">
                    {account.hidden ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground inline" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground inline" />
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(account)}
                      aria-label="Delete account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Dialog */}
      <DeleteAccountDialog
        account={selectedAccount}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
