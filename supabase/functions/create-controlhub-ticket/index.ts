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
    const body = await req.json().catch(() => ({}));
    const {
      case_id,
      task_name,
      client_name,
      service_involved,
      issue_type,
      priority,
      description,
      submitted_by,
      submitted_by_email,
      assignee_name,
      assignee_names,
    } = body ?? {};

    if (!case_id || typeof case_id !== 'string') {
      return new Response(JSON.stringify({ error: 'case_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!task_name || typeof task_name !== 'string' || !task_name.trim()) {
      return new Response(JSON.stringify({ error: 'task_name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!client_name || typeof client_name !== 'string' || !client_name.trim()) {
      return new Response(JSON.stringify({ error: 'client_name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return new Response(JSON.stringify({ error: 'description is required' }), {
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

    const normalizedPriority = ['low', 'medium', 'high', 'urgent'].includes(String(priority))
      ? String(priority)
      : 'medium';
    const normalizedIssueType = (typeof issue_type === 'string' && (issue_type === 'va' || issue_type === 'tech'))
      ? issue_type
      : null;
    if (!normalizedIssueType) {
      return new Response(JSON.stringify({ error: 'issue_type must be "va" or "tech"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const normalizedSubmittedBy = (typeof submitted_by === 'string' && submitted_by.trim())
      ? submitted_by.trim()
      : 'PatientPro QA Queue';
    const normalizedAssignees: string[] = Array.isArray(assignee_names)
      ? assignee_names
          .filter((n: unknown) => typeof n === 'string' && n.trim())
          .map((n: string) => n.trim().slice(0, 200))
      : (typeof assignee_name === 'string' && assignee_name.trim())
        ? [assignee_name.trim().slice(0, 200)]
        : [];
    const normalizedAssignee = normalizedAssignees[0] ?? null;

    let ticketId: string;
    let ticketUrl: string | null = null;
    let ticketStatus = 'open';
    let stub = true;

    if (controlhubApiKey && controlhubBaseUrl) {
      const resp = await fetch(`${controlhubBaseUrl}/functions/v1/receive-external-ticket`, {
        method: 'POST',
        headers: {
          'x-api-key': controlhubApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'patientpro_qa_queue',
          external_case_id: case_id,
          task_name: task_name.trim(),
          client_name: client_name.trim(),
          service_involved: (typeof service_involved === 'string' && service_involved.trim()) ? service_involved.trim() : null,
          issue_type: normalizedIssueType,
          description: description.trim(),
          submitted_by: normalizedSubmittedBy,
          submitted_by_email: (typeof submitted_by_email === 'string' && submitted_by_email.trim())
            ? submitted_by_email.trim()
            : null,
          priority: normalizedPriority,
          assignee_name: normalizedAssignee,
          assignee_names: normalizedAssignees,
          metadata: {
            qa_case_id: case_id,
            project: qaCase.project_name,
            alert_type: qaCase.alert_type,
            appointment_id: qaCase.appointment_id,
            ghl_contact_id: qaCase.ghl_contact_id,
            assignee_name: normalizedAssignee,
            assignees: normalizedAssignees,
          },
        }),
      });
      if (!resp.ok) {
        const bodyText = await resp.text();
        return new Response(
          JSON.stringify({ error: 'ControlHub request failed', status: resp.status, details: bodyText }),
          { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const payload = await resp.json();
      ticketId = String(payload.ticket_id ?? payload.id ?? `CH-${Date.now()}`);
      // Force /admin deep link so the ticket dialog listener on AdminDashboard picks it up.
      // ControlHub's Index page can't render tech tickets for non-admin viewers.
      const returnedUrl: string | null = payload.ticket_url ?? null;
      if (returnedUrl) {
        try {
          const u = new URL(returnedUrl);
          const tid = u.searchParams.get('ticket') ?? ticketId;
          // Always trust our normalizedIssueType over whatever ControlHub returned,
          // so VA tickets deep-link to the VA view even if ControlHub still labels the row as tech.
          ticketUrl = `${u.origin}/admin?ticket=${tid}&type=${normalizedIssueType}`;
        } catch {
          ticketUrl = returnedUrl;
        }
      } else {
        ticketUrl = null;
      }
      ticketStatus = payload.status ?? 'open';
      stub = false;
    } else {
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
      metadata: {
        ticket_id: ticketId,
        ticket_url: ticketUrl,
        stub,
        task_name: task_name.trim(),
        priority: normalizedPriority,
        issue_type: normalizedIssueType,
        submitted_by: normalizedSubmittedBy,
        assignee_name: normalizedAssignee,
      },
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
