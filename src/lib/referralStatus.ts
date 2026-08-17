import { supabase } from '@/integrations/supabase/client';

/**
 * "Referral Requested" lifecycle.
 *
 * Practices such as Alliance require a PCP referral before the consultation.
 * Previously staff marked these patients OON just to free the slot, which
 * polluted OON reporting and lost visibility on the referral wait.
 *
 * Marking a patient "Referral Requested":
 *  - cancels the GHL appointment so the slot re-opens (handled by the status
 *    change path, which maps this status to Cancelled for GHL only)
 *  - keeps the portal record ACTIVE as an unscheduled lead (date/time cleared,
 *    is_unscheduled = true) so it never lands in the Completed bucket
 *  - stamps referral_requested_at / referral_status and appends to
 *    referral_history so delays can be reported on
 *  - pushes a `referral-requested` tag to the GHL contact for workflows
 */

export const REFERRAL_STATUS = 'Referral Requested';

export type ReferralStage = 'requested' | 'received' | 'ready_to_schedule' | 'cleared';

export const REFERRAL_STAGE_LABELS: Record<ReferralStage, string> = {
  requested: 'Referral Requested',
  received: 'Referral Received',
  ready_to_schedule: 'Ready to Schedule',
  cleared: 'Referral Cleared',
};

export const REFERRAL_TAGS: Record<ReferralStage, string> = {
  requested: 'referral-requested',
  received: 'referral-received',
  ready_to_schedule: 'referral-ready-to-schedule',
  cleared: 'referral-cleared',
};

export const isReferralStatus = (status?: string | null) =>
  (status || '').trim().toLowerCase() === REFERRAL_STATUS.toLowerCase();

interface ReferralHistoryEntry {
  stage: ReferralStage;
  label: string;
  at: string;
  by: string;
  notes?: string;
  previous_status?: string | null;
  previous_date?: string | null;
  previous_time?: string | null;
}

const appendHistory = async (
  appointmentId: string,
  entry: ReferralHistoryEntry,
): Promise<ReferralHistoryEntry[]> => {
  const { data } = await supabase
    .from('all_appointments')
    .select('referral_history')
    .eq('id', appointmentId)
    .maybeSingle();
  const existing = Array.isArray((data as any)?.referral_history)
    ? ((data as any).referral_history as ReferralHistoryEntry[])
    : [];
  return [...existing, entry];
};

const syncTags = async (
  appointmentId: string,
  stage: ReferralStage,
) => {
  try {
    const { data: appt } = await supabase
      .from('all_appointments')
      .select('ghl_id, project_name')
      .eq('id', appointmentId)
      .maybeSingle();
    if (!appt?.ghl_id) return;

    const { data: project } = await supabase
      .from('projects')
      .select('ghl_api_key')
      .eq('project_name', appt.project_name)
      .maybeSingle();
    const ghl_api_key = project?.ghl_api_key || undefined;

    const stale = Object.values(REFERRAL_TAGS).filter((t) => t !== REFERRAL_TAGS[stage]);
    await supabase.functions.invoke('update-ghl-contact-tags', {
      body: {
        ghl_contact_id: appt.ghl_id,
        ghl_api_key,
        tags: stale,
        action: 'remove',
        source: 'portal referral (stale cleanup)',
      },
    });
    await supabase.functions.invoke('update-ghl-contact-tags', {
      body: {
        ghl_contact_id: appt.ghl_id,
        ghl_api_key,
        tags: [REFERRAL_TAGS[stage]],
        action: 'add',
        source: 'portal referral',
      },
    });
  } catch (err) {
    console.error('Referral tag sync failed (non-critical):', err);
  }
};

export interface ApplyReferralOptions {
  appointmentId: string;
  userName: string;
  notes?: string;
  previousStatus?: string | null;
  previousDate?: string | null;
  previousTime?: string | null;
}

/**
 * Persists the referral state on the appointment after the status itself has
 * been moved to "Referral Requested". Never throws — a GHL/tag failure must
 * not roll back the portal state.
 */
export async function applyReferralRequested({
  appointmentId,
  userName,
  notes,
  previousStatus,
  previousDate,
  previousTime,
}: ApplyReferralOptions): Promise<void> {
  const now = new Date().toISOString();

  const history = await appendHistory(appointmentId, {
    stage: 'requested',
    label: REFERRAL_STAGE_LABELS.requested,
    at: now,
    by: userName,
    notes: notes?.trim() || undefined,
    previous_status: previousStatus ?? null,
    previous_date: previousDate ?? null,
    previous_time: previousTime ?? null,
  });

  await supabase
    .from('all_appointments')
    .update({
      referral_status: 'requested',
      referral_requested_at: now,
      referral_history: history as any,
      // Free the slot: the patient stays active but is no longer scheduled.
      date_of_appointment: null,
      requested_time: null,
      is_unscheduled: true,
      internal_process_complete: false,
      updated_at: now,
    } as any)
    .eq('id', appointmentId);

  await supabase.from('appointment_notes').insert({
    appointment_id: appointmentId,
    note_text:
      `Referral Requested by ${userName}. Appointment slot released${
        previousDate ? ` (was ${previousDate}${previousTime ? ` ${String(previousTime).slice(0, 5)}` : ''})` : ''
      }.${notes?.trim() ? ` Notes: ${notes.trim()}` : ''} - [[timestamp:${now}]]`,
    created_by: 'System',
    visibility: 'internal',
  } as any);

  await syncTags(appointmentId, 'requested');
}

/**
 * Advances / clears the referral stage without changing the appointment status
 * (used by the Referrals tab actions).
 */
export async function setReferralStage(
  appointmentId: string,
  stage: ReferralStage,
  userName: string,
  notes?: string,
): Promise<void> {
  const now = new Date().toISOString();
  const history = await appendHistory(appointmentId, {
    stage,
    label: REFERRAL_STAGE_LABELS[stage],
    at: now,
    by: userName,
    notes: notes?.trim() || undefined,
  });

  await supabase
    .from('all_appointments')
    .update({
      referral_status: stage === 'cleared' ? null : stage,
      referral_history: history as any,
      updated_at: now,
    } as any)
    .eq('id', appointmentId);

  await supabase.from('appointment_notes').insert({
    appointment_id: appointmentId,
    note_text: `${REFERRAL_STAGE_LABELS[stage]} marked by ${userName}.${
      notes?.trim() ? ` Notes: ${notes.trim()}` : ''
    } - [[timestamp:${now}]]`,
    created_by: 'System',
    visibility: 'internal',
  } as any);

  await syncTags(appointmentId, stage);
}

/** Days a patient has been waiting on a referral. */
export const referralWaitDays = (requestedAt?: string | null): number | null => {
  if (!requestedAt) return null;
  const ms = Date.now() - new Date(requestedAt).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};
