import { supabase } from '@/integrations/supabase/client';
import { isNoRescheduleReason } from './cancellationReasons';

/**
 * Lifecycle reason -> GHL tag mapping (cancellations AND no-shows).
 *
 * The portal's only job is to put accurate tags on the GHL contact. All SMS,
 * reschedule links and alerts are built as GHL workflows on top of these tags.
 *
 * Tags pushed on every portal cancellation / no-show:
 *  - `cancelled-portal` | `no-show-portal`   (single reliable workflow trigger)
 *  - `cancel-reason-<slug>` | `no-show-reason-<slug>`  (only when a reason is given)
 *  - `reschedulable` | `do-not-reschedule`   (the decisive branch flag)
 *
 * Stale reason tags and the opposite branch flag are removed first so a contact
 * never carries two contradicting values.
 */

export const CANCELLED_PORTAL_TAG = 'cancelled-portal';
export const NO_SHOW_PORTAL_TAG = 'no-show-portal';
export const RESCHEDULABLE_TAG = 'reschedulable';
export const DO_NOT_RESCHEDULE_TAG = 'do-not-reschedule';

export type LifecycleEventKind = 'cancellation' | 'no-show';

const REASON_PREFIX: Record<LifecycleEventKind, string> = {
  cancellation: 'cancel-reason',
  'no-show': 'no-show-reason',
};

const TRIGGER_TAG: Record<LifecycleEventKind, string> = {
  cancellation: CANCELLED_PORTAL_TAG,
  'no-show': NO_SHOW_PORTAL_TAG,
};

/** Reason value (as stored in all_appointments.cancellation_reason) -> slug. */
export const REASON_SLUGS: Record<string, string> = {
  // Do Not Reschedule group
  'Not Interested Anymore': 'not-interested',
  'Seeking Treatment Elsewhere': 'seeking-treatment-elsewhere',
  'Lives Too Far / Travel Not Feasible': 'too-far',
  'Does Not Want to Be Contacted': 'do-not-contact',
  'Unhappy with Service / Experience': 'unhappy',
  'Disqualified / Do Not Re-engage': 'disqualified',
  'Other (Do Not Reschedule)': 'other-do-not-reschedule',
  // Reschedulable group
  'Unable to Reach (Multiple Attempts)': 'unable-to-reach',
  'Scheduling Conflict': 'scheduling-conflict',
  'Missing Required Information': 'missing-info',
  Other: 'other',
};

const slugify = (reason: string) =>
  reason
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const reasonSlug = (reason: string): string => REASON_SLUGS[reason] || slugify(reason);

export const tagForReason = (kind: LifecycleEventKind, reason: string): string =>
  `${REASON_PREFIX[kind]}-${reasonSlug(reason)}`;

/** Backwards-compatible cancellation mapping. */
export const CANCEL_REASON_TAGS: Record<string, string> = Object.fromEntries(
  Object.entries(REASON_SLUGS).map(([reason, slug]) => [reason, `cancel-reason-${slug}`]),
);

export const ALL_CANCEL_REASON_TAGS = Array.from(new Set(Object.values(CANCEL_REASON_TAGS)));

export const allReasonTags = (kind: LifecycleEventKind): string[] =>
  Array.from(new Set(Object.values(REASON_SLUGS).map((slug) => `${REASON_PREFIX[kind]}-${slug}`)));

export const tagForCancellationReason = (reason: string): string =>
  tagForReason('cancellation', reason);

export interface PushLifecycleTagsResult {
  ok: boolean;
  tags: string[];
  error?: string;
}

export interface PushLifecycleTagsOptions {
  appointmentId: string;
  kind: LifecycleEventKind;
  /** Optional — when omitted only the trigger + branch flag are pushed. */
  reason?: string | null;
  /**
   * Explicit branch flag. When omitted it is derived from the reason
   * (Do Not Reschedule group -> do-not-reschedule).
   */
  reschedulable?: boolean;
  /** Extra tags to add alongside the standard set. */
  extraTags?: string[];
}

