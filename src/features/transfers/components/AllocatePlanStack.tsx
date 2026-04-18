/**
 * AllocatePlanStack
 *
 * The "welded" plan card: income card → committed section → surplus section.
 * The upcoming/past banner sits above the stack and dims it to 0.72 opacity.
 *
 * This component handles:
 *   - Upcoming/past banner visibility (show class driven by cycle state)
 *   - Income card rendering (primary income + secondary links)
 *   - Committed section (category rows)
 *   - Surplus section (shortfall, no-destination, destination-set, dest picker)
 *
 * All data is passed via props — no direct hook calls here except useTranslation.
 * Parent (TransfersPage) is responsible for data fetching and passing through.
 *
 * Shortfall alert: mounted only when `surplusAmount < 0` (not CSS-hidden) so
 * screen readers and layout match the design reference.
 */

import React from 'react';
import { Clock, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { Account, PayCycleConfig } from '@/types/domain';
import type { CommittedRow } from '../utils/allocateCommitted';
import type { PrimaryIncomeInfo, SecondaryIncomeLink } from '../utils/allocateIncome';
import type { CycleState } from '../utils/payCycles';
import { ROUTES } from '@/lib/constants/routes';
import { formatCurrency } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface AllocatePlanStackProps {
  /** From AllocateCycleStrip / buildPayCycles */
  cycleState: CycleState;
  cyclePayDate: Date;
  cycleEndDate: Date;

  /** Income data */
  primaryIncome: PrimaryIncomeInfo;
  secondaryIncomes: SecondaryIncomeLink[];

  /** Committed section */
  committedRows: CommittedRow[];
  committedTotal: number;

  /** Surplus / shortfall */
  surplusAmount: number;

  /** Surplus destination account (resolved from payCycle.savingsAccountId) */
  savingsAccount?: Account | null;

  /** All available accounts for destination picker */
  accounts: Account[];

  /** Primary income name (for upcoming banner) */
  primaryIncomeName?: string;

  /** Called when destination account is confirmed in picker */
  onDestinationConfirm: (accountId: string) => void;

  /** PayCycle frequency (for tooltip interpolation) */
  payCycleFrequency: PayCycleConfig['frequency'];

  /** Whether destination picker is open */
  isPickerOpen: boolean;
  onPickerOpen: () => void;
  onPickerClose: () => void;

  /** Pending selected account id in the picker (before confirmation) */
  pickerDraftAccountId: string | null;
  onPickerDraftSelect: (accountId: string) => void;

  /** True while updatePayCycle is in-flight from the destination confirm action */
  isConfirmingDestination: boolean;

  /**
   * When true (e.g. `explicit_repayment_transfers` feature flag), show a short
   * disclaimer that committed repayments may differ from transfer suggestions.
   */
  showExplicitRepaymentDisclaimer?: boolean;
}

// ── Category icon emoji map ───────────────────────────────────────────────────

const ICON_EMOJI: Record<string, string> = {
  housing: '🏠',
  savings: '💰',
  investments: '📈',
  utilities: '⚡',
  transport: '🚗',
  repayments: '💳',
  subscriptions: '📱',
  health: '🏥',
  default: '📋',
};

function CommitmentIconEmoji({ slug }: { slug: string }) {
  const emoji = ICON_EMOJI[slug] ?? ICON_EMOJI.default;
  return (
    <div className={`commitment-icon commitment-icon-${slug}`} aria-hidden>
      {emoji}
    </div>
  );
}

// ── Upcoming/past banner ───────────────────────────────────────────────────────

interface BannerProps {
  cycleState: CycleState;
  cyclePayDate: Date;
  primaryIncomeName?: string;
}

function UpcomingBanner({ cycleState, cyclePayDate, primaryIncomeName }: BannerProps) {
  const { t } = useTranslation('pages');
  const show = cycleState === 'upcoming' || cycleState === 'past';

  const dayLabel = format(cyclePayDate, 'EEE');
  const dateLabel = format(cyclePayDate, 'd MMM yyyy');
  const arrivalLabel = t('allocate.upcoming.arrivalLabel', {
    incomeName: primaryIncomeName ?? t('allocate.banner.incomeFallback'),
    day: dayLabel,
    date: dateLabel,
  });

  return (
    <div className={`upcoming-banner${show ? ' show' : ''}`} role="status">
      <div className="upcoming-banner-icon">
        <Clock size={16} aria-hidden />
      </div>
      <div>
        <p className="upcoming-banner-title">
          {cycleState === 'upcoming'
            ? t('allocate.upcoming.heading')
            : t('allocate.past.heading')}
        </p>
        <p className="upcoming-banner-sub">{arrivalLabel}</p>
        <p className="upcoming-banner-sub-preview">{t('allocate.upcoming.helper')}</p>
      </div>
    </div>
  );
}

// ── Income card ────────────────────────────────────────────────────────────────

interface IncomeCardProps {
  primaryIncome: PrimaryIncomeInfo;
  secondaryIncomes: SecondaryIncomeLink[];
  locale: string;
}

function IncomeCard({ primaryIncome, secondaryIncomes, locale }: IncomeCardProps) {
  const { t } = useTranslation('pages');
  return (
    <div className="income-card">
      <p className="income-card-label">{t('allocate.incomeCard.label')}</p>
      <p className="income-card-amount-lg">
        {formatCurrency(primaryIncome.cycleAmount, locale, { maximumFractionDigits: 0 })}
      </p>
      {primaryIncome.found && (
        <p className="income-card-source">
          <span className="income-card-source-dot" aria-hidden />
          {primaryIncome.sourceLine}
        </p>
      )}
      {secondaryIncomes.map((link) => (
        <Link
          key={link.id}
          to={ROUTES.app.budget}
          className="income-card-secondary"
          aria-label={`Secondary income: ${link.label}`}
        >
          <ArrowRight size={11} aria-hidden />
          {link.label}
        </Link>
      ))}
    </div>
  );
}

// ── Committed section ─────────────────────────────────────────────────────────

interface CommittedSectionProps {
  rows: CommittedRow[];
  total: number;
  locale: string;
  incomeAmount: number;
}

function CommittedSection({ rows, total, locale, incomeAmount }: CommittedSectionProps) {
  const { t } = useTranslation('pages');
  const committedTip = t('allocate.tooltips.committed');
  const zeroLabel = formatCurrency(0, locale, { maximumFractionDigits: 0 });

  return (
    <section className="plan-section" aria-label={t('allocate.sections.committed')}>
      <div className="plan-section-header">
        <div className="plan-section-label">
          <span>{t('allocate.sections.committed')}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="tooltip-icon"
                aria-label={committedTip}
              >
                i
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-left font-normal">
              {committedTip}
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="plan-section-total">
          {formatCurrency(total, locale, { maximumFractionDigits: 0 })}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="commitment-row">
          <div className="commitment-icon commitment-icon-default" aria-hidden>📋</div>
          <div className="commitment-info">
            <p className="commitment-name">{t('allocate.committed.emptyTitle')}</p>
            <p className="commitment-meta">
              {t('allocate.committed.emptyMetaPrefix')}{' '}
              <Link to={ROUTES.app.budget} className="underline">
                {t('allocate.committed.emptyMetaLink')}
              </Link>
              {t('allocate.committed.emptyMetaSuffix')}
            </p>
          </div>
          <span className="commitment-amount muted">{zeroLabel}</span>
        </div>
      ) : (
        rows.map((row, index) => {
          const pct =
            incomeAmount > 0
              ? Math.min(100, (row.amount / incomeAmount) * 100)
              : 0;
          return (
            <div key={row.rowKey} className="commitment-row">
              <CommitmentIconEmoji slug={row.iconSlug} />
              <div className="commitment-info">
                <p className="commitment-name">{row.displayName}</p>
                <p className="commitment-meta">{row.metaLine}</p>
              </div>
              {/* Progress bar — hidden on mobile via CSS */}
              <div
                className="alloc-bar-wrap"
                aria-hidden
                style={
                  {
                    '--pct': `${pct}%`,
                    '--d': `${0.1 * (index + 1)}s`,
                  } as React.CSSProperties
                }
              >
                <div className="alloc-bar">
                  <div
                    className={`alloc-bar-fill${row.isMutedZero ? ' muted' : ''}`}
                  />
                </div>
                {!row.isMutedZero && (
                  <span className="alloc-bar-pct">
                    {Math.round(pct)}% of income
                  </span>
                )}
              </div>
              <span
                className={`commitment-amount${row.isMutedZero ? ' muted' : ''}`}
              >
                {formatCurrency(row.amount, locale, { maximumFractionDigits: 0 })}
              </span>
            </div>
          );
        })
      )}
    </section>
  );
}

