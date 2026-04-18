/**
 * TransfersPage (Allocate)
 *
 * Layout:
 *   1. Page header + cycle strip (sticky, via AllocateCycleStrip)
 *   2. Page content column (.plan-col):
 *      a. AllocateEditPanel (inline, above plan stack)
 *      b. AllocatePlanStack (upcoming banner + income card + committed + surplus)
 *      c. UnallocatedWarning (if any)
 *
 * Edit panel behaviour:
 *   - Opening: subtitle transitions to "Adjusting your plan".
 *   - Closing via Cancel: form resets to last-saved payCycle, panel hides.
 *   - Closing via Save: updatePayCycle writes globally, panel hides.
 *   - If user navigates to a different cycle while edit is open: close + reset.
 *
 * No Dialog for primary edit path — replaced by AllocateEditPanel.
 * TransferSuggestions hero removed from this surface (legacy, replaced by plan stack).
 */

import './allocate.css';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/contexts/LocaleContext';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { usePayCycle } from './hooks';
import { useExpenses } from '@/features/expenses/hooks';
import { useIncomes } from '@/features/income/hooks';
import { useAccounts } from '@/features/accounts/hooks';
import { useCategories } from '@/features/categories/hooks';
import { calculateUnallocatedTotal } from './utils/transferCalculations';
import { buildPayCycles, getCycleAtIndex } from './utils/payCycles';
import { buildCommittedRows, sumCommittedRows } from './utils/allocateCommitted';
import { getPrimaryIncomeInfo, getSecondaryIncomeLinks } from './utils/allocateIncome';
import { PayCycleSetup } from './components/PayCycleSetup';
import { UnallocatedWarning } from './components/UnallocatedWarning';
import { AllocateCycleStrip } from './components/AllocateCycleStrip';
import { AllocateEditPanel } from './components/AllocateEditPanel';
import { AllocatePlanStack } from './components/AllocatePlanStack';
import { UpcomingTransfersSection } from './components/UpcomingTransfersSection';
import { ConfirmPlanFooter } from './components/ConfirmPlanFooter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { buildUpcomingTransfers } from './utils/buildUpcomingTransfers';
import type { PayCycleConfig } from '@/types/domain';

/**
 * Main Allocate page component.
 */
