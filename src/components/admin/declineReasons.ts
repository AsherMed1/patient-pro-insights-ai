/**
 * Standardized Review Queue decline reasons.
 *
 * Each reason maps to a GHL contact tag. Client-side GHL workflows keyed on
 * these tags send the reason-appropriate SMS + email to the patient. A generic
 * `appointment-declined` tag is always added alongside the specific one so a
 * single catch-all workflow can also be used.
 */

export const GENERIC_DECLINE_TAG = 'appointment-declined';

export interface DeclineReasonOption {
  value: string;
  label: string;
  tag: string;
  requiresExplanation?: boolean;
}

export const DECLINE_REASONS: DeclineReasonOption[] = [
  { value: 'not_interested', label: 'Patient is no longer interested', tag: 'declined-not-interested' },
  { value: 'missing_insurance', label: 'Missing or incomplete insurance information', tag: 'declined-missing-insurance' },
  { value: 'criteria', label: 'Patient does not meet clinic criteria', tag: 'declined-criteria' },
  { value: 'booking_rule', label: 'Booking-rule violation', tag: 'declined-booking-rule' },
  { value: 'unverified', label: 'Unable to verify patient information', tag: 'declined-unverified' },
  { value: 'patient_cancelled', label: 'Patient requested cancellation', tag: 'declined-patient-cancelled' },
  { value: 'other', label: 'Other — requires an explanation', tag: 'declined-other', requiresExplanation: true },
];

export const getDeclineReason = (value?: string | null): DeclineReasonOption | undefined =>
  DECLINE_REASONS.find(r => r.value === value);

export const declineReasonLabel = (value?: string | null): string =>
  getDeclineReason(value)?.label ?? (value || '—');
