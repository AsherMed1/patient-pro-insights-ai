import { supabase } from "@/integrations/supabase/client";

// Projects whose GHL contacts carry scheduling-state tags so GHL workflows can
// message patients who are still waiting on the clinic to set a date/time.
export const SCHEDULING_TAG_PROJECTS = ['Prospero Vascular and Interventional'];

export const AWAITING_SCHEDULING_TAG = 'awaiting-scheduling';
export const AWAITING_AGING_TAGS = ['awaiting-scheduling-24h', 'awaiting-scheduling-72h'];
export const APPOINTMENT_SCHEDULED_TAG = 'appointment-scheduled';

export function isSchedulingTagProject(projectName?: string | null): boolean {
  const n = (projectName || '').trim().toLowerCase();
  return SCHEDULING_TAG_PROJECTS.some((p) => p.toLowerCase() === n);
}

/**
 * Called when the clinic sets a date/time in the Portal for an unscheduled lead:
 * adds `appointment-scheduled` and clears the waiting tags in GHL.
 * Fire-and-forget — never blocks the UI.
 */
export async function markAppointmentScheduledInGHL(appointment: {
  project_name?: string | null;
  ghl_id?: string | null;
}): Promise<void> {
  try {
    if (!appointment?.ghl_id || !isSchedulingTagProject(appointment.project_name)) return;

    const { data: projectData } = await supabase
      .from('projects')
      .select('ghl_api_key')
      .eq('project_name', appointment.project_name as string)
      .maybeSingle();
    const ghl_api_key = (projectData as any)?.ghl_api_key || undefined;

    const call = (tags: string[], action: 'add' | 'remove') =>
      supabase.functions.invoke('update-ghl-contact-tags', {
        body: {
          ghl_contact_id: appointment.ghl_id,
          ghl_api_key,
          tags,
          action,
          source: 'Portal — clinic set appointment date/time',
        },
      });

    await call([AWAITING_SCHEDULING_TAG, ...AWAITING_AGING_TAGS], 'remove');
    await call([APPOINTMENT_SCHEDULED_TAG], 'add');
  } catch (e) {
    console.error('Failed to sync scheduling tags to GHL:', e);
  }
}
