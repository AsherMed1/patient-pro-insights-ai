import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TERMINAL = new Set([
  'cancelled', 'canceled', 'no show', 'noshow', 'no-show',
  'showed', 'won', 'oon', 'do not call', 'donotcall', 'rescheduled', 'welcome call',
])

type Row = {
  id: string
  project_name: string
  lead_name: string | null
  ghl_id: string | null
  ghl_appointment_id: string | null
  date_of_appointment: string | null
  requested_time: string | null
  status: string | null
  review_status: string | null
  created_at: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Pull active, non-reserved rows in pages (default row cap is 1000).
    const rows: Row[] = []
    const pageSize = 1000
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from('all_appointments')
        .select('id, project_name, lead_name, ghl_id, ghl_appointment_id, date_of_appointment, requested_time, status, review_status, created_at')
        .eq('is_superseded', false)
        .eq('is_reserved_block', false)
        .order('created_at', { ascending: true })
        .range(from, from + pageSize - 1)

      if (error) throw error
      rows.push(...((data || []) as Row[]))
      if (!data || data.length < pageSize) break
    }

    const active = rows.filter((r) => {
      const s = (r.status || '').toLowerCase().trim()
      const rs = (r.review_status || '').toLowerCase().trim()
      return !TERMINAL.has(s) && !['declined', 'dismissed', 'oon'].includes(rs)
    })

    const group = (key: (r: Row) => string | null) => {
      const map = new Map<string, Row[]>()
      for (const r of active) {
        const k = key(r)
        if (!k) continue
        const list = map.get(k) || []
        list.push(r)
        map.set(k, list)
      }
      return [...map.entries()]
        .filter(([, list]) => list.length > 1)
        .map(([k, list]) => ({
          key: k,
          project_name: list[0].project_name,
          lead_name: list[0].lead_name,
          count: list.length,
          rows: list.map((r) => ({
            id: r.id,
            date_of_appointment: r.date_of_appointment,
            requested_time: r.requested_time,
            status: r.status,
            review_status: r.review_status,
            ghl_appointment_id: r.ghl_appointment_id,
            created_at: r.created_at,
          })),
        }))
    }

    const sameEvent = group((r) => (r.ghl_appointment_id ? `${r.project_name}|${r.ghl_appointment_id}` : null))
    const sameContact = group((r) => (r.ghl_id ? `${r.project_name}|${r.ghl_id}` : null))

    const report = {
      generated_at: new Date().toISOString(),
      active_rows_scanned: active.length,
      duplicate_same_ghl_event: sameEvent,
      duplicate_same_contact: sameContact,
      total_flagged: sameEvent.length + sameContact.length,
    }

    console.log(`[dedupe-scan] ${report.total_flagged} duplicate group(s) across ${active.length} active rows`)

    return new Response(JSON.stringify(report, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[dedupe-scan] failed:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
