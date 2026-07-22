import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  appointment_id: string;
  new_name: string;
  user_name?: string | null;
}

const SUFFIX_TOKENS = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v']);

function splitName(full: string): { firstName: string; lastName: string } {
  const clean = full.trim().replace(/\s+/g, ' ');
  if (!clean) return { firstName: '', lastName: '' };
  const parts = clean.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  // If the trailing token is a suffix, keep it attached to the last name
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as Body;
    const { appointment_id, new_name, user_name } = body;

    if (!appointment_id || !new_name || !new_name.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'appointment_id and new_name are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmedName = new_name.trim();

    // Load appointment
    const { data: appt, error: apptErr } = await supabase
      .from('all_appointments')
      .select('id, lead_name, ghl_id, project_name, parsed_contact_info')
      .eq('id', appointment_id)
      .single();

    if (apptErr || !appt) {
      return new Response(JSON.stringify({ success: false, error: 'Appointment not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const previousName = appt.lead_name || '';
    if (previousName.trim() === trimmedName) {
      return new Response(JSON.stringify({ success: true, changed: false, message: 'No change' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Push to GHL first, only if we have a linked contact
    let ghlPushed = false;
    let ghlSkippedReason: string | null = null;

    if (appt.ghl_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('ghl_api_key')
        .eq('project_name', appt.project_name)
        .single();

      if (!project?.ghl_api_key) {
        ghlSkippedReason = 'project_missing_ghl_api_key';
      } else {
        const { firstName, lastName } = splitName(trimmedName);
        const ghlRes = await fetch(`https://services.leadconnectorhq.com/contacts/${appt.ghl_id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${project.ghl_api_key}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ firstName, lastName, name: trimmedName }),
        });

        if (!ghlRes.ok) {
          const errText = await ghlRes.text();
          console.error('[update-ghl-contact-name] GHL PATCH failed', ghlRes.status, errText);
          return new Response(JSON.stringify({
            success: false,
            error: 'GHL update failed',
            status: ghlRes.status,
            details: errText,
          }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        ghlPushed = true;
      }
    } else {
      ghlSkippedReason = 'no_ghl_id';
    }

    // Only after GHL confirms (or we intentionally skipped), update DB rows
    const nowIso = new Date().toISOString();
    const existingParsedContact = (appt.parsed_contact_info && typeof appt.parsed_contact_info === 'object')
      ? appt.parsed_contact_info as Record<string, any>
      : {};
    const mergedParsedContact = { ...existingParsedContact, name: trimmedName };

    // Update this appointment
    const { error: updErr } = await supabase
      .from('all_appointments')
      .update({
        lead_name: trimmedName,
        parsed_contact_info: mergedParsedContact,
        name_last_synced_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', appointment_id);

    if (updErr) {
      return new Response(JSON.stringify({ success: false, error: updErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update sibling rows sharing the same ghl_id (same patient, other appointments)
    let siblingsUpdated = 0;
    if (appt.ghl_id) {
      const { data: siblings } = await supabase
        .from('all_appointments')
        .select('id, parsed_contact_info')
        .eq('ghl_id', appt.ghl_id)
        .neq('id', appointment_id);

      if (siblings && siblings.length > 0) {
        for (const sib of siblings) {
          const sibParsed = (sib.parsed_contact_info && typeof sib.parsed_contact_info === 'object')
            ? sib.parsed_contact_info as Record<string, any>
            : {};
          await supabase
            .from('all_appointments')
            .update({
              lead_name: trimmedName,
              parsed_contact_info: { ...sibParsed, name: trimmedName },
              name_last_synced_at: nowIso,
              updated_at: nowIso,
            })
            .eq('id', sib.id);
          siblingsUpdated++;
        }
      }
    }

    // Audit note
    const actor = user_name && user_name.trim() ? user_name.trim() : 'System';
    await supabase.from('appointment_notes').insert({
      appointment_id,
      note_text: `Name changed from "${previousName}" to "${trimmedName}" by ${actor}`,
      created_by: actor,
    });

    // Sync patient_name into qa_cases (snapshot column) so QA Operations reflects the change
    let qaCasesUpdated = 0;
    const { data: qaByAppt } = await supabase
      .from('qa_cases')
      .update({ patient_name: trimmedName })
      .eq('appointment_id', appointment_id)
      .select('id');
    qaCasesUpdated += qaByAppt?.length || 0;

    if (appt.ghl_id) {
      const { data: qaByGhl } = await supabase
        .from('qa_cases')
        .update({ patient_name: trimmedName })
        .eq('ghl_contact_id', appt.ghl_id)
        .select('id');
      qaCasesUpdated += qaByGhl?.length || 0;
    }

    return new Response(JSON.stringify({
      success: true,
      changed: true,
      ghl_pushed: ghlPushed,
      ghl_skipped_reason: ghlSkippedReason,
      siblings_updated: siblingsUpdated,
      qa_cases_updated: qaCasesUpdated,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });


  } catch (err) {
    console.error('[update-ghl-contact-name] Error:', err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
