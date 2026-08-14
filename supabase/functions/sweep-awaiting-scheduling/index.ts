import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Projects whose GHL contacts carry scheduling-state tags. Add more clinics here.
const SCHEDULING_TAG_PROJECTS = ['Prospero Vascular and Interventional'];

const AWAITING_TAG = 'awaiting-scheduling';
const TAG_48H = 'awaiting-scheduling-48h';
const LEGACY_TAG_24H = 'awaiting-scheduling-24h';
const TAG_72H = 'awaiting-scheduling-72h';
const SCHEDULED_TAG = 'appointment-scheduled';

const TERMINAL = ['cancelled', 'canceled', 'no show', 'noshow', 'oon', 'do not call', 'donotcall'];

function calculateBusinessHours(start: Date, end: Date): number {
  if (end.getTime() <= start.getTime()) return 0;
  let total = 0;
  const cursor = new Date(start.getTime());
  const HOUR = 3600000;
  while (cursor.getTime() < end.getTime()) {
    const nextHour = Math.min(cursor.getTime() + HOUR, end.getTime());
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) total += (nextHour - cursor.getTime()) / HOUR;
    cursor.setTime(nextHour);
  }
  return total;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const now = new Date();

    const { data: projects } = await supabase
      .from('projects')
      .select('project_name, ghl_api_key')
      .in('project_name', SCHEDULING_TAG_PROJECTS);
    const keyFor: Record<string, string | undefined> = {};
    (projects || []).forEach((p: any) => { keyFor[p.project_name] = p.ghl_api_key || undefined; });

    const { data: rows, error } = await supabase
      .from('all_appointments')
      .select('id, lead_name, project_name, status, ghl_id, created_at, date_of_appointment, is_unscheduled')
      .in('project_name', SCHEDULING_TAG_PROJECTS)
      .not('ghl_id', 'is', null)
      .or('is_reserved_block.is.null,is_reserved_block.eq.false')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const pushTags = (row: any, tags: string[], action: 'add' | 'remove') =>
      supabase.functions
        .invoke('update-ghl-contact-tags', {
          body: {
            ghl_contact_id: row.ghl_id,
            ghl_api_key: keyFor[row.project_name],
            tags,
            action,
            source: 'sweep-awaiting-scheduling',
          },
        })
        .catch((e: unknown) => console.error('[sweep-awaiting-scheduling] tag call failed:', e));

    let aged = 0;
    let cleaned = 0;

    for (const row of rows || []) {
      const status = String(row.status || '').toLowerCase().trim();
      const isTerminal = TERMINAL.some((t) => status.includes(t));
      const awaiting = !isTerminal && row.is_unscheduled === true && !row.date_of_appointment;

      if (!awaiting) {
        // Self-heal: scheduled or dropped out — clear the waiting tags.
        await pushTags(row, [AWAITING_TAG, TAG_24H, TAG_72H], 'remove');
        if (!isTerminal && row.date_of_appointment) await pushTags(row, [SCHEDULED_TAG], 'add');
        cleaned++;
        continue;
      }

      const hours = calculateBusinessHours(new Date(row.created_at), now);
      const tags: string[] = [];
      if (hours >= 24) tags.push(TAG_24H);
      if (hours >= 72) tags.push(TAG_72H);
      if (tags.length === 0) continue;

      console.log(`[sweep-awaiting-scheduling] ${row.lead_name} waiting ${hours.toFixed(1)} business hours → ${tags.join(', ')}`);
      await pushTags(row, [AWAITING_TAG, ...tags], 'add');
      aged++;
    }

    return new Response(JSON.stringify({ scanned: rows?.length || 0, aged, cleaned }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[sweep-awaiting-scheduling] error', e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
