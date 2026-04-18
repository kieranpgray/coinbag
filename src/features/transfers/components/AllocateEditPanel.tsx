/**
 * AllocateEditPanel
 *
 * Inline edit panel for adjusting the active pay-cycle plan.
 * Rendered above the plan stack when isOpen=true; hidden otherwise.
 *
 * Persistence note:
 * Saving calls updatePayCycle which writes to GLOBAL user preferences —
 * not a per-cycle override. The footnote below informs users of this.
 * If product requires strict "this cycle only" semantics, a schema change
 * is needed (deferred per tasks.md).
 *
 * Behaviour:
 * - Cancel: resets form to last-saved payCycle state, calls onClose.
 * - Save ("Update plan"): writes new config, closes panel, invalidates queries.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePayCycle } from '../hooks';
import { ROUTES } from '@/lib/constants/routes';
import {
  payCycleSchema,
  PayCycleFormData,
  PayCycleFormFields,
} from './PayCycleFormFields';
import type { PayCycleConfig } from '@/types/domain';
import { useEffect } from 'react';

interface AllocateEditPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Inline edit panel — replace the old Dialog-based edit path.
 * Mount always; show/hide via `.edit-panel.open` class.
 */
export function AllocateEditPanel({ isOpen, onClose }: AllocateEditPanelProps) {
  const { payCycle, updatePayCycle, isUpdating, error } = usePayCycle();
  const { t } = useTranslation('pages');

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<PayCycleFormData>({
    resolver: zodResolver(payCycleSchema),
    defaultValues: payCycle
      ? {
          frequency: payCycle.frequency,
          nextPayDate: payCycle.nextPayDate,
          primaryIncomeAccountId: payCycle.primaryIncomeAccountId,
          savingsAccountId: payCycle.savingsAccountId,
        }
      : undefined,
  });

  // Sync form when saved payCycle changes (e.g. after successful save).
  // Use primitive field deps — NOT the payCycle object reference — to avoid
  // resetting the form on every background refetch that creates a new object
  // even though the values are identical (which would discard in-progress edits).
  useEffect(() => {
    if (payCycle) {
      reset({
        frequency: payCycle.frequency,
        nextPayDate: payCycle.nextPayDate,
        primaryIncomeAccountId: payCycle.primaryIncomeAccountId,
        savingsAccountId: payCycle.savingsAccountId,
      });
    }
  }, [
    payCycle?.frequency,
    payCycle?.nextPayDate,
    payCycle?.primaryIncomeAccountId,
    payCycle?.savingsAccountId,
    reset,
  ]);

  const handleCancel = () => {
    // Discard unsaved state — reset to last persisted payCycle
    if (payCycle) {
      reset({
        frequency: payCycle.frequency,
        nextPayDate: payCycle.nextPayDate,
        primaryIncomeAccountId: payCycle.primaryIncomeAccountId,
        savingsAccountId: payCycle.savingsAccountId,
      });
    }
    onClose();
  };

  const onSubmit = async (data: PayCycleFormData) => {
    const config: PayCycleConfig = {
      frequency: data.frequency,
      nextPayDate: data.nextPayDate,
      primaryIncomeAccountId: data.primaryIncomeAccountId,
      savingsAccountId: data.savingsAccountId || undefined,
    };
    await updatePayCycle(config);
    onClose();
  };

  return (
    <div className={`edit-panel${isOpen ? ' open' : ''}`} aria-hidden={!isOpen}>
      <p className="edit-panel-title">{t('allocateSubtitleEditing')}</p>

      <form onSubmit={handleSubmit(onSubmit)}>
        {error && (
          <div className="alert alert-danger mb-4" role="alert">
            {error instanceof Error ? error.message : 'Failed to save pay cycle configuration'}
          </div>
        )}

        <div className="edit-fields">
          <PayCycleFormFields
            control={control}
            errors={errors}
            allowPastDates
            fieldClassName="space-y-1"
          />
        </div>

        {/* Persistence footnote */}
        <p className="edit-note">
          {t('allocate.editContextNote')}{' '}
          <Link to={ROUTES.app.budget}>{t('allocate.editContextNoteLinkText')}</Link>.
        </p>

        <div className="edit-actions">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={handleCancel}
            disabled={isUpdating}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary btn-sm"
            disabled={isUpdating}
          >
            {isUpdating && <Loader2 className="inline mr-1.5 h-3 w-3 animate-spin" />}
            Update plan
          </button>
        </div>
      </form>
    </div>
  );
}
