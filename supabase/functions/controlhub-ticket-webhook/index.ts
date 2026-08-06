import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const RESOLVED = new Set(['resolved', 'closed', 'complete', 'completed', 'done']);

// Roles that can reach QA Operations — only these can be tagged.
const QA_ROLES = ['admin', 'agent', 'qa_specialist', 'va'];

interface QaUser { id: string; name: string; email: string }

const loadQaUsers = async (supabase: any): Promise<QaUser[]> => {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('role', QA_ROLES);
  const ids = [...new Set((roles || []).map((r: any) => r.user_id))];
  if (ids.length === 0) return [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', ids);
  return (profiles || []).map((p: any) => ({
    id: p.id,
    name: (p.full_name || p.email || '').trim(),
    email: (p.email || '').trim(),
  }));
};

/**
 * Resolve mentions from an explicit payload array and/or "@name" tokens in the
 * comment body, against the QA-role user list. Returns the rewritten note text
 * (with @[Name](uuid) tokens) plus the matched users.
 */
const resolveMentions = (
  body: string,
  payloadMentions: unknown,
  users: QaUser[],
): { text: string; matched: QaUser[] } => {
  const byEmail = new Map<string, QaUser>();
  const byName = new Map<string, QaUser[]>();
  for (const u of users) {
    if (u.email) byEmail.set(u.email.toLowerCase(), u);
    if (u.name) {
      const k = u.name.toLowerCase();
      byName.set(k, [...(byName.get(k) || []), u]);
    }
  }

  const matched = new Map<string, QaUser>();
  const find = (raw: string): QaUser | null => {
    const v = raw.trim().toLowerCase();
    if (!v) return null;
    const e = byEmail.get(v);
    if (e) return e;
    const n = byName.get(v);
    if (n && n.length === 1) return n[0];
    return null;
  };

  if (Array.isArray(payloadMentions)) {
    for (const m of payloadMentions) {
      const cand =
        typeof m === 'string'
          ? m
          : m && typeof m === 'object'
            ? String((m as any).email || (m as any).name || (m as any).full_name || '')
            : '';
      const u = find(cand);
      if (u) matched.set(u.id, u);
    }
  }

  // Longest names first so "@Jane Doe Smith" wins over "@Jane Doe".
  const sorted = [...users].filter((u) => u.name).sort((a, b) => b.name.length - a.name.length);
  let text = body;

  // Email-style mentions: @jane@example.com
  text = text.replace(/@([^\s@]+@[^\s@]+\.[^\s@,;]+)/g, (all, email: string) => {
    const u = find(email);
    if (!u) return all;
    matched.set(u.id, u);
    return `@[${u.name}](${u.id})`;
  });

  for (const u of sorted) {
    const escaped = u.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`@${escaped}\\b`, 'gi');
    if (re.test(text)) {
      matched.set(u.id, u);
      text = text.replace(re, `@[${u.name}](${u.id})`);
    }
  }

  return { text, matched: [...matched.values()] };
};

