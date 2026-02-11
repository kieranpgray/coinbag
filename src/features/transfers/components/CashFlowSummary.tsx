import { useCashFlowByAccount } from '../hooks';
import { AccountCashFlowRow } from './AccountCashFlowRow';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronRight } from 'lucide-react';

/**
 * Collapsible "By account" section — supporting context so Suggested Transfers stays hero.
 * Default closed; uses native <details>/<summary> for accessibility.
 */
export function CashFlowSummary() {
  const { data: cashFlow = [], isLoading, error } = useCashFlowByAccount();

  const accountsWithActivity = cashFlow.filter(
    (flow) => flow.monthlyIncome > 0 || flow.monthlyExpenses > 0
  );
  const hasAccounts = accountsWithActivity.length > 0;

  return (
    <details
      className="group rounded-lg border bg-card text-card-foreground"
      open={false}
      aria-label="Account cash flow by account"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold text-sm focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
        <h2 className="text-sm font-semibold leading-none">Account cash flow</h2>
      </summary>
      <div className="px-4 pb-4 pt-0">
        {isLoading && (
          <ul className="space-y-0">
            {[1, 2, 3].map((i) => (
              <li key={i} className="py-3 border-b border-border">
                <Skeleton className="h-16 w-full" />
              </li>
            ))}
          </ul>
        )}
        {error && (
          <Alert className="border-destructive bg-destructive/10">
            <AlertDescription>
              Failed to load cash flow data. Please try again.
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && !error && !hasAccounts && (
          <p className="text-sm text-muted-foreground py-2">
            Add income and expenses with account assignments to see cash flow and transfer
            suggestions.
          </p>
        )}
        {!isLoading && !error && hasAccounts && (
          <ul className="space-y-0 list-none p-0 m-0">
            {accountsWithActivity.map((accountFlow) => (
              <AccountCashFlowRow key={accountFlow.accountId} accountFlow={accountFlow} />
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
