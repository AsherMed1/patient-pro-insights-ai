import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { case_id } = await req.json();
    if (!case_id || typeof case_id !== 'string') {
      return new Response(JSON.stringify({ error: 'case_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: qaCase, error: caseErr } = await supabase
      .from('qa_cases')
      .select('*')
      .eq('id', case_id)
      .maybeSingle();

    if (caseErr || !qaCase) {
      return new Response(JSON.stringify({ error: 'Case not found', details: caseErr?.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const controlhubApiKey = Deno.env.get('CONTROLHUB_API_KEY');
    const controlhubBaseUrl = Deno.env.get('CONTROLHUB_BASE_URL');

    let ticketId: string;
    let ticketUrl: string | null = null;
    let ticketStatus = 'open';
    let stub = true;

    if (controlhubApiKey && controlhubBaseUrl) {
      // Real ControlHub integration — call receive-external-ticket on the ControlHub project.
      const resp = await fetch(`${controlhubBaseUrl}/functions/v1/receive-external-ticket`, {
        method: 'POST',
        headers: {
          'x-api-key': controlhubApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'patientpro_qa_queue',
          external_case_id: case_id,
          task_name: `QA: ${qaCase.alert_type} — ${qaCase.patient_name || 'Unknown'}`,
          client_name: qaCase.project_name,
          service_involved: qaCase.service_line || null,
          issue_type: 'qa-operations',
          description: [
            `QA Alert: ${qaCase.alert_type}`,
            `Patient: ${qaCase.patient_name || 'Unknown'}`,
            `Project: ${qaCase.project_name}`,
            `Service line: ${qaCase.service_line || 'n/a'}`,
            `Appointment status: ${qaCase.appointment_status || 'n/a'}`,
            qaCase.appointment_id ? `Appointment ID: ${qaCase.appointment_id}` : null,
          ].filter(Boolean).join('\n'),
          submitted_by: 'PatientPro QA Queue',
          priority: 'medium',
          metadata: {
            qa_case_id: case_id,
            project: qaCase.project_name,
            alert_type: qaCase.alert_type,
            appointment_id: qaCase.appointment_id,
            ghl_contact_id: qaCase.ghl_contact_id,
          },
        }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        return new Response(
          JSON.stringify({ error: 'ControlHub request failed', status: resp.status, details: body }),
          { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const payload = await resp.json();
      ticketId = String(payload.ticket_id ?? payload.id ?? `CH-${Date.now()}`);
      ticketUrl = payload.ticket_url ?? null;
      ticketStatus = payload.status ?? 'open';
      stub = false;
    } else {
      // Stub mode — records intent; real API can be enabled by setting secrets.
      ticketId = `STUB-${Date.now()}`;
      ticketUrl = null;
    }

    const { error: updateErr } = await supabase
      .from('qa_cases')
      .update({
        controlhub_ticket_id: ticketId,
        controlhub_ticket_url: ticketUrl,
        controlhub_ticket_status: ticketStatus,
      })
      .eq('id', case_id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: 'Failed to save ticket', details: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('qa_case_activity').insert({
      case_id,
      activity_type: 'ticket_created',
      description: `ControlHub ticket ${ticketId} created`,
      metadata: { ticket_id: ticketId, ticket_url: ticketUrl, stub },
    });

    return new Response(
      JSON.stringify({ ticket_id: ticketId, ticket_url: ticketUrl, stub }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
