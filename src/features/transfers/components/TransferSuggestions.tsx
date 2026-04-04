import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransferSuggestions } from '../hooks';
import { TransferSuggestionRow } from './TransferSuggestionRow';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants/routes';

interface TransferSuggestionsProps {
  viewMode: 'weekly' | 'fortnightly' | 'monthly';
  onViewModeChange: (mode: 'weekly' | 'fortnightly' | 'monthly') => void;
  /** Formatted next pay date for hero headline: "Move these amounts by [date]" */
  nextPayDateFormatted?: string;
}

/**
 * Hero block: suggested transfers with time-bound headline and list rows (no nested cards).
 */
export function TransferSuggestions({
  viewMode,
  onViewModeChange,
  nextPayDateFormatted,
}: TransferSuggestionsProps) {
  const navigate = useNavigate();
  const { data: suggestions = [], isLoading, error } = useTransferSuggestions();
  const repaymentRows = suggestions.filter(
    (suggestion) => suggestion.kind === 'repayment' || suggestion.kind === 'action_required_repayment'
  );
  const coverageRows = suggestions.filter((suggestion) => suggestion.kind === 'coverage' || !suggestion.kind);
  const surplusRows = suggestions.filter((suggestion) => suggestion.kind === 'surplus');

  const heroHeadline = nextPayDateFormatted
    ? `Move these amounts by ${nextPayDateFormatted}`
    : 'Suggested transfers';

  if (isLoading) {
    return (
      <section
        className="rounded-lg border bg-card text-card-foreground"
        aria-label="Suggested transfers"
      >
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-9 w-[140px]" />
          </div>
          <ul className="space-y-0">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="py-4 border-b border-border last:border-b-0">
                <Skeleton className="h-12 w-full" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="rounded-lg border bg-card text-card-foreground"
        aria-label="Suggested transfers"
      >
        <div className="p-4 sm:p-6">
          <h2 className="text-xl font-semibold mb-2">{heroHeadline}</h2>
          <Alert className="border-destructive bg-destructive/10">
            <AlertDescription>
              Failed to load transfer suggestions. Please try again.
            </AlertDescription>
          </Alert>
        </div>
      </section>
    );
  }

  if (suggestions.length === 0) {
    return (
      <section
        className="rounded-lg border bg-card text-card-foreground"
        aria-label="Suggested transfers"
      >
        <div className="p-4 sm:p-6">
          <h2 className="text-xl font-semibold mb-2">{heroHeadline}</h2>
          <p className="text-body text-muted-foreground">
            When you have income in one account and expenses in another, we&apos;ll show what to
            move here so your expenses are covered. Add income and expenses with account
            assignments to get started.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border bg-card text-card-foreground"
      aria-label="Suggested transfers"
    >
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold">{heroHeadline}</h2>
          <Select value={viewMode} onValueChange={onViewModeChange}>
            <SelectTrigger className="w-full sm:w-[140px]" aria-label="View amount by period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="fortnightly">Fortnightly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ul className="space-y-0 list-none p-0 m-0">
          {repaymentRows.length > 0 && (
            <>
              <li className="pt-1 pb-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                Required repayments
              </li>
              {repaymentRows.map((suggestion, index) => (
                <TransferSuggestionRow
                  key={`${suggestion.fromAccountId}-${suggestion.toAccountId}-${index}`}
                  suggestion={suggestion}
                  viewMode={viewMode}
                  onEditExpense={(expenseId) =>
                    navigate(`${ROUTES.app.budget}?editExpense=${expenseId}`)
                  }
                />
              ))}
            </>
          )}
          {coverageRows.length > 0 && (
            <>
              <li className="pt-4 pb-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                Other transfers (excludes repayments)
              </li>
              {coverageRows.map((suggestion, index) => (
                <TransferSuggestionRow
                  key={`${suggestion.fromAccountId}-${suggestion.toAccountId}-${index}`}
                  suggestion={suggestion}
                  viewMode={viewMode}
                />
              ))}
            </>
          )}
          {surplusRows.length > 0 && (
            <>
              <li className="pt-4 pb-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                Surplus
              </li>
              {surplusRows.map((suggestion, index) => (
                <TransferSuggestionRow
                  key={`${suggestion.fromAccountId}-${suggestion.toAccountId}-${index}`}
                  suggestion={suggestion}
                  viewMode={viewMode}
                />
              ))}
            </>
          )}
        </ul>
        <p className="flex items-center gap-2 mt-4 text-caption text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Repayment rows are listed explicitly and excluded from other transfer totals.
        </p>
      </div>
    </section>
  );
}