export default function TransfersPage() {
  const { t } = useTranslation(['pages', 'navigation']);
  const { locale } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const editStripAttempts = useRef(0);

  useEffect(() => {
    document.title = t('allocateDocumentTitle', { ns: 'pages' });
    return () => {
      document.title = 'Supafolio';
    };
  }, [t]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { payCycle, updatePayCycle, isLoading: payCycleLoading } = usePayCycle();
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
  const { data: incomes = [], isLoading: incomesLoading } = useIncomes();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCycleIndex, setSelectedCycleIndex] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerDraftAccountId, setPickerDraftAccountId] = useState<string | null>(null);
  const [isConfirmingDestination, setIsConfirmingDestination] = useState(false);

  // ── ?edit=1 deep link (Recurring CTAs): open panel when pay cycle exists, then strip query ──
  useEffect(() => {
    if (searchParams.get('edit') !== '1') return;
    if (payCycleLoading) return;
    if (payCycle) {
      setIsEditOpen(true);
    }
    const next = new URLSearchParams(searchParams);
    if (!next.has('edit')) return;
    next.delete('edit');
    if (editStripAttempts.current >= 3) return;
    editStripAttempts.current += 1;
    setSearchParams(next, { replace: true });
  }, [payCycle, payCycleLoading, searchParams, setSearchParams]);

  // ── Cycle navigation ───────────────────────────────────────────────────────
  // Memoised — buildPayCycles allocates 49 Date objects and runs format() ×98.
  // Depends on primitives only so payCycle object reference changes don't retrigger.
  // Guards against malformed nextPayDate from corrupted user preferences.
  const { cycles, defaultIndex } = useMemo(() => {
    if (!payCycle) return { cycles: [], defaultIndex: 0 };
    try {
      return buildPayCycles(payCycle);
    } catch {
      return { cycles: [], defaultIndex: 0 };
    }
  }, [payCycle?.frequency, payCycle?.nextPayDate]);

  // Initialise selected index once cycles are available
  useEffect(() => {
    if (cycles.length > 0 && selectedCycleIndex === null) {
      setSelectedCycleIndex(defaultIndex);
    }
  }, [cycles.length, defaultIndex, selectedCycleIndex]);

  const activeIndex = selectedCycleIndex ?? defaultIndex;
  const { cycle: selectedCycle } = cycles.length > 0
    ? getCycleAtIndex(cycles, activeIndex)
    : { cycle: null };

  // When user navigates cycles while edit panel is open → close + reset form
  const handleCycleIndexChange = (newIndex: number) => {
    if (isEditOpen) {
      setIsEditOpen(false);
    }
    setSelectedCycleIndex(newIndex);
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const unallocatedTotal = calculateUnallocatedTotal(expenses);
  const hasUnallocated = unallocatedTotal > 0;

  const primaryAccountExists = payCycle
    ? accounts.some((acc) => acc.id === payCycle.primaryIncomeAccountId)
    : true;
  const savingsAccountExists = payCycle?.savingsAccountId
    ? accounts.some((acc) => acc.id === payCycle.savingsAccountId)
    : true;
  const hasInvalidAccounts = payCycle && (!primaryAccountExists || !savingsAccountExists);

  // Income info
  const primaryIncomeInfo = payCycle
    ? getPrimaryIncomeInfo(incomes, accounts, payCycle)
    : null;
  const secondaryIncomeLinks = payCycle
    ? getSecondaryIncomeLinks(incomes, accounts, payCycle, locale)
    : [];

  // Committed rows — memoised; iterates expenses × categories per render otherwise.
  const committedRows = useMemo(
    () =>
      payCycle ? buildCommittedRows(expenses, categories, payCycle.frequency) : [],
    [expenses, categories, payCycle?.frequency]
  );
  const committedTotal = useMemo(() => sumCommittedRows(committedRows), [committedRows]);

  // Surplus
  const cycleIncome = primaryIncomeInfo?.cycleAmount ?? 0;
  const surplusAmount = cycleIncome - committedTotal;

  // Upcoming transfer rows — grouped by paid-from account + selected cycle
  const upcomingTransferRows = useMemo(
    () =>
      selectedCycle && payCycle
        ? buildUpcomingTransfers(
            expenses,
            accounts,
            payCycle.frequency,
            selectedCycle.payDate,
            selectedCycle.state
          )
        : [],
    [expenses, accounts, payCycle?.frequency, selectedCycle?.payDate, selectedCycle?.state]
  );

  const upcomingTransfersTotal = useMemo(
    () => upcomingTransferRows.reduce((s, r) => s + r.amount, 0),
    [upcomingTransferRows]
  );

  // Savings account info
  const savingsAccount = payCycle?.savingsAccountId
    ? accounts.find((a) => a.id === payCycle.savingsAccountId) ?? null
    : null;

  // ── Destination confirm ────────────────────────────────────────────────────
  // Owns the full async flow: set loading → save → close picker on success.
  // If the save fails the picker stays open and the user sees the error state.
  const handleDestinationConfirm = async (accountId: string) => {
    if (!payCycle) return;
    setIsConfirmingDestination(true);
    try {
      const updatedConfig: PayCycleConfig = { ...payCycle, savingsAccountId: accountId };
      await updatePayCycle(updatedConfig);
      setIsPickerOpen(false);
      setPickerDraftAccountId(null);
    } finally {
      setIsConfirmingDestination(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  const isLoading =
    payCycleLoading || expensesLoading || accountsLoading || incomesLoading || categoriesLoading;

  const hasMalformedPayDate = Boolean(payCycle && !isLoading && cycles.length === 0);
  const showRepaymentDisclaimer = isFeatureEnabled('explicit_repayment_transfers');

  // ── Empty state: no pay cycle configured ──────────────────────────────────
  if (!payCycle && !isLoading) {
    return (
      <div className="allocate-page">
        <div className="page-header mb-8">
          <div className="page-header-left">
            <h1 className="page-title">{t('transfers', { ns: 'navigation' })}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('allocate.shell.subtitle', { ns: 'pages' })}
            </p>
          </div>
        </div>
        <PayCycleSetup />
      </div>
    );
  }

  // ── Malformed next pay date: cycles cannot be built ────────────────────────
  if (hasMalformedPayDate) {
    return (
      <div className="allocate-page">
        <div className="page-header mb-6">
          <div className="page-header-left">
            <h1 className="page-title">{t('transfers', { ns: 'navigation' })}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('allocateSubtitle', { ns: 'pages' })}</p>
          </div>
        </div>
        <div className="page-content">
          <div className="plan-col max-w-xl">
            <div className="alert alert-danger mb-4" role="alert">
              <p>{t('allocate.dateError.description', { ns: 'pages' })}</p>
              <Button type="button" size="sm" className="mt-2" onClick={() => setIsEditOpen(true)}>
                {t('allocate.dateError.fixCta', { ns: 'pages' })}
              </Button>
            </div>
            <AllocateEditPanel
              isOpen={isEditOpen}
              onClose={() => setIsEditOpen(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="allocate-page">
        {/* Skeleton header */}
        <div className="page-header">
          <div className="page-header-left">
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
        {/* Skeleton cycle strip */}
        <div className="cycle-strip">
          <Skeleton className="h-7 w-56" />
        </div>
        <div className="page-content">
          <div className="plan-col">
            <Skeleton className="h-40 w-full mb-4 rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="allocate-page">
      {/* Layers 1+2: sticky header + cycle strip */}
      {cycles.length > 0 && (
        <AllocateCycleStrip
          cycles={cycles}
          selectedIndex={activeIndex}
          onIndexChange={handleCycleIndexChange}
          isEditing={isEditOpen}
          onEditToggle={() => setIsEditOpen((prev) => !prev)}
        />
      )}

      {/* Layer 3: scrollable content */}
      <div className="page-content">
        <div className="plan-col">

          {/* Account validation warning */}
          {hasInvalidAccounts && (
            <div className="alert alert-danger mb-4" role="alert">
              {!primaryAccountExists && 'Your primary income account no longer exists. '}
              {!savingsAccountExists && 'Your savings account no longer exists. '}
              Please update your pay cycle configuration.
            </div>
          )}

          {/* Inline edit panel — replaces legacy Dialog */}
          <AllocateEditPanel
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
          />

          {/* Plan stack: banner + income + committed + surplus.
              key={activeIndex} forces CommittedSection remount on cycle navigation
              so the staggered progress bar animation replays per cycle. */}
          {selectedCycle && primaryIncomeInfo && (
            <AllocatePlanStack
              key={activeIndex}
              cycleState={selectedCycle.state}
              cyclePayDate={selectedCycle.payDate}
              cycleEndDate={selectedCycle.endDate}
              primaryIncome={primaryIncomeInfo}
              secondaryIncomes={secondaryIncomeLinks}
              committedRows={committedRows}
              committedTotal={committedTotal}
              surplusAmount={surplusAmount}
              savingsAccount={savingsAccount}
              accounts={accounts}
              primaryIncomeName={primaryIncomeInfo.name}
              onDestinationConfirm={handleDestinationConfirm}
              payCycleFrequency={payCycle?.frequency ?? 'monthly'}
              isPickerOpen={isPickerOpen}
              onPickerOpen={() => {
                setPickerDraftAccountId(savingsAccount?.id ?? null);
                setIsPickerOpen(true);
              }}
              onPickerClose={() => {
                setIsPickerOpen(false);
                setPickerDraftAccountId(null);
              }}
              pickerDraftAccountId={pickerDraftAccountId}
              onPickerDraftSelect={setPickerDraftAccountId}
              isConfirmingDestination={isConfirmingDestination}
              showExplicitRepaymentDisclaimer={showRepaymentDisclaimer}
            />
          )}

          {/* Upcoming transfers — never dimmed regardless of cycle state */}
          {upcomingTransferRows.length > 0 && (
            <div className="mt-5">
              <UpcomingTransfersSection
                key={activeIndex}
                rows={upcomingTransferRows}
                total={upcomingTransfersTotal}
                locale={locale}
              />
            </div>
          )}

          {/* Confirm plan footer — hidden for past cycles */}
          {selectedCycle && selectedCycle.state !== 'past' && (
            <div className="mt-4">
              <ConfirmPlanFooter
                key={selectedCycle.payDate.toISOString()}
                committedTotal={committedTotal}
                surplusAmount={surplusAmount}
                savingsAccountName={savingsAccount?.accountName ?? null}
                cyclePayDate={selectedCycle.payDate}
                locale={locale}
              />
            </div>
          )}

          {/* Unallocated expenses warning */}
          {hasUnallocated && (
            <div className="mt-4">
              <UnallocatedWarning amount={unallocatedTotal} viewMode="monthly" />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
