import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePayCycle } from './hooks';
import { useExpenses } from '@/features/expenses/hooks';
import { useIncomes } from '@/features/income/hooks';
import { useAccounts } from '@/features/accounts/hooks';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { calculateUnallocatedTotal } from './utils/transferCalculations';
import { PayCycleSetup } from './components/PayCycleSetup';
import { CashFlowSummary } from './components/CashFlowSummary';
import { TransferSuggestions } from './components/TransferSuggestions';
import { UnallocatedWarning } from './components/UnallocatedWarning';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

/** Returns an ISO-format date string (YYYY-MM-DD) for today's date */
function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Main Transfers page component
 * Displays pay cycle info, cash flow summaries, and transfer suggestions
 */
export default function TransfersPage() {
  const { t } = useTranslation(['pages', 'navigation']);

  useEffect(() => {
    document.title = t('allocateDocumentTitle', { ns: 'pages' });
    return () => {
      document.title = 'Supafolio';
    };
  }, [t]);

  const { payCycle, isLoading: payCycleLoading } = usePayCycle();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: incomes = [], isLoading: incomesLoading } = useIncomes();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: preferences } = useUserPreferences();
  const [editPayCycleOpen, setEditPayCycleOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'weekly' | 'fortnightly' | 'monthly'>(
    (preferences?.transferViewMode as 'weekly' | 'fortnightly' | 'monthly') || 'monthly'
  );

  const unallocatedTotal = calculateUnallocatedTotal(expenses);
  const hasUnallocated = unallocatedTotal > 0;

  // Validate that primary account still exists
  const primaryAccountExists = payCycle
    ? accounts.some((acc) => acc.id === payCycle.primaryIncomeAccountId)
    : true;

  // Validate that savings account still exists (if configured)
  const savingsAccountExists = payCycle?.savingsAccountId
    ? accounts.some((acc) => acc.id === payCycle.savingsAccountId)
    : true;

  const hasInvalidAccounts = payCycle && (!primaryAccountExists || !savingsAccountExists);

  // Determine if next pay date is in the future (between-cycles / upcoming state)
  const isUpcoming = payCycle ? payCycle.nextPayDate > todayISO() : false;

  // Dynamic subtitle: editing → upcoming → active → fallback
  const pageSubtitle = editPayCycleOpen
    ? t('allocateSubtitleEditing', { ns: 'pages' })
    : !payCycle
    ? t('allocateSubtitle', { ns: 'pages' })
    : isUpcoming
    ? t('allocateSubtitleUpcoming', { ns: 'pages' })
    : t('allocateSubtitleActive', {
        ns: 'pages',
        date: format(new Date(payCycle.nextPayDate), 'EEEE d MMM'),
      });

  // Show setup if no pay cycle configured (align layout with Budget page)
  if (!payCycle && !payCycleLoading) {
    return (
      <div className="space-y-12">
        <div>
          <h1 className="page-title">
            {t('transfers', { ns: 'navigation' })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{pageSubtitle}</p>
        </div>
        <PayCycleSetup />
      </div>
    );
  }

  // Show loading state
  if (payCycleLoading || expensesLoading || accountsLoading || incomesLoading) {
    return (
      <div className="space-y-12">
        <div>
          <h1 className="page-title">
            {t('transfers', { ns: 'navigation' })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{pageSubtitle}</p>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Format next pay date
  const nextPayDateFormatted = payCycle
    ? format(new Date(payCycle.nextPayDate), 'EEEE d MMM yyyy')
    : '';

  const primaryAccountName = payCycle
    ? accounts.find((acc) => acc.id === payCycle.primaryIncomeAccountId)?.accountName || 'Unknown'
    : '';

  return (
    <div className="space-y-12">
      {/* Header: title + secondary Edit plan (align with Budget page tokens) */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">
            {t('transfers', { ns: 'navigation' })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{pageSubtitle}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditPayCycleOpen(true)}>
          Edit plan
        </Button>
      </div>

      {/* Pay cycle context bar */}
      {payCycle && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-body-sm text-foreground">
            <strong>Next pay:</strong> {nextPayDateFormatted} ·{' '}
            {payCycle.frequency === 'weekly'
              ? 'Weekly'
              : payCycle.frequency === 'fortnightly'
              ? 'Fortnightly'
              : 'Monthly'}{' '}
            → {primaryAccountName}
          </p>
        </div>
      )}

      {/* Account validation error */}
      {hasInvalidAccounts && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Account Configuration Error</AlertTitle>
          <AlertDescription>
            {!primaryAccountExists && 'Your primary income account no longer exists. '}
            {!savingsAccountExists && 'Your savings account no longer exists. '}
            Please update your pay cycle configuration.
          </AlertDescription>
        </Alert>
      )}

      {/* Unallocated Warning */}
      {hasUnallocated && <UnallocatedWarning amount={unallocatedTotal} viewMode={viewMode} />}

      {/* Hero: Suggested Transfers (before Cash Flow so it dominates) */}
      {!hasInvalidAccounts && (
        <TransferSuggestions
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          nextPayDateFormatted={nextPayDateFormatted}
          hasIncome={incomes.length > 0}
          hasExpenses={expenses.length > 0}
          isUpcoming={isUpcoming}
          primaryAccountName={primaryAccountName}
        />
      )}

      {/* Supporting: Cash Flow by account (collapsible in Phase 3) */}
      <CashFlowSummary viewMode={viewMode} />

      {/* Edit Pay Cycle Modal */}
      <Dialog open={editPayCycleOpen} onOpenChange={setEditPayCycleOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Pay Cycle</DialogTitle>
          </DialogHeader>
          <PayCycleSetup onSuccess={() => setEditPayCycleOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
