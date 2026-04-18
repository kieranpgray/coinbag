/**
 * ConfirmPlanFooter
 *
 * Summary + confirm CTA at the bottom of the Allocate screen.
 *
 * Behaviour:
 * - Single-fire: once confirmed, the button state is locked. Reset per cycle
 *   by keying this component on cyclePayDate in the parent.
 * - UI-only: confirmPlan() is a local state change only. Backend record
 *   creation (e.g. plan_confirmations) is deferred per spec §13.
 * - Disabled (not hidden) when surplusAmount < 0 (shortfall state).
 * - savingsAccountName=null renders "surplus unallocated" in the summary.
 */

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';

interface ConfirmPlanFooterProps {
  committedTotal: number;
  surplusAmount: number;
  /** null when no surplus destination is configured */
  savingsAccountName: string | null;
  cyclePayDate: Date;
  locale: string;
}

export function ConfirmPlanFooter({
  committedTotal,
  surplusAmount,
  savingsAccountName,
  cyclePayDate,
  locale,
}: ConfirmPlanFooterProps) {
  const { t } = useTranslation('pages');
  const [isConfirmed, setIsConfirmed] = useState(false);

  const isShortfall = surplusAmount < 0;
  const isDisabled = isConfirmed || isShortfall;

  const formattedCommitted = formatCurrency(committedTotal, locale, {
    maximumFractionDigits: 0,
  });
  const formattedSurplus = formatCurrency(Math.abs(surplusAmount), locale, {
    maximumFractionDigits: 0,
  });
  const dateLabel = format(cyclePayDate, 'd MMM');

  const confirmedSummary = t('allocate.confirmFooter.summaryConfirmed', {
    date: dateLabel,
    defaultValue: '✓ Plan locked in · Transfers scheduled for {{date}}',
  });

  function confirmPlan() {
    if (isDisabled) return;
    setIsConfirmed(true);
  }

  return (
    <div
      className="allocate-footer"
      role="region"
      aria-label={t('allocate.confirmFooter.regionLabel', {
        defaultValue: 'Confirm plan',
      })}
    >
      <p
        className="allocate-footer-summary"
        aria-live="polite"
        aria-atomic="true"
      >
        {isConfirmed ? (
          <span style={{ color: 'var(--color-primary)' }}>{confirmedSummary}</span>
        ) : (
          <>
            <strong>{formattedCommitted}</strong>
            {savingsAccountName
              ? t('allocate.confirmFooter.summaryMiddleWithDest', {
                  surplus: formattedSurplus,
                  account: savingsAccountName,
                  date: dateLabel,
                  defaultValue:
                    ' committed · {{surplus}} surplus to {{account}} on {{date}}',
                })
              : t('allocate.confirmFooter.summaryMiddleNoDest', {
                  surplus: formattedSurplus,
                  date: dateLabel,
                  defaultValue:
                    ' committed · {{surplus}} surplus unallocated on {{date}}',
                })}
          </>
        )}
      </p>

      <button
        type="button"
        className={`btn-allocate${isConfirmed ? ' confirmed' : ''}`}
        onClick={confirmPlan}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-label={
          isConfirmed
            ? t('allocate.confirmFooter.confirmedLabel', {
                defaultValue: 'Plan confirmed',
              })
            : t('allocate.confirmFooter.confirmLabel', {
                defaultValue: 'Confirm plan',
              })
        }
      >
        {isConfirmed ? (
          <>
            <Check size={15} aria-hidden />
            {t('allocate.confirmFooter.confirmedLabel', {
              defaultValue: 'Plan confirmed',
            })}
          </>
        ) : (
          <>
            <ArrowRight size={15} aria-hidden />
            {t('allocate.confirmFooter.confirmLabel', {
              defaultValue: 'Confirm plan',
            })}
          </>
        )}
      </button>
    </div>
  );
}
