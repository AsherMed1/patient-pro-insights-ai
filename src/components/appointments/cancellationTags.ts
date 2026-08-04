import { supabase } from '@/integrations/supabase/client';
import { isNoRescheduleReason } from './cancellationReasons';

/**
 * Cancellation reason -> GHL tag mapping.
 *
 * The portal's only job is to put accurate tags on the GHL contact. All SMS,
 * reschedule links and alerts are built as GHL workflows on top of these tags.
 *
 * Tags pushed on every portal cancellation:
 *  - `cancelled-portal`               (single reliable workflow trigger)
 *  - `cancel-reason-<slug>`           (one per reason)
 *  - `reschedulable` | `do-not-reschedule`  (the decisive branch flag)
 *
 * Stale `cancel-reason-*` tags are removed first so a contact never carries two
 * contradicting reasons.
 */

export const CANCELLED_PORTAL_TAG = 'cancelled-portal';
export const RESCHEDULABLE_TAG = 'reschedulable';
export const DO_NOT_RESCHEDULE_TAG = 'do-not-reschedule';

/** Reason value (as stored in all_appointments.cancellation_reason) -> tag. */
export const CANCEL_REASON_TAGS: Record<string, string> = {
  // Do Not Reschedule group
  'Not Interested Anymore': 'cancel-reason-not-interested',
  'Seeking Treatment Elsewhere': 'cancel-reason-seeking-treatment-elsewhere',
  'Lives Too Far / Travel Not Feasible': 'cancel-reason-too-far',
  'Does Not Want to Be Contacted': 'cancel-reason-do-not-contact',
  'Unhappy with Service / Experience': 'cancel-reason-unhappy',
  'Disqualified / Do Not Re-engage': 'cancel-reason-disqualified',
  'Other (Do Not Reschedule)': 'cancel-reason-other-do-not-reschedule',
  // Reschedulable group
  'Unable to Reach (Multiple Attempts)': 'cancel-reason-unable-to-reach',
  'Scheduling Conflict': 'cancel-reason-scheduling-conflict',
  'Missing Required Information': 'cancel-reason-missing-info',
  Other: 'cancel-reason-other',
};

/** Every reason tag we may have written previously — removed before re-tagging. */
export const ALL_CANCEL_REASON_TAGS = Array.from(new Set(Object.values(CANCEL_REASON_TAGS)));

const slugify = (reason: string) =>
  `cancel-reason-${reason
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;

export const tagForCancellationReason = (reason: string): string =>
  CANCEL_REASON_TAGS[reason] || slugify(reason);

export interface PushCancellationTagsResult {
  ok: boolean;
  tags: string[];
  error?: string;
}

/**
 * Pushes the cancellation tag set to the GHL contact for an appointment and
 * writes an audit note. Never throws — cancellation must not be blocked by a
 * GHL failure.
 */
export async function pushCancellationTags(
  appointmentId: string,
  reason: string,
): Promise<PushCancellationTagsResult> {
  const reasonTag = tagForCancellationReason(reason);
  const noReschedule = isNoRescheduleReason(reason);
  const tags = [
    CANCELLED_PORTAL_TAG,
    reasonTag,
    noReschedule ? DO_NOT_RESCHEDULE_TAG : RESCHEDULABLE_TAG,
  ];

  const audit = async (text: string) => {
    try {
      await supabase.from('appointment_notes').insert({
        appointment_id: appointmentId,
        note_text: text,
        created_by: 'System',
      });
    } catch (e) {
      console.error('Failed to write cancellation tag audit note:', e);
    }
  };

  try {
    const { data: appointmentData } = await supabase
      .from('all_appointments')
      .select('ghl_id, project_name')
      .eq('id', appointmentId)
      .maybeSingle();

    if (!appointmentData?.ghl_id) {
      await audit(`GHL cancellation tags skipped: no GHL contact ID on this appointment. Intended tags: ${tags.join(', ')}`);
      return { ok: false, tags, error: 'no ghl contact id' };
    }

    const { data: projectData } = await supabase
      .from('projects')
      .select('ghl_api_key')
      .eq('project_name', appointmentData.project_name)
      .maybeSingle();

    const ghl_api_key = projectData?.ghl_api_key || undefined;

    // 1. Remove stale reason tags (plus the opposite branch flag) so the
    //    contact reflects only the latest cancellation.
    const staleTags = ALL_CANCEL_REASON_TAGS.filter((t) => t !== reasonTag).concat(
      noReschedule ? [RESCHEDULABLE_TAG] : [DO_NOT_RESCHEDULE_TAG],
    );
    try {
      await supabase.functions.invoke('update-ghl-contact-tags', {
        body: {
          ghl_contact_id: appointmentData.ghl_id,
          ghl_api_key,
          tags: staleTags,
          action: 'remove',
          source: 'portal cancellation (stale reason cleanup)',
        },
      });
    } catch (removeErr) {
      // Removing a tag the contact doesn't have is harmless; log and continue.
      console.warn('Stale cancellation tag cleanup failed (non-critical):', removeErr);
    }

    // 2. Add the current tag set.
    const { error } = await supabase.functions.invoke('update-ghl-contact-tags', {
      body: {
        ghl_contact_id: appointmentData.ghl_id,
        ghl_api_key,
        tags,
        action: 'add',
        source: 'portal cancellation',
      },
    });

    if (error) throw error;

    await audit(`GHL cancellation tags applied: ${tags.join(', ')}`);
    return { ok: true, tags };
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error('Cancellation tag push failed (non-critical):', err);
    await audit(`GHL cancellation tags FAILED (${tags.join(', ')}): ${message}`);
    return { ok: false, tags, error: message };
  }
}
