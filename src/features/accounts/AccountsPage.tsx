import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccounts, useDeleteAccount, useAccount, useCreateAccount } from '@/features/accounts/hooks';
import { ROUTES } from '@/lib/constants/routes';
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
import { useLocale } from '@/contexts/LocaleContext';
import { useTranslation } from 'react-i18next';
import { Plus, Eye, EyeOff, RefreshCw, AlertTriangle, Trash2, ArrowLeft } from 'lucide-react';
import { DeleteAccountDialog } from '@/features/accounts/components/DeleteAccountDialog';
import { CreateAccountModal } from '@/features/accounts/components/CreateAccountModal';
import { TransactionList } from '@/features/transactions/components/TransactionList';
import { isAccountError } from '@/features/accounts/utils/errorUtils';
import type { Account } from '@/types/domain';
import type { AccountCreate } from '@/contracts/accounts';

export function AccountsPage() {
  const { accountId } = useParams<{ accountId?: string }>();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const { t } = useTranslation(['accounts', 'common', 'aria']);
  const { data: accounts = [], isLoading, error, refetch } = useAccounts();
  const { data: selectedAccountData, isLoading: isLoadingAccount } = useAccount(accountId || '');
  const deleteMutation = useDeleteAccount();
  const createMutation = useCreateAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newlyCreatedAccount, setNewlyCreatedAccount] = useState<string | null>(null);
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
          (account.institution && account.institution.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [accounts, typeFilter, searchQuery]);

  const accountTypes = [
    { value: 'all', label: t('accountTypes.all', { ns: 'accounts' }) },
    { value: 'Bank Account', label: t('accountTypes.bankAccount', { ns: 'accounts' }) },
    { value: 'Savings', label: t('accountTypes.savings', { ns: 'accounts' }) },
    { value: 'Credit Card', label: t('accountTypes.creditCard', { ns: 'accounts' }) },
    { value: 'Loan', label: t('accountTypes.loan', { ns: 'accounts' }) },
    { value: 'Other', label: t('accountTypes.other', { ns: 'accounts' }) },
  ];

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
          navigate(ROUTES.app.accounts);
        }
      },
    });
  };

  const handleAccountClick = (account: Account) => {
    navigate(ROUTES.app.accountsDetail(account.id));
  };

  const handleBackToAccounts = () => {
    navigate(ROUTES.app.accounts);
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
            {t('backToAccounts', { ns: 'accounts' })}
          </Button>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('accountNotFound', { ns: 'accounts' })}</AlertTitle>
            <AlertDescription className="mt-2">
              {t('accountNotFoundDescription', { ns: 'accounts' })}
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
            {t('backToAccounts', { ns: 'accounts' })}
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
                    <span className="text-sm text-muted-foreground">{t('labels.type', { ns: 'accounts' })}</span>
                    <p className="font-medium">{selectedAccountData.accountType}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">{t('labels.balance', { ns: 'accounts' })}</span>
                    <p className="font-medium">{formatCurrency(selectedAccountData.balance, locale)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">{t('labels.lastUpdated', { ns: 'accounts' })}</span>
                    <p className="font-medium">{formatDate(selectedAccountData.lastUpdated, locale)}</p>
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
          <h1 className="text-2xl sm:text-3xl font-bold">{t('title', { ns: 'accounts' })}</h1>
          <Button disabled className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t('addNewAccountButton', { ns: 'accounts' })}
          </Button>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('unableToLoad', { ns: 'accounts' })}</AlertTitle>
          <AlertDescription className="mt-2">
            {t('unableToLoadDescription', { ns: 'accounts' })}
          </AlertDescription>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('tryAgain', { ns: 'common' })}
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

  return (
    <>
      {/* Show page-level empty state when no accounts exist */}
      {accounts.length === 0 ? (
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
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold">Accounts</h1>
            <Button onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              ADD NEW ACCOUNT
            </Button>
          </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder={t('searchPlaceholder', { ns: 'accounts' })}
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
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Accounts Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tableHeaders.institution', { ns: 'accounts' })}</TableHead>
              <TableHead>{t('tableHeaders.accountName', { ns: 'accounts' })}</TableHead>
              <TableHead>{t('tableHeaders.accountType', { ns: 'accounts' })}</TableHead>
              <TableHead className="text-right">{t('tableHeaders.balance', { ns: 'accounts' })}</TableHead>
              <TableHead>{t('tableHeaders.lastUpdated', { ns: 'accounts' })}</TableHead>
              <TableHead className="text-right">{t('tableHeaders.hidden', { ns: 'accounts' })}</TableHead>
              <TableHead className="text-right">{t('tableHeaders.actions', { ns: 'accounts' })}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {t('noAccountsFound', { ns: 'accounts' })}
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => (
                <TableRow
                  key={account.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleAccountClick(account)}
                >
                  <TableCell className="font-medium">{account.institution || '-'}</TableCell>
                  <TableCell>{account.accountName}</TableCell>
                  <TableCell>{account.accountType}</TableCell>
                  <TableCell className="text-right">{formatCurrency(account.balance, locale)}</TableCell>
                  <TableCell>{formatDate(account.lastUpdated, locale)}</TableCell>
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
                      aria-label={t('deleteAccount', { ns: 'aria' })}
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
      )}

      {/* Create Account Modal - Always rendered so it works from empty state */}
      <CreateAccountModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          // Reset error state when closing modal
          if (!open) {
            createMutation.reset();
            setNewlyCreatedAccount(null);
          }
        }}
        onSubmit={(data: AccountCreate) => {
          createMutation.mutate(data, {
            onSuccess: (account) => {
              // Store the created account directly - it's returned from the mutation
              setNewlyCreatedAccount(account.id);
              // Modal will transition to statements step automatically via createdAccount prop
            },
            onError: (error: unknown) => {
              // Error will be displayed in the form via the mutation error state
              console.error('Account creation error:', error);
            },
          });
        }}
        isLoading={createMutation.isPending}
        error={isAccountError(createMutation.error) ? createMutation.error : undefined}
        createdAccount={
          newlyCreatedAccount && createMutation.data
            ? createMutation.data
            : newlyCreatedAccount
            ? accounts.find(a => a.id === newlyCreatedAccount) || null
            : null
        }
      />
    </>
  );
}
