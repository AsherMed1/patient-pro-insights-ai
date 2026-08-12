import { supabase } from '@/integrations/supabase/client';
import { pushLifecycleTags } from '@/components/appointments/cancellationTags';

export const RESCHEDULE_BLOCK_TAG = 'no-show-not-eligible';
export const DO_NOT_RESCHEDULE_TAG = 'do-not-reschedule';

export interface RescheduleBlockTarget {
  id: string;
  project_name: string;
  lead_name?: string | null;
  ghl_id?: string | null;
  lead_phone_number?: string | null;
}

/**
 * Records the reschedule-eligibility decision made when an appointment is
 * marked No Show. When the patient is NOT eligible we also create a
 * patient-level block, an internal note, and tag the GHL contact so the
 * clinic's GHL workflow sends the "contact the clinic" text.
 *
 * Either way the unified lifecycle tag set is pushed so GHL workflows can
 * branch on `reschedulable` vs `do-not-reschedule` exactly like cancellations.
 */
export const applyNoShowEligibility = async (
  appointment: RescheduleBlockTarget,
  eligible: boolean,
  notes: string,
  userName: string,
  reason?: string | null
): Promise<void> => {
  const now = new Date().toISOString();
  const noteText = notes.trim() || null;
  const cleanReason = reason?.trim() || null;
  const reasonSuffix = `${cleanReason ? `. Reason: ${cleanReason}` : ''}${noteText ? `. Notes: ${noteText}` : ''}`;

  await supabase
    .from('all_appointments')
    .update({
      reschedule_eligible: eligible,
      reschedule_block_reason: eligible ? null : cleanReason || noteText,
      reschedule_blocked_at: eligible ? null : now,
      reschedule_blocked_by: eligible ? null : userName,
      updated_at: now,
    })
    .eq('id', appointment.id);

  if (eligible) {
    // Lift any pre-existing block for this patient
    await deactivateBlocks(appointment, userName);

    await supabase.from('appointment_notes').insert({
      appointment_id: appointment.id,
      note_text:
        `No-show recorded — patient remains eligible for rescheduling` +
        `${reasonSuffix} by ${userName}`,
      created_by: userName,
    });

    // Clear the legacy block tag, then push the unified set.
    await removeLegacyBlockTags(appointment.id);
    await pushLifecycleTags({
      appointmentId: appointment.id,
      kind: 'no-show',
      reason: cleanReason,
      reschedulable: true,
    });
    return;
  }

  // Patient-level block (per project)
  await supabase.from('patient_reschedule_blocks').upsert(
    {
      ghl_contact_id: appointment.ghl_id || null,
      project_name: appointment.project_name,
      patient_name: appointment.lead_name || null,
      lead_phone_number: appointment.lead_phone_number || null,
      source_appointment_id: appointment.id,
      reason: cleanReason || noteText,
      blocked_by: userName,
      is_active: true,
      unblocked_by: null,
      unblocked_at: null,
    },
    { onConflict: 'ghl_contact_id,project_name', ignoreDuplicates: false }
  );

  await supabase.from('appointment_notes').insert({
    appointment_id: appointment.id,
    note_text:
      `Marked NOT eligible for rescheduling after no-show — patient must contact the clinic directly` +
      `${reasonSuffix} by ${userName}`,
    created_by: userName,
  });

  await pushLifecycleTags({
    appointmentId: appointment.id,
    kind: 'no-show',
    reason: cleanReason,
    reschedulable: false,
    extraTags: [RESCHEDULE_BLOCK_TAG],
  });
};

