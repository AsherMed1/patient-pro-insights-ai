// Throwaway edge function to execute the Belinda Yeary Apr 23 sync once
// against the service-role client. Safe to delete after running.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ORIGINAL_APPOINTMENT_ID = 'a20b2910-6609-47ed-a3ab-f774589091ce';
const NEW_GHL_APPOINTMENT_ID = '6bw6VmX5Xroj4Y4Zzzey';
const NEW_DATE = '2026-04-23';
const NEW_TIME = '15:00:00';
const NEW_CALENDAR_NAME = 'Request your Neuropathy Consultation at North Knoxville';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: original, error: originalError } = await supabase
      .from('all_appointments')
      .select('*')
      .eq('id', ORIGINAL_APPOINTMENT_ID)
      .single();
    if (originalError || !original) throw originalError ?? new Error('Original not found');

    const { data: existing } = await supabase
      .from('all_appointments')
      .select('id, status, date_of_appointment')
      .eq('ghl_appointment_id', NEW_GHL_APPOINTMENT_ID)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ok: true, alreadyExists: true, existing }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('all_appointments')
      .insert({
        lead_name: original.lead_name,
        lead_phone_number: original.lead_phone_number,
        lead_email: original.lead_email,
        project_name: original.project_name,
        ghl_id: original.ghl_id,
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
    if (insertError || !inserted) throw insertError ?? new Error('Insert failed');

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

    return new Response(JSON.stringify({
      ok: true,
      inserted,
      noteError: noteError?.message ?? null,
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
