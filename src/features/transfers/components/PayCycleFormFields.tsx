/**
 * Shared pay-cycle form fields and schema.
 *
 * Consumed by both PayCycleSetup (first-time wizard) and AllocateEditPanel
 * (inline per-cycle adjustment). Both persist via updatePayCycle (global
 * preferences). Edit-panel copy saying "this plan only" is aspirational;
 * actual persistence is workspace-wide — a footnote in the edit panel
 * informs users of this.
 *
 * Frequency options: weekly | fortnightly | monthly only (matches PayCycleConfig schema).
 */

import { z } from 'zod';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { AccountSelect } from '@/components/shared/AccountSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';

// ── Schema (single source of truth for both wizard and inline panel) ────────

export const payCycleSchema = z.object({
  frequency: z.enum(['weekly', 'fortnightly', 'monthly']),
  nextPayDate: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    'Invalid date format'
  ),
  primaryIncomeAccountId: z.string().uuid('Please select an account'),
  savingsAccountId: z.string().uuid('Invalid account selected').optional(),
});

export type PayCycleFormData = z.infer<typeof payCycleSchema>;

/**
 * Default values for new pay cycle setup.
 */
export function defaultPayCycleFormValues(): PayCycleFormData {
  return {
    frequency: 'fortnightly',
    nextPayDate: format(new Date(), 'yyyy-MM-dd'),
    primaryIncomeAccountId: '',
    savingsAccountId: undefined,
  };
}

// ── Shared field components ──────────────────────────────────────────────────

interface PayCycleFormFieldsProps {
  control: Control<PayCycleFormData>;
  errors: FieldErrors<PayCycleFormData>;
  /** When true, the "next pay date" min-date constraint is removed (for past-date editing). */
  allowPastDates?: boolean;
  /** Optional class name applied to each field wrapper. */
  fieldClassName?: string;
}

/**
 * Renders all four pay-cycle form fields using react-hook-form Controller.
 * Wrap these in a form element with handleSubmit in the parent component.
 */
export function PayCycleFormFields({
  control,
  errors,
  allowPastDates = false,
  fieldClassName = 'space-y-1',
}: PayCycleFormFieldsProps) {
  return (
    <>
      <div className={fieldClassName}>
        <Label htmlFor="frequency">How often does this arrive?</Label>
        <Controller
          name="frequency"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="fortnightly">Fortnightly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.frequency && (
          <p className="text-body text-destructive">{errors.frequency.message}</p>
        )}
      </div>

      <div className={fieldClassName}>
        <Label htmlFor="nextPayDate">When's the next payment?</Label>
        <Controller
          name="nextPayDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              id="nextPayDate"
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              shouldShowCalendarButton
              minDate={allowPastDates ? undefined : format(new Date(), 'yyyy-MM-dd')}
            />
          )}
        />
        {errors.nextPayDate && (
          <p className="text-body text-destructive">{errors.nextPayDate.message}</p>
        )}
      </div>

      <div className={fieldClassName}>
        <Label htmlFor="primaryIncomeAccountId">Which account does it land in?</Label>
        <Controller
          name="primaryIncomeAccountId"
          control={control}
          render={({ field }) => (
            <AccountSelect
              id="primaryIncomeAccountId"
              value={field.value}
              onChange={field.onChange}
              placeholder="Select income account"
              error={errors.primaryIncomeAccountId?.message}
            />
          )}
        />
        {errors.primaryIncomeAccountId && (
          <p className="text-body text-destructive">
            {errors.primaryIncomeAccountId.message}
          </p>
        )}
      </div>

      <div className={fieldClassName}>
        <Label htmlFor="savingsAccountId">Where should your surplus go?</Label>
        <Controller
          name="savingsAccountId"
          control={control}
          render={({ field }) => (
            <AccountSelect
              id="savingsAccountId"
              value={field.value}
              onChange={field.onChange}
              placeholder="Select surplus account (optional)"
              error={errors.savingsAccountId?.message}
            />
          )}
        />
        {errors.savingsAccountId && (
          <p className="text-body text-destructive">{errors.savingsAccountId.message}</p>
        )}
      </div>
    </>
  );
}
