import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransferSuggestions } from '../hooks';
import { useCashFlowByAccount } from '../hooks/useCashFlowByAccount';
import { usePayCycle } from '../hooks/usePayCycle';
import { TransferSuggestionRow } from './TransferSuggestionRow';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/lib/constants/routes';
import { format } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TransferSuggestionsProps {
  viewMode: 'weekly' | 'fortnightly' | 'monthly';
  onViewModeChange: (mode: 'weekly' | 'fortnightly' | 'monthly') => void;
  /** Formatted next pay date for hero headline: "Move these amounts by [date]" */
  nextPayDateFormatted?: string;
  hasIncome: boolean;
  hasExpenses: boolean;
  /** True when the next pay date is still in the future (between-cycles state) */
  isUpcoming: boolean;
  /** Display name of the primary income account */
  primaryAccountName?: string;
}

/** Small labelled section heading with an optional tooltip. */
function SectionLabel({
  label,
  tooltip,
  className,
}: {
  label: string;
  tooltip?: string;
  className?: string;
}) {
  if (!tooltip) {
    return (
      <li className={`pt-4 pb-2 text-caption font-medium uppercase tracking-wide text-muted-foreground ${className ?? ''}`}>
        {label}
      </li>
    );
  }

  return (
    <li className={`pt-4 pb-2 ${className ?? ''}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 cursor-default text-caption font-medium uppercase tracking-wide text-muted-foreground">
              {label}
              <Info className="h-3 w-3 shrink-0" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px]">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </li>
  );
}

/**
 * Hero block: suggested transfers with time-bound headline and list rows (no nested cards).
 */
export function TransferSuggestions({
  viewMode,
  onViewModeChange,
  nextPayDateFormatted,
  hasIncome,
  hasExpenses,
  isUpcoming,
  primaryAccountName = '',
}: TransferSuggestionsProps) {
  const { t } = useTranslation('pages');
  const navigate = useNavigate();
  const { data: suggestions = [], isLoading, error } = useTransferSuggestions();
  const { data: cashFlowByAccount = [] } = useCashFlowByAccount();
  const { payCycle } = usePayCycle();

  const repaymentRows = suggestions.filter(
    (suggestion) => suggestion.kind === 'repayment' || suggestion.kind === 'action_required_repayment'
  );
  const coverageRows = suggestions.filter((suggestion) => suggestion.kind === 'coverage' || !suggestion.kind);
  const surplusRows = suggestions.filter((suggestion) => suggestion.kind === 'surplus');

  // Cash flow totals for shortfall / surplus-destination logic
  const totalMonthlyIncome = cashFlowByAccount.reduce((sum, a) => sum + a.monthlyIncome, 0);
  const totalMonthlyExpenses = cashFlowByAccount.reduce((sum, a) => sum + a.monthlyExpenses, 0);
  const netAmount = totalMonthlyIncome - totalMonthlyExpenses;
  const hasShortfall = totalMonthlyIncome > 0 && netAmount < 0;
  const hasSurplus = netAmount > 0;
  const hasSurplusDestination = !!payCycle?.savingsAccountId;

  // Upcoming state: format arrival label components
  const upcomingDay = payCycle ? format(new Date(payCycle.nextPayDate), 'EEEE') : '';
  const upcomingDate = payCycle ? format(new Date(payCycle.nextPayDate), 'd MMM') : '';

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
          <h2 className="text-h2-sm sm:text-h2-md font-medium mb-2">{heroHeadline}</h2>
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
          <h2 className="text-h2-sm sm:text-h2-md font-medium mb-2">{heroHeadline}</h2>
          {!hasIncome ? (
            <>
              <h3 className="text-h3 font-medium text-foreground mb-2">
                {t('emptyStates.allocateNoIncome.headline')}
              </h3>
              <p className="text-body text-muted-foreground mb-4 text-balance max-w-prose">
                {t('emptyStates.allocateNoIncome.body')}
              </p>
              <Button asChild size="sm" aria-label={t('emptyStates.allocateNoIncome.ctaAriaLabel')}>
                <Link to={ROUTES.app.budget}>{t('emptyStates.allocateNoIncome.cta')}</Link>
              </Button>
            </>
          ) : !hasExpenses ? (
            <>
              <h3 className="text-h3 font-medium text-foreground mb-2">
                {t('emptyStates.allocateNoExpenses.headline')}
              </h3>
              <p className="text-body text-muted-foreground mb-4 text-balance max-w-prose">
                {t('emptyStates.allocateNoExpenses.body')}
              </p>
              <Button asChild size="sm" aria-label={t('emptyStates.allocateNoExpenses.ctaAriaLabel')}>
                <Link to={ROUTES.app.budget}>{t('emptyStates.allocateNoExpenses.cta')}</Link>
              </Button>
            </>
          ) : (
            <p className="text-body text-muted-foreground text-balance max-w-prose">
              {t('emptyStates.allocateNoSuggestionsFallback.body')}
            </p>
          )}
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
        {/* Pay day plan label + hero headline */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 cursor-default text-caption font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    {t('allocate.sections.paydayPlan')}
                    <Info className="h-3 w-3 shrink-0" aria-hidden />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px]">
                  {t('allocate.tooltips.paydayPlan')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Upcoming state: replace hero headline with upcoming header */}
            {isUpcoming ? (
              <div>
                <h2 className="text-h2-sm sm:text-h2-md font-medium">
                  {t('allocate.upcoming.heading')}
                </h2>
                {primaryAccountName && upcomingDay && upcomingDate && (
                  <p className="text-body text-muted-foreground mt-0.5">
                    {t('allocate.upcoming.arrivalLabel', {
                      incomeName: primaryAccountName,
                      day: upcomingDay,
                      date: upcomingDate,
                    })}
                  </p>
                )}
              </div>
            ) : (
              <h2 className="text-h2-sm sm:text-h2-md font-medium">{heroHeadline}</h2>
            )}
          </div>

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

        {/* Upcoming preview label + helper */}
        {isUpcoming && (
          <div className="mb-2">
            <p className="text-body font-medium text-foreground">
              {t('allocate.upcoming.previewLabel')}
            </p>
            <p className="text-caption text-muted-foreground mt-0.5">
              {t('allocate.upcoming.helper')}
            </p>
          </div>
        )}

        <ul className="space-y-0 list-none p-0 m-0">
          {repaymentRows.length > 0 && (
            <>
              <SectionLabel label={t('allocate.sections.requiredRepayments')} />
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
              <SectionLabel
                label={t('allocate.sections.committed')}
                tooltip={t('allocate.tooltips.committed')}
              />
              {coverageRows.map((suggestion, index) => (
                <TransferSuggestionRow
                  key={`${suggestion.fromAccountId}-${suggestion.toAccountId}-${index}`}
                  suggestion={suggestion}
                  viewMode={viewMode}
                />
              ))}
            </>
          )}

          {/* Shortfall state: committed expenses exceed income */}
          {hasShortfall ? (
            <>
              <SectionLabel
                label={t('allocate.shortfall.label')}
                className="text-destructive"
              />
              <li className="py-3">
                <p className="text-body text-muted-foreground mb-2">
                  {t('allocate.shortfall.message')}
                </p>
                <Link
                  to={ROUTES.app.budget}
                  className="text-body text-destructive font-medium hover:underline underline-offset-2"
                >
                  {t('allocate.shortfall.cta')}
                </Link>
              </li>
            </>
          ) : (
            /* Surplus state (only shown when NOT in shortfall) */
            (hasSurplus || surplusRows.length > 0) && (
              <>
                <SectionLabel
                  label={t('allocate.sections.surplus')}
                  tooltip={t('allocate.tooltips.surplus')}
                />
                {surplusRows.map((suggestion, index) => (
                  <TransferSuggestionRow
                    key={`${suggestion.fromAccountId}-${suggestion.toAccountId}-${index}`}
                    suggestion={suggestion}
                    viewMode={viewMode}
                  />
                ))}

                {/* Surplus destination copy */}
                {hasSurplus && !hasSurplusDestination && surplusRows.length === 0 && (
                  <li className="py-3">
                    <p className="text-body text-muted-foreground italic">
                      {t('allocate.surplusDestination.unsetPrompt')}
                    </p>
                  </li>
                )}
                {hasSurplus && hasSurplusDestination && surplusRows.length > 0 && (
                  <li className="py-2">
                    <p className="text-caption text-muted-foreground">
                      {t('allocate.surplusDestination.setHelper')}
                    </p>
                  </li>
                )}
              </>
            )
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
