/**
 * Shared cancellation reasons for the "Cancel Appointment" dialog.
 *
 * Two groups:
 *  - NO_RESCHEDULE_REASONS  -> enables GHL DND + adds the `do-not-reschedule` tag
 *  - ALLOW_RESCHEDULE_REASONS -> patient stays reachable for rescheduling
 *
 * Each group has its own "Other" entry. They share the same visible label but
 * store distinct values so reporting (and the DND branch) can tell them apart.
 */

export interface CancellationReasonOption {
  /** Value stored in all_appointments.cancellation_reason */
  value: string;
  /** Label shown in the dialog */
  label: string;
  /** Free-text notes are mandatory for this reason */
  requiresNotes?: boolean;
}

export const OTHER_NO_RESCHEDULE = 'Other (Do Not Reschedule)';
export const OTHER_ALLOW_RESCHEDULE = 'Other';

export const NO_RESCHEDULE_REASON_OPTIONS: CancellationReasonOption[] = [
  { value: 'Not Interested Anymore', label: 'Not Interested Anymore' },
  { value: 'Seeking Treatment Elsewhere', label: 'Seeking Treatment Elsewhere' },
  { value: 'Lives Too Far / Travel Not Feasible', label: 'Lives Too Far / Travel Not Feasible' },
  { value: 'Does Not Want to Be Contacted', label: 'Does Not Want to Be Contacted' },
  { value: 'Unhappy with Service / Experience', label: 'Unhappy with Service / Experience' },
  { value: 'Disqualified / Do Not Re-engage', label: 'Disqualified / Do Not Re-engage' },
  { value: OTHER_NO_RESCHEDULE, label: 'Other', requiresNotes: true },
];

export const ALLOW_RESCHEDULE_REASON_OPTIONS: CancellationReasonOption[] = [
  { value: 'Unable to Reach (Multiple Attempts)', label: 'Unable to Reach (Multiple Attempts)' },
  { value: 'Scheduling Conflict', label: 'Scheduling Conflict' },
  { value: 'Missing Required Information', label: 'Missing Required Information' },
  { value: OTHER_ALLOW_RESCHEDULE, label: 'Other', requiresNotes: true },
];

/** Values that must trigger the GHL DND + do-not-reschedule tag flow. */
export const NO_RESCHEDULE_REASON_VALUES = NO_RESCHEDULE_REASON_OPTIONS.map(r => r.value);

export const isNoRescheduleReason = (reason: string): boolean =>
  NO_RESCHEDULE_REASON_VALUES.includes(reason);

export const reasonRequiresNotes = (reason: string): boolean =>
  [...NO_RESCHEDULE_REASON_OPTIONS, ...ALLOW_RESCHEDULE_REASON_OPTIONS]
    .some(r => r.value === reason && r.requiresNotes);

/** Welcome Call answer -> human readable string used in notes. */
export const welcomeCallLabel = (completed: boolean | null): string =>
  completed === null ? 'Not recorded' : completed ? 'Yes' : 'No';