// ── Surplus section ────────────────────────────────────────────────────────────

interface SurplusSectionProps {
  surplusAmount: number;
  committedTotal: number;
  incomeTotal: number;
  savingsAccount?: Account | null;
  accounts: Account[];
  isPickerOpen: boolean;
  onPickerOpen: () => void;
  onPickerClose: () => void;
  pickerDraftAccountId: string | null;
  onPickerDraftSelect: (accountId: string) => void;
  onDestinationConfirm: (accountId: string) => void;
  isConfirmingDestination: boolean;
  locale: string;
}

function SurplusSection({
  surplusAmount,
  committedTotal: _committedTotal,
  incomeTotal: _incomeTotal,
  savingsAccount,
  accounts,
  isPickerOpen,
  onPickerOpen,
  onPickerClose,
  pickerDraftAccountId,
  onPickerDraftSelect,
  onDestinationConfirm,
  isConfirmingDestination,
  locale,
}: SurplusSectionProps) {
  const { t } = useTranslation('pages');
  const isShortfall = surplusAmount < 0;
  const hasDestination = !!savingsAccount;

  const formattedSurplus = formatCurrency(Math.abs(surplusAmount), locale, { maximumFractionDigits: 0 });

  const surplusShortTip = t('allocate.tooltips.surplus');

  return (
    <section className="surplus-section" aria-label={t('allocate.sections.surplus')}>
      {/* Section header */}
      <div className="plan-section-header">
        <div className="plan-section-label">
          <span>{isShortfall ? t('allocate.shortfall.label') : t('allocate.sections.surplus')}</span>
          {!isShortfall && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="tooltip-icon"
                  aria-label={surplusShortTip}
                >
                  i
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-left font-normal">
                {surplusShortTip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className={`plan-section-total ${isShortfall ? 'shortfall-total' : 'surplus-total'}`}>
          {isShortfall ? '-' : ''}{formattedSurplus}
        </span>
      </div>

      {/* Shortfall alert */}
      {isShortfall && (
        <div className="shortfall-alert" role="alert">
          {t('allocate.shortfall.message')}{' '}
          <Link to={ROUTES.app.budget}>
            {t('allocate.shortfall.cta')}
          </Link>
        </div>
      )}

      {/* Destination set state */}
      {!isShortfall && hasDestination && !isPickerOpen && (
        <div className="surplus-destination-row">
          <p className="surplus-dest-label">
            {t('allocate.surplus.willAllocateTo', {
              accountName: savingsAccount!.accountName,
            })}
          </p>
          <div className="surplus-dest-amount-row">
            <span className={`surplus-amount${isShortfall ? ' shortfall' : ''}`}>
              {formattedSurplus}
            </span>
            <span className="surplus-helper">
              {t('allocate.surplusDestination.setHelper')}
            </span>
          </div>
          <button type="button" className="surplus-change-link" onClick={onPickerOpen}>
            <ArrowRight size={12} aria-hidden />
            {t('allocate.surplus.changeDestination')}
          </button>
        </div>
      )}

      {/* No destination prompt */}
      {!isShortfall && !hasDestination && !isPickerOpen && (
        <div className="surplus-no-destination-wrap">
          <div className="surplus-prompt">
            <div>
              <p className="surplus-prompt-question">{t('allocate.surplusDestination.unsetPrompt')}</p>
              <p className="surplus-prompt-amount">{formattedSurplus}</p>
            </div>
            <button type="button" className="surplus-prompt-cta" onClick={onPickerOpen}>
              <Plus size={14} aria-hidden />
              {t('allocate.surplus.setDestinationCta')}
            </button>
          </div>
        </div>
      )}

      {/* Destination picker */}
      {!isShortfall && (
        <div className={`dest-picker${isPickerOpen ? ' open' : ''}`} aria-hidden={!isPickerOpen}>
          <p className="dest-picker-label">{t('allocate.destPicker.title')}</p>

          <div
            className="dest-options"
            role="listbox"
            aria-label={t('allocate.destPicker.listAria')}
          >
            {accounts.map((account) => (
              <div
                key={account.id}
                role="option"
                aria-selected={pickerDraftAccountId === account.id}
                className={`dest-option${pickerDraftAccountId === account.id ? ' selected' : ''}`}
                onClick={() => onPickerDraftSelect(account.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onPickerDraftSelect(account.id);
                }}
              >
                <div className="dest-option-icon" aria-hidden>🏦</div>
                <div>
                  <p className="dest-option-name">{account.accountName}</p>
                  <p className="dest-option-type">{account.accountType}</p>
                </div>
              </div>
            ))}
          </div>

          <Link to={ROUTES.app.accounts} className="dest-add-link">
              <Plus size={14} aria-hidden />
              {t('allocate.destPicker.addAccount')}
            </Link>

          <p className="dest-confirm-note">
            {t('allocate.destPicker.confirmNote')}
          </p>

          <div className="dest-picker-actions">
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={onPickerClose}
            >
              {t('allocate.actions.cancel')}
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={!pickerDraftAccountId || isConfirmingDestination}
              onClick={() => {
                if (pickerDraftAccountId && !isConfirmingDestination) {
                  onDestinationConfirm(pickerDraftAccountId);
                }
              }}
            >
              {isConfirmingDestination ? t('allocate.actions.saving') : t('allocate.actions.confirm')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function AllocatePlanStack({
  cycleState,
  cyclePayDate,
  cycleEndDate: _cycleEndDate,
  primaryIncome,
  secondaryIncomes,
  committedRows,
  committedTotal,
  surplusAmount,
  savingsAccount,
  accounts,
  primaryIncomeName,
  onDestinationConfirm,
  payCycleFrequency: _payCycleFrequency,
  isPickerOpen,
  onPickerOpen,
  onPickerClose,
  pickerDraftAccountId,
  onPickerDraftSelect,
  isConfirmingDestination,
  showExplicitRepaymentDisclaimer = false,
}: AllocatePlanStackProps) {
  const { locale } = useLocale();
  const isDimmed = cycleState === 'upcoming' || cycleState === 'past';
  const { t } = useTranslation('pages');

  return (
    <TooltipProvider delayDuration={200}>
      {/* Upcoming / past banner */}
      <UpcomingBanner
        cycleState={cycleState}
        cyclePayDate={cyclePayDate}
        primaryIncomeName={primaryIncomeName}
      />

      {/* Plan stack */}
      <div className={`plan-stack${isDimmed ? ' dimmed' : ''}`}>
        {showExplicitRepaymentDisclaimer && (
          <div className="alert alert-neutral mb-3 text-sm" role="note">
            {t('allocate.repaymentDisclaimer')}
          </div>
        )}

        {/* Income card */}
        <IncomeCard
          primaryIncome={primaryIncome}
          secondaryIncomes={secondaryIncomes}
          locale={locale}
        />

        {/* Committed section */}
        <CommittedSection
          rows={committedRows}
          total={committedTotal}
          locale={locale}
          incomeAmount={primaryIncome.cycleAmount}
        />

        {/* Surplus section */}
        <SurplusSection
          surplusAmount={surplusAmount}
          committedTotal={committedTotal}
          incomeTotal={primaryIncome.cycleAmount}
          savingsAccount={savingsAccount}
          accounts={accounts}
          isPickerOpen={isPickerOpen}
          onPickerOpen={onPickerOpen}
          onPickerClose={onPickerClose}
          pickerDraftAccountId={pickerDraftAccountId}
          onPickerDraftSelect={onPickerDraftSelect}
          onDestinationConfirm={onDestinationConfirm}
          isConfirmingDestination={isConfirmingDestination}
          locale={locale}
        />
      </div>
    </TooltipProvider>
  );
}
