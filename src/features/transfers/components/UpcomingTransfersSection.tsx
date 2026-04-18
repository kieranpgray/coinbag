/**
 * UpcomingTransfersSection
 *
 * Displays a list of upcoming (or completed) transfers derived from expenses
 * grouped by paid-from account for the selected pay cycle.
 *
 * - Green rows: transfers scheduled for the future
 * - Amber rows: transfers due within 3 days (urgency signal)
 * - Grey rows: past cycle (system done state)
 * - User-checked rows: dot toggles to accent + checkmark; row dims like done
 *
 * This section is intentionally never dimmed — the opacity reduction applied
 * to `.plan-stack` for upcoming/past cycles does not apply here.
 */

import { useState, useEffect, useMemo } from 'react';
import { ArrowRight, AlertTriangle, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';
import type { UpcomingTransferRow } from '../utils/buildUpcomingTransfers';

interface UpcomingTransfersSectionProps {
  rows: UpcomingTransferRow[];
  total: number;
  locale: string;
}

function TransferIcon({ variant }: { variant: UpcomingTransferRow['iconVariant'] }) {
  if (variant === 'warning') {
    return (
      <AlertTriangle
        size={13}
        aria-hidden
        style={{ color: 'var(--gold, #b5892a)' }}
      />
    );
  }
  if (variant === 'check') {
    return (
      <Check
        size={13}
        aria-hidden
        style={{ color: 'var(--ink-4, #b5b2aa)' }}
      />
    );
  }
  return (
    <ArrowRight
      size={13}
      aria-hidden
      style={{ color: 'var(--accent, #1a5c3a)' }}
    />
  );
}

function CheckmarkSvg() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
      <path
        d="M1 4l3 3 5-6"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UpcomingTransfersSection({
  rows,
  total,
  locale,
}: UpcomingTransfersSectionProps) {
  const { t } = useTranslation('pages');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());

  const rowSignature = useMemo(() => rows.map((r) => r.id).sort().join(','), [rows]);
  useEffect(() => {
    setCheckedIds(new Set());
  }, [rowSignature]);

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allDone = rows.length > 0 && checkedIds.size === rows.length;
  const formattedTotal = formatCurrency(total, locale, { maximumFractionDigits: 0 });

  return (
    <section aria-label={t('allocate.upcomingTransfers.sectionLabel', { defaultValue: 'Upcoming transfers' })}>
      <div className="alloc-section-header">
        <h2 className="alloc-section-title">
          {allDone
            ? t('allocate.upcomingTransfers.allDone', { defaultValue: 'Transfers confirmed' })
            : t('allocate.upcomingTransfers.title', { defaultValue: 'Upcoming transfers' })}
        </h2>
        <span className="alloc-section-total">
          {t('allocate.upcomingTransfers.total', {
            total: formattedTotal,
            defaultValue: '{{total}} total',
          })}
        </span>
      </div>

      <div className="upcoming-card" role="list">
        {rows.map((row) => {
          const isChecked = checkedIds.has(row.id);
          const rowDone = row.isDone || isChecked;
          return (
            <div
              key={row.id}
              role="listitem"
              className={`upcoming-row${rowDone ? ' done' : ''}`}
            >
              <div className="upcoming-left">
                <button
                  type="button"
                  className={`upcoming-dot-wrap ${isChecked ? 'checked' : row.dotVariant}`}
                  onClick={() => toggleChecked(row.id)}
                  aria-label={
                    isChecked
                      ? t('allocate.upcomingTransfers.unmarkAria', {
                          accountName: row.name,
                          defaultValue: `Unmark transfer for ${row.name}`,
                        })
                      : t('allocate.upcomingTransfers.markDoneAria', {
                          accountName: row.name,
                          defaultValue: `Mark transfer for ${row.name} as done`,
                        })
                  }
                  aria-pressed={isChecked}
                >
                  {isChecked ? <CheckmarkSvg /> : <TransferIcon variant={row.iconVariant} />}
                </button>
                <div>
                  <p className="upcoming-name">{row.name}</p>
                  <p className="upcoming-date">
                    {row.dateLabel}
                    {row.categoryMeta ? ` · ${row.categoryMeta}` : ''}
                  </p>
                </div>
              </div>
              <div className="upcoming-right">
                <span className={`upcoming-amount${rowDone ? ' done' : ''}`}>
                  {formatCurrency(row.amount, locale, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
