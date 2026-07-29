/**
 * Standardized Review Queue decline reasons.
 *
 * Each reason maps to a GHL contact tag. Client-side GHL workflows keyed on
 * these tags send the reason-appropriate SMS + email to the patient. A generic
 * `appointment-declined` tag is always added alongside the specific one so a
 * single catch-all workflow can also be used.
 *
 * Reschedule intent
 * -----------------
 * Every decline also pushes exactly one of `declined-reschedule` /
 * `declined-no-reschedule`. The clinic's rescheduling workflow must be
 * triggered by `declined-reschedule` ONLY, so it never fires for
 * "no longer interested" or "does not meet clinic criteria". For "Other" the
 * setter explicitly picks the intent in the decline dialog.
 */

export const GENERIC_DECLINE_TAG = 'appointment-declined';
export const RESCHEDULE_TAG = 'declined-reschedule';
export const NO_RESCHEDULE_TAG = 'declined-no-reschedule';

export interface DeclineReasonOption {
  value: string;
  label: string;
  tag: string;
  requiresExplanation?: boolean;
  /** true = reschedule workflow fires, false = it must not, null = setter chooses */
  reschedulable: boolean | null;
  /** Hidden from the dropdown — stored variants resolved after the setter chooses */
  hidden?: boolean;
}

export const DECLINE_REASONS: DeclineReasonOption[] = [
  { value: 'not_interested', label: 'Patient is no longer interested', tag: 'declined-not-interested', reschedulable: false },
  { value: 'missing_insurance', label: 'Missing or incomplete insurance information', tag: 'declined-missing-insurance', reschedulable: true },
  { value: 'criteria', label: 'Patient does not meet clinic criteria', tag: 'declined-criteria', reschedulable: false },
  { value: 'booking_rule', label: 'Booking-rule violation', tag: 'declined-booking-rule', reschedulable: true },
  { value: 'unverified', label: 'Unable to verify patient information', tag: 'declined-unverified', reschedulable: true },
  { value: 'patient_cancelled', label: 'Patient requested cancellation', tag: 'declined-patient-cancelled', reschedulable: true },
  { value: 'other', label: 'Other — requires an explanation', tag: 'declined-other', requiresExplanation: true, reschedulable: null },
  // Stored variants of "Other" once the setter picks the reschedule intent.
  {
    value: 'other_reschedule',
    label: 'Other — patient needs to be rescheduled',
    tag: 'declined-other',
    requiresExplanation: true,
    reschedulable: true,
    hidden: true,
  },
  {
    value: 'other_no_reschedule',
    label: 'Other — patient should not be rescheduled',
    tag: 'declined-other',
    requiresExplanation: true,
    reschedulable: false,
    hidden: true,
  },
];

/** Options shown in the decline dropdown. */
export const SELECTABLE_DECLINE_REASONS = DECLINE_REASONS.filter(r => !r.hidden);

export const getDeclineReason = (value?: string | null): DeclineReasonOption | undefined =>
  DECLINE_REASONS.find(r => r.value === value);

export const declineReasonLabel = (value?: string | null): string =>
  getDeclineReason(value)?.label ?? (value || '—');

/**
 * Resolves the reason value actually stored/pushed. "Other" collapses into one
 * of its intent-specific variants; every other reason passes through.
 */
export const resolveDeclineReasonValue = (
  reasonValue: string,
  otherNeedsReschedule?: boolean | null
): string => {
  if (reasonValue !== 'other') return reasonValue;
  return otherNeedsReschedule ? 'other_reschedule' : 'other_no_reschedule';
};

/** The reschedule-intent tag for a resolved reason value. */
export const rescheduleTagFor = (value?: string | null): string =>
  getDeclineReason(value)?.reschedulable ? RESCHEDULE_TAG : NO_RESCHEDULE_TAG;
