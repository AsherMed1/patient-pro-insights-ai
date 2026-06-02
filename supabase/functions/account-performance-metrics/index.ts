import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Body { start: string; end: string }

interface ProjectRow {
  project_name: string
  ghl_api_key: string | null
  ghl_location_id: string | null
}

interface ResultRow {
  project_name: string
  leads_count: number
  bookings_count: number
  leads_source: 'ghl' | 'missing_credentials' | 'error'
  leads_error?: string
}

async function fetchGhlLeadsCount(
  apiKey: string,
  locationId: string,
  startISO: string,
  endISO: string,
  projectName: string,
): Promise<{ total: number; error?: string }> {
  try {
    const body = {
      locationId,
      pageLimit: 1,
      page: 1,
      filters: [
        {
          field: 'dateAdded',
          operator: 'between',
          value: [startISO, endISO],
        },
      ],
    }
    const res = await fetch('https://services.leadconnectorhq.com/contacts/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    const txt = await res.text()
    if (!res.ok) {
      console.error(`[GHL ${projectName}] HTTP ${res.status}:`, txt.slice(0, 400))
      return { total: 0, error: `HTTP ${res.status}: ${txt.slice(0, 200)}` }
    }
    let data: any = {}
    try { data = JSON.parse(txt) } catch {}
    const total = data?.total ?? data?.meta?.total ?? data?.contacts?.length ?? 0
    console.log(`[GHL ${projectName}] keys=${Object.keys(data).join(',')} total=${total}`)
    return { total: Number(total) || 0 }
  } catch (e) {
    console.error(`[GHL ${projectName}] exception:`, (e as Error).message)
    return { total: 0, error: (e as Error).message }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = claimsData.claims.sub as string

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: isAdmin } = await admin.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json()) as Body
    if (!body?.start || !body?.end) {
      return new Response(JSON.stringify({ error: 'start and end required (YYYY-MM-DD)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const startISO = `${body.start}T00:00:00.000Z`
    const endISO = `${body.end}T23:59:59.999Z`

    const { data: projects, error: pErr } = await admin
      .from('projects')
      .select('project_name, ghl_api_key, ghl_location_id')
      .eq('active', true)
      .neq('project_name', 'PPM - Test Account')
      .order('project_name')

    if (pErr) throw pErr

    // Pull bookings (confirmed, approved, not superseded/reserved) in batch
    const { data: appts, error: aErr } = await admin
      .from('all_appointments')
      .select('project_name')
      .ilike('status', 'confirmed')
      .eq('review_status', 'approved')
      .eq('is_reserved_block', false)
      .or('is_superseded.is.null,is_superseded.eq.false')
      .gte('date_of_appointment', body.start)
      .lte('date_of_appointment', body.end)
      .neq('project_name', 'PPM - Test Account')
      .limit(50000)

    if (aErr) throw aErr

    const bookingCounts = new Map<string, number>()
    for (const a of appts || []) {
      if (!a.project_name) continue
      bookingCounts.set(a.project_name, (bookingCounts.get(a.project_name) || 0) + 1)
    }

    // Fetch leads from GHL per project — parallel with concurrency cap
    const results: ResultRow[] = []
    const concurrency = 5
    const queue = [...((projects as ProjectRow[]) || [])]

    async function worker() {
      while (queue.length) {
        const p = queue.shift()
        if (!p) break
        const bookings = bookingCounts.get(p.project_name) || 0
        if (!p.ghl_api_key || !p.ghl_location_id) {
          results.push({
            project_name: p.project_name,
            leads_count: 0,
            bookings_count: bookings,
            leads_source: 'missing_credentials',
          })
          continue
        }
        const { total, error } = await fetchGhlLeadsCount(
          p.ghl_api_key,
          p.ghl_location_id,
          startISO,
          endISO,
          p.project_name,
        )
        results.push({
          project_name: p.project_name,
          leads_count: total,
          bookings_count: bookings,
          leads_source: error ? 'error' : 'ghl',
          leads_error: error,
        })
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))

    results.sort((a, b) => a.project_name.localeCompare(b.project_name))

    return new Response(JSON.stringify({ rows: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('account-performance-metrics error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