const normalizeStatus = (s: unknown): string | null => {
  if (typeof s !== 'string' || !s.trim()) return null;
  const v = s.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const map: Record<string, string> = {
    open: 'open',
    new: 'open',
    in_progress: 'in_progress',
    inprogress: 'in_progress',
    working: 'in_progress',
    awaiting_response: 'awaiting_response',
    waiting: 'awaiting_response',
    pending: 'awaiting_response',
    on_hold: 'awaiting_response',
    resolved: 'resolved',
    complete: 'resolved',
    completed: 'resolved',
    done: 'resolved',
    closed: 'closed',
  };
  return map[v] ?? v;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const expected = Deno.env.get('CONTROLHUB_WEBHOOK_SECRET');
    if (!expected) {
      return json({ error: 'Webhook secret not configured' }, 500);
    }
    const provided =
      req.headers.get('x-webhook-secret') ??
      (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (provided !== expected) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const ticketId =
      typeof (payload as any).ticket_id === 'string' ? (payload as any).ticket_id.trim() : '';
    const externalCaseId =
      typeof (payload as any).external_case_id === 'string'
        ? (payload as any).external_case_id.trim()
        : '';

    if (!ticketId && !externalCaseId) {
      return json({ error: 'ticket_id or external_case_id is required' }, 400);
    }

    const rawEventType = typeof (payload as any).event_type === 'string'
      ? (payload as any).event_type.trim().toLowerCase()
      : '';
    const eventType = ['status_change', 'comment', 'assignment'].includes(rawEventType)
      ? rawEventType
      : (normalizeStatus((payload as any).status) ? 'status_change' : 'comment');

    const status = normalizeStatus((payload as any).status);
    const authorName =
      typeof (payload as any).author_name === 'string' && (payload as any).author_name.trim()
        ? (payload as any).author_name.trim().slice(0, 200)
        : null;
    const bodyText =
      typeof (payload as any).comment === 'string' && (payload as any).comment.trim()
        ? (payload as any).comment.trim().slice(0, 5000)
        : typeof (payload as any).body === 'string' && (payload as any).body.trim()
          ? (payload as any).body.trim().slice(0, 5000)
          : null;
    const assignee =
      typeof (payload as any).assignee_name === 'string' && (payload as any).assignee_name.trim()
        ? (payload as any).assignee_name.trim().slice(0, 200)
        : null;
    const ticketUrl =
      typeof (payload as any).ticket_url === 'string' && (payload as any).ticket_url.trim()
        ? (payload as any).ticket_url.trim()
        : null;

    const occurredRaw = (payload as any).occurred_at;
    const occurredAt =
      typeof occurredRaw === 'string' && !Number.isNaN(Date.parse(occurredRaw))
        ? new Date(occurredRaw).toISOString()
        : new Date().toISOString();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let qaCase: any = null;
    if (ticketId) {
      const { data } = await supabase
        .from('qa_cases')
        .select('id, workflow_status, resolution_type, controlhub_ticket_id, date_resolved')
        .eq('controlhub_ticket_id', ticketId)
        .maybeSingle();
      qaCase = data;
    }
    if (!qaCase && externalCaseId) {
      const { data } = await supabase
        .from('qa_cases')
        .select('id, workflow_status, resolution_type, controlhub_ticket_id, date_resolved')
        .eq('id', externalCaseId)
        .maybeSingle();
      qaCase = data;
    }

    if (!qaCase) {
      return json({ error: 'No QA case found for this ticket' }, 404);
    }

    const effectiveTicketId = ticketId || qaCase.controlhub_ticket_id || 'unknown';

    const summary =
      eventType === 'status_change'
        ? `Status changed to ${status ?? 'unknown'}${bodyText ? ` — ${bodyText}` : ''}`
        : eventType === 'assignment'
          ? `Assigned to ${assignee ?? 'unassigned'}`
          : (bodyText ?? 'Ticket updated');

    const { error: eventErr } = await supabase.from('qa_ticket_events').insert({
      case_id: qaCase.id,
      ticket_id: effectiveTicketId,
      event_type: eventType,
      status,
      author_name: authorName,
      body: bodyText,
      occurred_at: occurredAt,
      raw: payload,
    });

    // Duplicate delivery — already recorded, nothing else to do.
    if (eventErr && (eventErr as any).code === '23505') {
      return json({ ok: true, duplicate: true, case_id: qaCase.id });
    }
    if (eventErr) {
      console.error('Failed to insert ticket event:', eventErr.message);
      return json({ error: 'Failed to record event', details: eventErr.message }, 500);
    }

    const updates: Record<string, unknown> = {
      controlhub_ticket_id: effectiveTicketId,
      controlhub_ticket_last_activity: summary.slice(0, 1000),
      controlhub_ticket_last_activity_at: occurredAt,
      controlhub_ticket_unread: true,
    };
    if (status) updates.controlhub_ticket_status = status;
    if (assignee) updates.controlhub_ticket_assignee = assignee;
    if (ticketUrl) updates.controlhub_ticket_url = ticketUrl;

    const isResolved = !!status && RESOLVED.has(status);
    if (isResolved && qaCase.workflow_status !== 'completed') {
      updates.workflow_status = 'completed';
      updates.completed_at = occurredAt;
      updates.date_resolved = occurredAt.slice(0, 10);
      if (!qaCase.resolution_type) updates.resolution_type = 'Resolved by QA';
    }

    const { error: updateErr } = await supabase
      .from('qa_cases')
      .update(updates)
      .eq('id', qaCase.id);

    if (updateErr) {
      console.error('Failed to update QA case:', updateErr.message);
      return json({ error: 'Failed to update case', details: updateErr.message }, 500);
    }

    await supabase.from('qa_case_activity').insert({
      case_id: qaCase.id,
      activity_type: isResolved ? 'ticket_resolved' : 'ticket_update',
      description: isResolved
        ? `ControlHub ticket ${effectiveTicketId} resolved${authorName ? ` by ${authorName}` : ''} — case auto-completed`
        : `ControlHub ticket ${effectiveTicketId}: ${summary}`.slice(0, 1000),
      metadata: {
        ticket_id: effectiveTicketId,
        event_type: eventType,
        status,
        author_name: authorName,
        assignee_name: assignee,
        occurred_at: occurredAt,
      },
    });

    // --- @mentions inside Control Hub comments -> QA note + in-app notification
    let mentionedCount = 0;
    if (bodyText) {
      try {
        const qaUsers = await loadQaUsers(supabase);
        const { text, matched } = resolveMentions(
          bodyText,
          (payload as any).mentions,
          qaUsers,
        );
        if (matched.length > 0) {
          const author = authorName || 'Control Hub';
          const { data: note, error: noteErr } = await supabase
            .from('qa_case_notes')
            .insert({
              case_id: qaCase.id,
              note: `[Control Hub] ${text}`.slice(0, 5000),
              author_name: author,
            })
            .select('id')
            .single();

          if (noteErr || !note) {
            console.error('Failed to insert mention note:', noteErr?.message);
          } else {
            const { error: mErr } = await supabase.from('qa_note_mentions').insert(
              matched.map((u) => ({
                note_id: note.id,
                case_id: qaCase.id,
                mentioned_user_id: u.id,
                mentioned_by_user_id: null,
                mentioned_by_name: author,
              })),
            );
            if (mErr) console.error('Failed to insert mentions:', mErr.message);
            else mentionedCount = matched.length;

            await supabase.from('qa_case_activity').insert(
              matched.map((u) => ({
                case_id: qaCase.id,
                activity_type: 'mention',
                description: `Mentioned ${u.name} in a Control Hub ticket comment`,
                metadata: {
                  ticket_id: effectiveTicketId,
                  source: 'controlhub',
                  mentioned_user_id: u.id,
                  author_name: author,
                },
              })),
            );
          }
        }
      } catch (mentionErr) {
        console.error('Mention processing failed:', mentionErr);
      }
    }

    return json({
      ok: true,
      case_id: qaCase.id,
      status: status ?? null,
      resolved: isResolved,
      mentioned: mentionedCount,
    });
  } catch (err) {
    console.error('controlhub-ticket-webhook error:', err);
    return json(
      { error: 'Internal error', details: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});