/**
 * Pushes the lifecycle tag set to the GHL contact for an appointment and writes
 * an audit note. Never throws — the status change must not be blocked by a GHL
 * failure.
 */
export async function pushLifecycleTags({
  appointmentId,
  kind,
  reason,
  reschedulable,
  extraTags = [],
}: PushLifecycleTagsOptions): Promise<PushLifecycleTagsResult> {
  const cleanReason = reason?.trim() || '';
  const reasonTag = cleanReason ? tagForReason(kind, cleanReason) : null;
  const canReschedule =
    typeof reschedulable === 'boolean'
      ? reschedulable
      : cleanReason
        ? !isNoRescheduleReason(cleanReason)
        : true;

  const tags = [
    TRIGGER_TAG[kind],
    ...(reasonTag ? [reasonTag] : []),
    canReschedule ? RESCHEDULABLE_TAG : DO_NOT_RESCHEDULE_TAG,
    ...extraTags,
  ];

  const audit = async (text: string) => {
    try {
      await supabase.from('appointment_notes').insert({
        appointment_id: appointmentId,
        note_text: text,
        created_by: 'System',
        visibility: 'internal',
      } as any);
    } catch (e) {
      console.error('Failed to write lifecycle tag audit note:', e);
    }
  };

  try {
    const { data: appointmentData } = await supabase
      .from('all_appointments')
      .select('ghl_id, project_name')
      .eq('id', appointmentId)
      .maybeSingle();

    if (!appointmentData?.ghl_id) {
      await audit(
        `GHL ${kind} tags skipped: no GHL contact ID on this appointment. Intended tags: ${tags.join(', ')}`,
      );
      return { ok: false, tags, error: 'no ghl contact id' };
    }

    const { data: projectData } = await supabase
      .from('projects')
      .select('ghl_api_key')
      .eq('project_name', appointmentData.project_name)
      .maybeSingle();

    const ghl_api_key = projectData?.ghl_api_key || undefined;

    // 1. Remove stale reason tags (for this event kind) plus the opposite
    //    branch flag so the contact reflects only the latest decision.
    const staleTags = allReasonTags(kind)
      .filter((t) => t !== reasonTag)
      .concat(canReschedule ? [DO_NOT_RESCHEDULE_TAG] : [RESCHEDULABLE_TAG])
      .filter((t) => !tags.includes(t));

    try {
      await supabase.functions.invoke('update-ghl-contact-tags', {
        body: {
          ghl_contact_id: appointmentData.ghl_id,
          ghl_api_key,
          tags: staleTags,
          action: 'remove',
          source: `portal ${kind} (stale reason cleanup)`,
        },
      });
    } catch (removeErr) {
      // Removing a tag the contact doesn't have is harmless; log and continue.
      console.warn('Stale lifecycle tag cleanup failed (non-critical):', removeErr);
    }

    // 2. Add the current tag set.
    const { error } = await supabase.functions.invoke('update-ghl-contact-tags', {
      body: {
        ghl_contact_id: appointmentData.ghl_id,
        ghl_api_key,
        tags,
        action: 'add',
        source: `portal ${kind}`,
      },
    });

    if (error) throw error;

    await audit(`GHL ${kind} tags applied: ${tags.join(', ')}`);
    return { ok: true, tags };
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error('Lifecycle tag push failed (non-critical):', err);
    await audit(`GHL ${kind} tags FAILED (${tags.join(', ')}): ${message}`);
    return { ok: false, tags, error: message };
  }
}

export type PushCancellationTagsResult = PushLifecycleTagsResult;

/** Cancellation wrapper kept for existing call sites. */
export async function pushCancellationTags(
  appointmentId: string,
  reason: string,
): Promise<PushLifecycleTagsResult> {
  return pushLifecycleTags({ appointmentId, kind: 'cancellation', reason });
}
