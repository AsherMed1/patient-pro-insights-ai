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

    if (controlhubApiKey && controlhubBaseUrl) {
      // Real API integration
      const resp = await fetch(`${controlhubBaseUrl}/api/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${controlhubApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `QA: ${qaCase.alert_type} — ${qaCase.patient_name || 'Unknown'}`,
          description: `Project: ${qaCase.project_name}\nService: ${qaCase.service_line || 'n/a'}\nAppt status: ${qaCase.appointment_status || 'n/a'}\nAlert: ${qaCase.alert_type}`,
          source: 'patientpro_qa_queue',
          metadata: { qa_case_id: case_id, project: qaCase.project_name },
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
      ticketId = String(payload.id ?? payload.ticket_id ?? `CH-${Date.now()}`);
      ticketUrl = payload.url ?? `${controlhubBaseUrl}/tickets/${ticketId}`;
      ticketStatus = payload.status ?? 'open';
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
      metadata: { ticket_id: ticketId, ticket_url: ticketUrl, stub: !controlhubApiKey },
    });

    return new Response(
      JSON.stringify({ ticket_id: ticketId, ticket_url: ticketUrl, stub: !controlhubApiKey }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
