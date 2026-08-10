import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mentions are stored as @[Full Name](uuid) tokens; ControlHub wants plain "@Full Name".
const stripMentionTokens = (text: string) =>
  text.replace(/@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)/g, '@$1');

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const reqId = crypto.randomUUID().slice(0, 8);
  const log = (msg: string) => console.log(`[POST-CH ${reqId}] ${msg}`);

  try {
    log('request received');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (claimsErr || !claimsData?.claims) {
      log(`auth failed: ${claimsErr?.message ?? 'no claims'}`);
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = claimsData.claims.sub as string;
    log(`auth resolved user=${userId}`);


    const payload = await req.json().catch(() => ({}));
    const caseId = typeof payload?.case_id === 'string' ? payload.case_id.trim() : '';
    const bodyText = typeof payload?.body === 'string' ? payload.body.trim() : '';
    const authorName =
      typeof payload?.author_name === 'string' && payload.author_name.trim()
        ? payload.author_name.trim().slice(0, 200)
        : 'PatientPro QA';
    const authorEmail =
      typeof payload?.author_email === 'string' && payload.author_email.trim()
        ? payload.author_email.trim().slice(0, 200)
        : null;
    const mentions: { id?: string; name?: string }[] = Array.isArray(payload?.mentions)
      ? payload.mentions
          .filter((m: any) => m && typeof m === 'object')
          .map((m: any) => ({
            id: typeof m.id === 'string' ? m.id : undefined,
            name: typeof m.name === 'string' ? m.name.slice(0, 200) : undefined,
          }))
      : [];

    if (!caseId) return json({ error: 'case_id is required' }, 400);
    if (!bodyText) return json({ error: 'body is required' }, 400);
    if (bodyText.length > 5000) return json({ error: 'body is too long (max 5000 chars)' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: qaCase, error: caseErr } = await supabase
      .from('qa_cases')
      .select('id, patient_name, project_name, controlhub_ticket_id, controlhub_ticket_url, assigned_qs_user_id, escalation_owner_user_id, escalated_by_user_id')
      .eq('id', caseId)
      .maybeSingle();

    if (caseErr || !qaCase) {
      log(`case lookup failed: ${caseErr?.message ?? 'not found'}`);
      return json({ error: 'Case not found', details: caseErr?.message }, 404);
    }
    log(`case loaded ${caseId}`);

    const ticketId: string | null = (qaCase as any).controlhub_ticket_id ?? null;
    if (!ticketId) return json({ error: 'This case has no linked ControlHub ticket' }, 400);
    if (ticketId.startsWith('STUB-')) {
      return json(
        { error: 'This ticket was created before ControlHub was connected, so replies cannot be delivered.' },
        400,
      );
    }

    const controlhubApiKey = Deno.env.get('CONTROLHUB_API_KEY');
    const rawBaseUrl = Deno.env.get('CONTROLHUB_BASE_URL');
    if (!controlhubApiKey || !rawBaseUrl) {
      log('ControlHub not configured');
      return json({ error: 'ControlHub is not configured (missing API key or base URL).' }, 503);
    }
    const controlhubBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');

    const occurredAt = new Date().toISOString();
    const outboundBody = stripMentionTokens(bodyText);
    const targetUrl = `${controlhubBaseUrl}/functions/v1/receive-external-comment`;

    let resp: Response;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      log(`ControlHub request started -> ${targetUrl} ticket=${ticketId}`);
      resp = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'x-api-key': controlhubApiKey, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          source: 'patientpro_qa_queue',
          ticket_id: ticketId,
          external_case_id: caseId,
          body: outboundBody,
          author_name: authorName,
          author_email: authorEmail,
          mentions: mentions.map((m) => ({ name: m.name ?? null })).filter((m) => m.name),
          occurred_at: occurredAt,
        }),
      });
      log(`ControlHub responded ${resp.status}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[POST-CH ${reqId}] ControlHub request failed: ${msg}`);
      return json(
        {
          error: msg.includes('abort')
            ? "ControlHub didn't respond in time. Please try again."
            : "Couldn't reach ControlHub. Please try again.",
          details: msg,
        },
        502,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!resp.ok) {
      const detail = await resp.text();
      console.error(`[POST-CH ${reqId}] ControlHub comment failed [${resp.status}]: ${detail}`);
      return json(
        { error: 'ControlHub rejected the comment', status: resp.status, details: detail },
        resp.status,
      );
    }


    const { error: eventErr } = await supabase.from('qa_ticket_events').insert({
      case_id: caseId,
      ticket_id: ticketId,
      event_type: 'comment',
      status: null,
      author_name: authorName,
      body: bodyText,
      occurred_at: occurredAt,
      direction: 'outbound',
      raw: { source: 'patientpro_qa_queue', author_email: authorEmail, user_id: userId },
    } as any);
    if (eventErr) console.error('Failed to record outbound ticket comment:', eventErr.message);

    await supabase
      .from('qa_cases')
      .update({
        controlhub_ticket_last_activity: `${authorName}: ${outboundBody}`.slice(0, 1000),
        controlhub_ticket_last_activity_at: occurredAt,
      })
      .eq('id', caseId);

    // Notify tagged portal users (bell feed). Never fail the request on this.
    try {
      const targets = [
        ...new Set(
          mentions
            .map((m) => m.id)
            .filter((id): id is string => !!id && /^[0-9a-fA-F-]{36}$/.test(id) && id !== userId),
        ),
      ];
      if (targets.length > 0) {
        await supabase.from('qa_note_mentions').insert(
          targets.map((uid) => ({
            case_id: caseId,
            kind: 'mention',
            title: `Ticket comment — ${(qaCase as any).patient_name || 'Patient'}${(qaCase as any).project_name ? ` • ${(qaCase as any).project_name}` : ''}`,
            body: bodyText.slice(0, 500),
            mentioned_user_id: uid,
            mentioned_by_user_id: userId,
            mentioned_by_name: authorName,
          })) as any,
        );
      }
    } catch (e) {
      console.error('Mention notification failed:', e instanceof Error ? e.message : String(e));
    }

    await supabase.from('qa_case_activity').insert({
      case_id: caseId,
      activity_type: 'ticket_comment_sent',
      description: `Comment sent to ControlHub ticket ${ticketId}`,
      actor_user_id: userId,
      metadata: { ticket_id: ticketId, body: bodyText.slice(0, 1000) },
    } as any);

    log('DB writes done');
    return json({ ok: true, ticket_id: ticketId, occurred_at: occurredAt });
  } catch (err) {
    console.error(`[POST-CH ${reqId}] unhandled error:`, err instanceof Error ? err.stack : String(err));
    return json(
      { error: 'Internal error', details: err instanceof Error ? err.message : String(err) },
      500,

    );
  }
});