/** Removes the legacy no-show block tags from the GHL contact. */
const removeLegacyBlockTags = async (appointmentId: string): Promise<void> => {
  try {
    const { data: appointmentData } = await supabase
      .from('all_appointments')
      .select('ghl_id, project_name')
      .eq('id', appointmentId)
      .maybeSingle();

    if (!appointmentData?.ghl_id) return;

    const { data: projectData } = await supabase
      .from('projects')
      .select('ghl_api_key')
      .eq('project_name', appointmentData.project_name)
      .maybeSingle();

    await supabase.functions.invoke('update-ghl-contact-tags', {
      body: {
        ghl_contact_id: appointmentData.ghl_id,
        ghl_api_key: projectData?.ghl_api_key || undefined,
        tags: [RESCHEDULE_BLOCK_TAG],
        action: 'remove',
        source: 'portal no-show (block lifted)',
      },
    });
  } catch (err) {
    // Non-critical: the portal-side state is already persisted
    console.error('GHL block tag removal failed (non-critical):', err);
  }
};


const deactivateBlocks = async (
  appointment: RescheduleBlockTarget,
  userName: string
): Promise<void> => {
  const patch = {
    is_active: false,
    unblocked_by: userName,
    unblocked_at: new Date().toISOString(),
  };

  if (appointment.ghl_id) {
    await supabase
      .from('patient_reschedule_blocks')
      .update(patch)
      .eq('project_name', appointment.project_name)
      .eq('ghl_contact_id', appointment.ghl_id)
      .eq('is_active', true);
  }

  if (appointment.lead_phone_number) {
    await supabase
      .from('patient_reschedule_blocks')
      .update(patch)
      .eq('project_name', appointment.project_name)
      .eq('lead_phone_number', appointment.lead_phone_number)
      .eq('is_active', true);
  }
};

/** Admin action: allow a previously blocked patient to be scheduled again. */
export const liftRescheduleBlock = async (
  appointment: RescheduleBlockTarget,
  userName: string
): Promise<void> => {
  await deactivateBlocks(appointment, userName);

  await supabase
    .from('all_appointments')
    .update({
      reschedule_eligible: true,
      reschedule_block_reason: null,
      reschedule_blocked_at: null,
      reschedule_blocked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointment.id);

  await supabase.from('appointment_notes').insert({
    appointment_id: appointment.id,
    note_text: `Reschedule block lifted — patient is eligible for scheduling again by ${userName}`,
    created_by: userName,
  });

  await syncGhlTags(appointment.id, 'remove');
};

export interface ActiveBlock {
  ghl_contact_id: string | null;
  lead_phone_number: string | null;
  project_name: string;
  reason: string | null;
  blocked_by: string | null;
  created_at: string;
}

/** Returns the active blocks, keyed by GHL contact id and by phone number. */
export const fetchActiveRescheduleBlocks = async (
  projectName?: string
): Promise<Map<string, ActiveBlock>> => {
  const map = new Map<string, ActiveBlock>();
  try {
    let query = supabase
      .from('patient_reschedule_blocks')
      .select('ghl_contact_id, lead_phone_number, project_name, reason, blocked_by, created_at')
      .eq('is_active', true);

    if (projectName && projectName !== 'ALL') {
      query = query.eq('project_name', projectName);
    }

    const { data, error } = await query;
    if (error) throw error;

    (data || []).forEach((block) => {
      if (block.ghl_contact_id) {
        map.set(`${block.project_name}::${block.ghl_contact_id}`, block as ActiveBlock);
      }
      if (block.lead_phone_number) {
        map.set(`${block.project_name}::${block.lead_phone_number}`, block as ActiveBlock);
      }
    });
  } catch (err) {
    console.error('Failed to fetch reschedule blocks:', err);
  }
  return map;
};

export const findBlockForAppointment = (
  blocks: Map<string, ActiveBlock> | undefined,
  appointment: RescheduleBlockTarget
): ActiveBlock | undefined => {
  if (!blocks) return undefined;
  return (
    (appointment.ghl_id
      ? blocks.get(`${appointment.project_name}::${appointment.ghl_id}`)
      : undefined) ||
    (appointment.lead_phone_number
      ? blocks.get(`${appointment.project_name}::${appointment.lead_phone_number}`)
      : undefined)
  );
};
