export type WorkStatus = 'new' | 'opened' | 'nurture' | 'follow_up' | 'completed';
export type LostType = 'cancelled' | 'no_show';
/** Outreach methods a setter can log. */
export type Channel = 'call' | 'text' | 'email';

export type AttemptResult =
  // Call
  | 'answered'
  | 'voicemail'
  | 'no_answer'
  | 'busy'
  | 'disconnected'
  | 'wrong_number'
  // Text
  | 'text_sent'
  | 'text_responded'
  | 'text_failed'
  // Email
  | 'email_sent'
  | 'email_responded'
  | 'email_failed'
  // Legacy values kept readable on historical rows
  | 'callback_requested'
  | 'not_interested'
  | 'other';

/** Chosen after successful patient contact — never inferred from the attempt. */
export type ConversationOutcome =
  | 'booked_rescheduled'
  | 'follow_up_required'
  | 'callback_requested'
  | 'not_interested'
  | 'other';

export type CompletionReason =
  | 'booked_rescheduled'
  | 'not_interested'
  | 'unable_to_reach'
  | 'invalid_contact'
  | 'wrong_number'
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
  conversation_outcome: ConversationOutcome | null;
  completion_reason: CompletionReason | null;
  follow_up_at: string | null;
  follow_up_note: string | null;
  follow_up_timezone: string | null;
  opened_at: string | null;
  opened_by: string | null;
  opened_by_name: string | null;
  booked_by_user_id: string | null;
  booked_by_name: string | null;
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
  conversation_outcome: ConversationOutcome | null;
  booked_by_user_id: string | null;
  booked_by_name: string | null;
  note: string | null;
  user_id: string | null;
  user_name: string | null;
  created_at: string;
}

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  new: 'New',
  opened: 'Opened',
  nurture: 'Nurture',
  follow_up: 'Follow-Up',
  completed: 'Completed',
};

export const LOST_TYPE_LABELS: Record<LostType, string> = {
  cancelled: 'Cancelled',
  no_show: 'No-Show',
};

export const CHANNEL_LABELS: Record<string, string> = {
  call: 'Call',
  text: 'Text',
  email: 'Email',
  voicemail: 'Voicemail',
};

export const RESULT_LABELS: Record<string, string> = {
  answered: 'Patient Answered',
  voicemail: 'Left Voicemail',
  no_answer: 'No Answer',
  busy: 'Busy',
  disconnected: 'Number Disconnected',
  wrong_number: 'Wrong Number',
  text_sent: 'Text Sent — No Response',
  text_responded: 'Patient Answered (Responded)',
  text_failed: 'Message Failed / Undeliverable',
  email_sent: 'Email Sent — No Response',
  email_responded: 'Patient Answered (Responded)',
  email_failed: 'Email Failed / Undeliverable',
  callback_requested: 'Callback Requested',
  not_interested: 'Not Interested',
  other: 'Other',
};

/** Attempt outcomes offered per method. */
export const RESULTS_BY_CHANNEL: Record<Channel, AttemptResult[]> = {
  call: ['answered', 'voicemail', 'no_answer', 'busy', 'disconnected', 'wrong_number'],
  text: ['text_sent', 'text_responded', 'text_failed', 'wrong_number'],
  email: ['email_sent', 'email_responded', 'email_failed'],
};

/** Attempt outcomes that mean the patient was actually reached. */
export const CONTACT_RESULTS: AttemptResult[] = ['answered', 'text_responded', 'email_responded'];

/** Attempt outcome that closes the record on its own. */
export const isWrongNumberResult = (r: AttemptResult | '' | null) => r === 'wrong_number';

export const CONVERSATION_OUTCOME_LABELS: Record<ConversationOutcome, string> = {
  booked_rescheduled: 'Rescheduled / Booked',
  follow_up_required: 'Follow-Up Required',
  callback_requested: 'Callback Requested',
  not_interested: 'Not Interested',
  other: 'Other',
};

export const CONVERSATION_OUTCOMES: ConversationOutcome[] = [
  'booked_rescheduled',
  'follow_up_required',
  'callback_requested',
  'not_interested',
  'other',
];

/** Conversation outcomes that open the Schedule Follow-Up modal. */
export const SCHEDULING_OUTCOMES: ConversationOutcome[] = ['follow_up_required', 'callback_requested'];

export const COMPLETION_REASON_LABELS: Record<CompletionReason, string> = {
  booked_rescheduled: 'Booked / Rescheduled',
  not_interested: 'Not Interested',
  unable_to_reach: 'Unable to Reach',
  invalid_contact: 'Invalid Contact Number',
  wrong_number: 'Invalid / Wrong Number',
  other: 'Other',
};

/** Human readable countdown until (or since) a follow-up time. */
export function followUpCountdown(
  followUpAt: string | null,
): { label: string; short: string; overdue: boolean; due: boolean } | null {
  if (!followUpAt) return null;
  const target = new Date(followUpAt).getTime();
  if (isNaN(target)) return null;
  const diff = target - Date.now();
  const overdue = diff < -60000;
  const due = diff <= 0 && !overdue;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const parts = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  if (due) return { label: 'Due', short: 'Due', overdue: false, due: true };
  return {
    label: overdue ? `${parts} overdue` : `due in ${parts}`,
    short: overdue ? `Overdue ${parts}` : parts,
    overdue,
    due: false,
  };
}
