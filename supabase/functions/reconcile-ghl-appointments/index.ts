import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.24.2';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_API_VERSION = '2021-04-15';
const MAX_WINDOW_DAYS = 45;

const BodySchema = z.object({
  sweep: z.boolean().optional().default(false),
  project_name: z.string().trim().min(1).max(255).optional(),
  location_id: z.string().trim().min(1).max(100).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dry_run: z.boolean().optional().default(false),
  limit_per_project: z.number().int().min(1).max(500).optional().default(200),
}).refine((v) => v.sweep || v.project_name || v.location_id, {
  message: 'sweep=true, project_name, or location_id is required',
});

type Project = {
  project_name: string;
  ghl_location_id: string;
  ghl_api_key: string;
};

type GhlEvent = Record<string, unknown> & {
  id?: string;
  appointmentId?: string;
  contactId?: string;
  calendarId?: string;
  calendarName?: string;
  startTime?: string;
  endTime?: string;
  appointmentStatus?: string;
  status?: string;
  title?: string;
  dateAdded?: string;
};

// The Review Queue is for confirmed bookings only. Unconfirmed GHL events
// ("new"), terminal events, and status-less events must never be recovered.
const isConfirmedEvent = (event: GhlEvent): boolean =>
  String(event.appointmentStatus ?? event.status ?? '').trim().toLowerCase() === 'confirmed';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const dateToMs = (date: string, end = false) => {
  const parsed = new Date(`${date}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
  return parsed.getTime();
};

const getDefaultWindow = () => {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 2);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 30);
  return {
    startMs: Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
    endMs: Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999),
  };
};

const normalizeFieldValue = (field: Record<string, unknown>) =>
  field.field_value ?? field.value ?? field.fieldValue ?? null;

async function authenticate(
  req: Request,
  body: z.infer<typeof BodySchema>,
  admin: ReturnType<typeof createClient>,
) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const scheduled = body.sweep && req.headers.get('apikey') === anonKey && token === anonKey;

  if (scheduled) return { scheduled: true };
  if (!token) return null;

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: roles } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user.id);
  const allowed = (roles || []).some((entry: { role: string }) =>
    ['admin', 'agent', 'trainer'].includes(entry.role));
  return allowed ? { scheduled: false } : null;
}

async function fetchEvents(project: Project, startMs: number, endMs: number): Promise<GhlEvent[]> {
  const headers = {
    Authorization: `Bearer ${project.ghl_api_key}`,
    Version: GHL_API_VERSION,
    Accept: 'application/json',
  };
  const calendarsResponse = await fetch(
    `${GHL_BASE_URL}/calendars/?locationId=${encodeURIComponent(project.ghl_location_id)}`,
    { headers },
  );
  const calendarsText = await calendarsResponse.text();
  if (!calendarsResponse.ok) {
    throw new Error(`GHL calendars request failed (${calendarsResponse.status}): ${calendarsText.slice(0, 180)}`);
  }
  const calendarsData = calendarsText ? JSON.parse(calendarsText) : {};
  const calendars = (calendarsData?.calendars || []).filter((calendar: Record<string, unknown>) => calendar.id);
  const allEvents: GhlEvent[] = [];

  for (const calendar of calendars) {
    const url = new URL(`${GHL_BASE_URL}/calendars/events`);
    url.searchParams.set('locationId', project.ghl_location_id);
    url.searchParams.set('calendarId', String(calendar.id));
    url.searchParams.set('startTime', String(startMs));
    url.searchParams.set('endTime', String(endMs));
    const response = await fetch(url, { headers });
    const text = await response.text();
    if (!response.ok) {
      console.error(`[RECONCILE] Calendar ${calendar.id} event request failed (${response.status})`);
      continue;
    }
    const data = text ? JSON.parse(text) : {};
    const events = Array.isArray(data?.events) ? data.events : Array.isArray(data?.appointments) ? data.appointments : [];
    allEvents.push(...events.map((event: GhlEvent) => ({
      ...event,
      calendarId: event.calendarId || String(calendar.id),
      calendarName: event.calendarName || String(calendar.name || ''),
    })));
  }
  return Array.from(new Map(allEvents.map((event) => [String(event.id || event.appointmentId), event])).values());
}

async function fetchContact(project: Project, contactId: string) {
  const headers = {
    Authorization: `Bearer ${project.ghl_api_key}`,
    Version: '2021-07-28',
    Accept: 'application/json',
  };

  const [contactResponse, fieldsResponse] = await Promise.all([
    fetch(`${GHL_BASE_URL}/contacts/${contactId}`, { headers }),
    fetch(`${GHL_BASE_URL}/locations/${project.ghl_location_id}/customFields`, { headers }),
  ]);
  const contactText = await contactResponse.text();
  const fieldsText = await fieldsResponse.text();
  if (!contactResponse.ok) {
    throw new Error(`GHL contact request failed (${contactResponse.status}): ${contactText.slice(0, 180)}`);
  }

  const contactData = contactText ? JSON.parse(contactText) : {};
  const fieldsData = fieldsResponse.ok && fieldsText ? JSON.parse(fieldsText) : {};
  const names = new Map<string, string>();
  for (const field of fieldsData?.customFields || []) {
    if (field?.id && (field?.fieldKey || field?.name)) names.set(field.id, field.fieldKey || field.name);
  }

  const contact = contactData?.contact || contactData;
  const customFields = (contact?.customFields || []).map((field: Record<string, unknown>) => ({
    key: names.get(String(field.id || '')) || field.key || field.name || field.id,
    value: normalizeFieldValue(field),
  }));
  return { ...contact, customFields };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const body = parsed.data;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: 'Server configuration is incomplete' }, 500);
    const admin = createClient(supabaseUrl, serviceRoleKey);
    if (!await authenticate(req, body, admin)) return json({ error: 'Unauthorized' }, 401);

    const defaults = getDefaultWindow();
    const startMs = body.start_date ? dateToMs(body.start_date) : defaults.startMs;
    const endMs = body.end_date ? dateToMs(body.end_date, true) : defaults.endMs;
    if (endMs < startMs || endMs - startMs > MAX_WINDOW_DAYS * 86_400_000) {
      return json({ error: `Date window must be ordered and no longer than ${MAX_WINDOW_DAYS} days` }, 400);
    }

    let projectQuery = admin
      .from('projects')
      .select('project_name, ghl_location_id, ghl_api_key')
      .not('ghl_location_id', 'is', null)
      .not('ghl_api_key', 'is', null);
    if (body.project_name) projectQuery = projectQuery.eq('project_name', body.project_name);
    if (body.location_id) projectQuery = projectQuery.eq('ghl_location_id', body.location_id);
    const { data: projectRows, error: projectError } = await projectQuery;
    if (projectError) return json({ error: projectError.message }, 500);
    const projects = (projectRows || []) as Project[];
    if (!projects.length) return json({ error: 'No matching project with GHL credentials' }, 404);

    const summaries: Array<Record<string, unknown>> = [];
    for (const project of projects) {
      const summary: Record<string, unknown> = {
        project_name: project.project_name,
        scanned: 0,
        already_present: 0,
        recovered: 0,
        skipped: 0,
        failed: 0,
      };
      try {
        const events = (await fetchEvents(project, startMs, endMs)).slice(0, body.limit_per_project);
        summary.scanned = events.length;
        const candidates = events.filter((event) => {
          const id = String(event.id || event.appointmentId || '').trim();
          const contactId = String(event.contactId || '').trim();
          const title = String(event.title || '').trim();
          return id && contactId && !/^reserved(?:\s*-|$)/i.test(title);
        });
        summary.skipped = events.length - candidates.length;

        const eventIds = candidates.map((event) => String(event.id || event.appointmentId));
        const existing = new Set<string>();
        for (let index = 0; index < eventIds.length; index += 100) {
          const { data } = await admin
            .from('all_appointments')
            .select('ghl_appointment_id')
            .in('ghl_appointment_id', eventIds.slice(index, index + 100));
          for (const row of data || []) if (row.ghl_appointment_id) existing.add(row.ghl_appointment_id);
        }

        for (const event of candidates) {
          const eventId = String(event.id || event.appointmentId);
          if (existing.has(eventId)) {
            summary.already_present = Number(summary.already_present) + 1;
            continue;
          }
          if (body.dry_run) {
            summary.recovered = Number(summary.recovered) + 1;
            continue;
          }

          try {
            const contact = await fetchContact(project, String(event.contactId));
            const webhookPayload = {
              type: 'AppointmentCreate',
              location: { id: project.ghl_location_id, name: project.project_name },
              appointment: {
                ...event,
                id: eventId,
                appointmentId: eventId,
                contactId: event.contactId,
                contact,
              },
            };
            const ingestResponse = await fetch(`${supabaseUrl}/functions/v1/ghl-webhook-handler`, {
              method: 'POST',
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(webhookPayload),
            });
            const ingestText = await ingestResponse.text();
            if (!ingestResponse.ok) throw new Error(`ingestion failed (${ingestResponse.status}): ${ingestText.slice(0, 180)}`);
            let ingestResult: Record<string, unknown> = {};
            try { ingestResult = ingestText ? JSON.parse(ingestText) : {}; } catch { /* response was still successful */ }
            if (ingestResult.operation === 'skipped') {
              summary.skipped = Number(summary.skipped) + 1;
            } else {
              summary.recovered = Number(summary.recovered) + 1;
              existing.add(eventId);
            }
          } catch (error) {
            summary.failed = Number(summary.failed) + 1;
            console.error(`[RECONCILE] ${project.project_name} event ${eventId}:`, error);
          }
        }
      } catch (error) {
        summary.failed = Number(summary.failed) + 1;
        summary.error = error instanceof Error ? error.message : String(error);
      }
      summaries.push(summary);
    }

    return json({
      ok: summaries.every((entry) => !entry.error),
      dry_run: body.dry_run,
      window: { start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() },
      totals: summaries.reduce((acc, entry) => ({
        scanned: acc.scanned + Number(entry.scanned),
        already_present: acc.already_present + Number(entry.already_present),
        recovered: acc.recovered + Number(entry.recovered),
        skipped: acc.skipped + Number(entry.skipped),
        failed: acc.failed + Number(entry.failed),
      }), { scanned: 0, already_present: 0, recovered: 0, skipped: 0, failed: 0 }),
      projects: summaries,
    });
  } catch (error) {
    console.error('[RECONCILE] Unhandled error:', error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});