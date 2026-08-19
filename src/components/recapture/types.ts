export type WorkStatus = 'new' | 'nurture' | 'follow_up' | 'completed';
export type LostType = 'cancelled' | 'no_show';
export type Channel = 'call' | 'text' | 'email' | 'voicemail';
export type AttemptResult =
  | 'answered'
  | 'voicemail'
  | 'no_answer'
  | 'busy'
  | 'disconnected'
  | 'wrong_number'
  | 'callback_requested'
  | 'not_interested'
  | 'other';

export type CompletionReason =
  | 'booked_rescheduled'
  | 'not_interested'
  | 'unable_to_reach'
  | 'invalid_contact'
  | 'other';

export interface RecaptureCase {
  id: string;
  appointment_id: string | null;
  ghl_contact_id: string | null;
  project_name: string;
  patient_name: string | null;
  lead_phone_number?: string | null;
  lead_email?: string | null;
  service_line: string | null;
  lost_type: LostType;
  lost_status_at_entry: string | null;
  appointment_date: string | null;
  entered_worklist_at: string;
  assigned_user_id: string | null;
  work_started_at: string | null;
  work_status: WorkStatus;
  outcome: string | null;
  outcome_notes: string | null;
  completion_reason: CompletionReason | null;
  follow_up_at: string | null;
  follow_up_note: string | null;
  completed_at: string | null;
  completed_by: string | null;
  rebooked_appointment_id: string | null;
  recovered: boolean;
  attempt_count: number;
  first_attempt_at: string | null;
  last_attempt_at: string | null;
  stale: boolean;
  created_at: string;
  updated_at: string;
  assignee_name?: string | null;
  assignee_email?: string | null;
}

export interface RecaptureAttempt {
  id: string;
  case_id: string;
  channel: Channel;
  attempted_at: string;
  result: AttemptResult | null;
  note: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  new: 'New',
  nurture: 'Nurture',
  follow_up: 'Follow-Up',
  completed: 'Completed',
};

export const LOST_TYPE_LABELS: Record<LostType, string> = {
  cancelled: 'Cancelled',
  no_show: 'No-Show',
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  call: 'Call',
  text: 'Text',
  email: 'Email',
  voicemail: 'Voicemail',
};

export const RESULT_LABELS: Record<AttemptResult, string> = {
  answered: 'Patient Answered',
  voicemail: 'Left Voicemail',
  no_answer: 'No Answer',
  busy: 'Busy',
  disconnected: 'Disconnected',
  wrong_number: 'Wrong Number',
  callback_requested: 'Callback Requested',
  not_interested: 'Not Interested',
  other: 'Other',
};

export const COMPLETION_REASON_LABELS: Record<CompletionReason, string> = {
  booked_rescheduled: 'Booked / Rescheduled',
  not_interested: 'Not Interested',
  unable_to_reach: 'Unable to Reach',
  invalid_contact: 'Invalid Contact Number',
  other: 'Other',
};

/** Human readable countdown until (or since) a follow-up time. */
export function followUpCountdown(followUpAt: string | null): { label: string; overdue: boolean } | null {
  if (!followUpAt) return null;
  const target = new Date(followUpAt).getTime();
  if (isNaN(target)) return null;
  const diff = target - Date.now();
  const overdue = diff < 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const parts = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return { label: overdue ? `${parts} overdue` : `due in ${parts}`, overdue };
}
