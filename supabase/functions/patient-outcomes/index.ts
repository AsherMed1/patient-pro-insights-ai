import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const TEST_PROJECT = 'PPM - Test Account';

type Row = {
  project_name: string | null;
  date_of_appointment: string | null;
  date_appointment_created: string | null;
  status: string | null;
  procedure_status: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const expected = Deno.env.get('PATIENT_OUTCOMES_SECRET');
  const provided =
    req.headers.get('x-api-key') ??
    (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!expected || provided !== expected) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const basis =
    url.searchParams.get('basis') === 'date_appointment_created'
      ? 'date_appointment_created'
      : 'date_of_appointment';
  const projectName = url.searchParams.get('project_name');
  const groupBy = url.searchParams.get('group_by') ?? 'client_month'; // client_month | client | total

  const isDate = (v: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!isDate(from) || !isDate(to)) {
    return json({ error: 'from and to are required as YYYY-MM-DD' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const rows: Row[] = [];
  const pageSize = 1000;
  for (let page = 0; ; page++) {
    let q = supabase
      .from('all_appointments')
      .select('project_name,date_of_appointment,date_appointment_created,status,procedure_status')
      .neq('project_name', TEST_PROJECT)
      .or('is_reserved_block.is.null,is_reserved_block.eq.false')
      .or('is_superseded.is.null,is_superseded.eq.false')
      .or('review_status.is.null,review_status.eq.approved')
      .gte(basis, from)
      .lte(basis, to)
      .range(page * pageSize, page * pageSize + pageSize - 1);

    if (projectName) q = q.eq('project_name', projectName);

    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < pageSize) break;
  }

  const keyFor = (r: Row) => {
    const client = r.project_name ?? 'Unknown';
    if (groupBy === 'total') return 'ALL';
    if (groupBy === 'client') return client;
    const d = (basis === 'date_of_appointment' ? r.date_of_appointment : r.date_appointment_created) ?? '';
    return `${client}|${d.slice(0, 7)}`;
  };

  const buckets = new Map<string, { project_name: string; month: string | null; booked: number; showed: number; procedures_ordered: number }>();
  for (const r of rows) {
    const k = keyFor(r);
    let b = buckets.get(k);
    if (!b) {
      const [client, month] = k.split('|');
      b = {
        project_name: groupBy === 'total' ? 'ALL CLIENTS' : client,
        month: month ? `${month}-01` : null,
        booked: 0,
        showed: 0,
        procedures_ordered: 0,
      };
      buckets.set(k, b);
    }
    b.booked++;
    if ((r.status ?? '').trim().toLowerCase() === 'showed') b.showed++;
    if (r.procedure_status === 'ordered') b.procedures_ordered++;
  }

  const results = [...buckets.values()]
    .map((b) => ({
      ...b,
      show_rate_pct: b.booked ? Math.round((1000 * b.showed) / b.booked) / 10 : 0,
    }))
    .sort((a, b) =>
      a.project_name.localeCompare(b.project_name) || (a.month ?? '').localeCompare(b.month ?? ''),
    );

  return json({ from, to, basis, group_by: groupBy, row_count: rows.length, results });
});
