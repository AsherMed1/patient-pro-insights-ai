// One-time utility: re-create Belinda Yeary's Apr 23, 2026 3:00 PM appointment
// in `all_appointments` after the original Apr 22 record was rescheduled in GHL
// and then deleted by the setter to stop the reminder bot.
//
// The new GHL event was confirmed by querying
// GET /contacts/jvWBldD5oWJEJJgQ21lY/appointments on Apr 21, 2026:
//   {
//     id: "6bw6VmX5Xroj4Y4Zzzey",
//     calendarId: "x2TJwUVP2iA3gQh2ofMR",
//     assignedUserId: "YpBPlq9yJkX040F8cWJn",
//     startTime: "2026-04-23 15:00:00",
//     endTime:   "2026-04-23 15:15:00",
//     appointmentStatus: "confirmed",
//     locationId: "9qcQctq3qbKJfJgtB6xL",
//     title: "Belinda  Yeary  Neuropathy consultation at North Knoxville"
//   }
//
// This utility is invoked once from the browser console:
//   import { syncBelindaYearyApr23 } from '@/utils/syncBelindaYearyApr23';
//   await syncBelindaYearyApr23();
//
// After successful execution it should NOT be re-run (it inserts a new row each time).

import { supabase } from '@/integrations/supabase/client';

const ORIGINAL_APPOINTMENT_ID = 'a20b2910-6609-47ed-a3ab-f774589091ce';

const NEW_GHL_APPOINTMENT_ID = '6bw6VmX5Xroj4Y4Zzzey';
const NEW_DATE = '2026-04-23';
const NEW_TIME = '15:00:00';
const NEW_CALENDAR_NAME = 'Request your Neuropathy Consultation at North Knoxville';

export async function syncBelindaYearyApr23() {
  // 1. Pull the original (cancelled) Apr 22 record to inherit contact/insurance/notes data
  const { data: original, error: originalError } = await supabase
    .from('all_appointments')
    .select('*')
    .eq('id', ORIGINAL_APPOINTMENT_ID)
    .single();

  if (originalError || !original) {
    console.error('Could not load original appointment:', originalError);
    throw originalError ?? new Error('Original appointment not found');
  }

  // 2. Guard: don't insert a duplicate if this has already been run
  const { data: existing } = await supabase
    .from('all_appointments')
    .select('id, status, date_of_appointment')
    .eq('ghl_appointment_id', NEW_GHL_APPOINTMENT_ID)
    .maybeSingle();

  if (existing) {
    console.log('New Apr 23 record already exists, nothing to do:', existing);
    return existing;
  }

  // 3. Insert the new Apr 23 confirmed record, copying patient/insurance fields from
  //    the cancelled Apr 22 record so Patient Pro Insights stays populated.
  const { data: inserted, error: insertError } = await supabase
    .from('all_appointments')
    .insert({
      lead_name: original.lead_name,
      lead_phone_number: original.lead_phone_number,
      lead_email: original.lead_email,
      project_name: original.project_name,
      ghl_id: original.ghl_id, // GHL contact id stays the same
      ghl_appointment_id: NEW_GHL_APPOINTMENT_ID,
      ghl_location_id: original.ghl_location_id,
      calendar_name: NEW_CALENDAR_NAME,
      date_of_appointment: NEW_DATE,
      requested_time: NEW_TIME,
      date_appointment_created: new Date().toISOString().slice(0, 10),
      status: 'Confirmed',
      internal_process_complete: false,
      dob: original.dob,
      detected_insurance_provider: original.detected_insurance_provider,
      detected_insurance_plan: original.detected_insurance_plan,
      detected_insurance_id: original.detected_insurance_id,
      insurance_id_link: original.insurance_id_link,
      patient_intake_notes: original.patient_intake_notes,
      parsed_demographics: original.parsed_demographics,
      parsed_contact_info: original.parsed_contact_info,
      parsed_insurance_info: original.parsed_insurance_info,
      parsed_medical_info: original.parsed_medical_info,
      parsed_pathology_info: original.parsed_pathology_info,
      ai_summary: original.ai_summary,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    console.error('Failed to insert new Apr 23 appointment:', insertError);
    throw insertError ?? new Error('Insert failed');
  }

  // 4. Add an internal note explaining the manual sync for the audit trail
  const { error: noteError } = await supabase.from('appointment_notes').insert({
    appointment_id: inserted.id,
    note_text:
      'Recreated from GHL after rescheduling — original Apr 22 2:45 PM event was ' +
      'rescheduled to Apr 23 3:00 PM in GHL, then the original GHL event was deleted ' +
      'by the setter to stop the reminder bot. The new Apr 23 confirmed event never ' +
      'auto-synced into Insights, so this record was manually created from the live ' +
      'GHL event (id: ' + NEW_GHL_APPOINTMENT_ID + '). Original cancelled Apr 22 ' +
      'record left in place for historical accuracy.',
  });

  if (noteError) {
    console.warn('Inserted appointment, but failed to add internal note:', noteError);
  }

  console.log('Successfully synced Belinda Yeary Apr 23 appointment:', inserted);
  return inserted;
}
