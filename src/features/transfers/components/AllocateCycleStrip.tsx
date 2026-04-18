/**
 * AllocateCycleStrip
 *
 * Renders the sticky page header (title + subtitle + edit button) and the
 * three-slot temporal cycle navigator below it.
 *
 * - Subtitle reflects active / upcoming / past / editing states via i18n keys.
 * - Chevrons are disabled at the first/last index boundary.
 * - Mobile (≤768 px): prev/next date slots, dividers, and badge hidden via CSS.
 * - No business logic — pure UI, all state driven by props.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { PayCycle } from '../utils/payCycles';


export interface AllocateCycleStripProps {
  /** Full list of computed cycles from buildPayCycles(). */
  cycles: PayCycle[];
  /** Currently selected index into cycles[]. */
  selectedIndex: number;
  /** Called when user navigates to a different cycle. */
  onIndexChange: (index: number) => void;
  /** Whether the inline edit panel is currently open. */
  isEditing: boolean;
  /** Toggle edit panel open/close. */
  onEditToggle: () => void;
}

type SubtitleVariant = 'active' | 'upcoming' | 'past' | 'editing';

function useSubtitle(variant: SubtitleVariant, payDate: Date): string {
  const { t } = useTranslation('pages');
  if (variant === 'editing') return t('allocateSubtitleEditing');
  if (variant === 'upcoming') return t('allocateSubtitleUpcoming');
  if (variant === 'past') return t('allocateSubtitlePast');
  return t('allocateSubtitleActive', { date: format(payDate, 'd MMM') });
}

export function AllocateCycleStrip({
  cycles,
  selectedIndex,
  onIndexChange,
  isEditing,
  onEditToggle,
}: AllocateCycleStripProps) {
  const { t } = useTranslation(['pages', 'navigation']);
  const current = cycles[selectedIndex];
  const prev = selectedIndex > 0 ? cycles[selectedIndex - 1] : null;
  const next = selectedIndex < cycles.length - 1 ? cycles[selectedIndex + 1] : null;
  const isFirst = selectedIndex === 0;
  const isLast = selectedIndex === cycles.length - 1;

  const subtitleVariant: SubtitleVariant = isEditing
    ? 'editing'
    : (current?.state ?? 'active');

  const subtitle = useSubtitle(subtitleVariant, current?.payDate ?? new Date());

  const badgeVariant = current?.state === 'active' ? 'active' : 'muted';

  return (
    <>
      {/* ── Sticky page header (Layer 1) ───────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <span className="page-title">{t('transfers', { ns: 'navigation' })}</span>
          <span className={`page-sub${isEditing ? ' page-sub-edit visible' : ''}`}>
            {subtitle}
          </span>
        </div>
        <div className="page-header-right">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={onEditToggle}
            aria-pressed={isEditing}
            aria-label={isEditing ? 'Close plan editor' : 'Edit pay cycle plan'}
          >
            {isEditing ? 'Cancel' : 'Edit plan'}
          </button>
        </div>
      </div>

      {/* ── Cycle strip (Layer 2) ───────────────────────────────────────── */}
      <div className="cycle-strip" role="navigation" aria-label="Pay cycle navigation">
        <div className="cycle-strip-nav">
          {/* Prev chevron */}
          <button
            type="button"
            className="cycle-strip-btn"
            disabled={isFirst}
            onClick={() => !isFirst && onIndexChange(selectedIndex - 1)}
            aria-label="Previous pay cycle"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Date slots */}
          <div className="cycle-dates">
            {/* Previous slot */}
            <div
              className="cycle-date-item prev"
              role="button"
              tabIndex={isFirst ? -1 : 0}
              aria-label={prev ? `Go to cycle starting ${prev.shortLabel}` : undefined}
              onClick={() => prev && onIndexChange(selectedIndex - 1)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && prev) {
                  onIndexChange(selectedIndex - 1);
                }
              }}
            >
              <span className="cycle-date-label">Previous</span>
              <span className="cycle-date-value">{prev ? prev.shortLabel : '—'}</span>
            </div>

            <div className="cycle-date-divider" aria-hidden />

            {/* Current slot */}
            <div className="cycle-date-item current" aria-current="true">
              <span className="cycle-date-label">Pay day</span>
              <span className="cycle-date-value">{current?.shortLabel ?? '—'}</span>
            </div>

            <div className="cycle-date-divider" aria-hidden />

            {/* Next slot */}
            <div
              className="cycle-date-item next"
              role="button"
              tabIndex={isLast ? -1 : 0}
              aria-label={next ? `Go to cycle starting ${next.shortLabel}` : undefined}
              onClick={() => next && onIndexChange(selectedIndex + 1)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && next) {
                  onIndexChange(selectedIndex + 1);
                }
              }}
            >
              <span className="cycle-date-label">Next</span>
              <span className="cycle-date-value">{next ? next.shortLabel : '—'}</span>
            </div>
          </div>

          {/* Next chevron */}
          <button
            type="button"
            className="cycle-strip-btn"
            disabled={isLast}
            onClick={() => !isLast && onIndexChange(selectedIndex + 1)}
            aria-label="Next pay cycle"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* State badge */}
        <div className={`cycle-strip-badge ${badgeVariant}`} aria-label={`Cycle state: ${current?.state}`}>
          <span className={`badge-dot ${badgeVariant === 'active' ? 'green' : 'grey'}`} aria-hidden />
          {current?.state === 'active' ? 'Active' : current?.state === 'upcoming' ? 'Upcoming' : 'Past'}
        </div>
      </div>
    </>
  );
}
