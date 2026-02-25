import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-04-15'
const CONVERSATIONS_PER_BATCH = 20 // Process 20 conversations per invocation to stay within timeout
const RATE_LIMIT_DELAY_MS = 400

interface GHLConversation {
  id: string
  contactId?: string
  fullName?: string
  contactName?: string
  phone?: string
  lastMessageDate?: string
}

interface GHLMessage {
  id: string
  type?: number
  direction?: string
  dateAdded?: string
  body?: string
  status?: string
  contentType?: string
  meta?: { callDuration?: number; callStatus?: string; [key: string]: unknown }
}

/**
 * Fetch a batch of conversations (NO lastMessageType filter).
 * Uses cursor-based pagination via startAfterDate.
 */
async function fetchConversationBatch(
  apiKey: string,
  locationId: string,
  cursor?: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<{ conversations: GHLConversation[]; nextCursor: string | null }> {
  const all: GHLConversation[] = []
  let lastCursor = cursor || undefined
  let isFirstPage = !cursor

  for (let page = 0; page < Math.ceil(CONVERSATIONS_PER_BATCH / 50); page++) {
    const params = new URLSearchParams({ locationId, limit: '50' })

    if (isFirstPage && page === 0) {
      // First ever page: use date range filter
      if (dateFrom) params.set('startAfterDate', String(new Date(dateFrom).getTime()))
      if (dateTo) params.set('endAfterDate', String(new Date(dateTo).getTime()))
      isFirstPage = false
    } else if (lastCursor) {
      params.set('startAfterDate', lastCursor)
      if (dateTo) params.set('endAfterDate', String(new Date(dateTo).getTime()))
    }

    const res = await fetch(`${GHL_BASE_URL}/conversations/search?${params}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      console.error(`[SYNC] Conv API error ${res.status}: ${await res.text()}`)
      break
    }

    const data = await res.json()
    const convs: GHLConversation[] = data.conversations || []
    if (convs.length === 0) break

    all.push(...convs)
    lastCursor = convs[convs.length - 1].lastMessageDate || undefined

    if (all.length >= CONVERSATIONS_PER_BATCH || convs.length < 50) break
    if (!lastCursor) break

    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS))
  }

  const nextCursor = all.length >= CONVERSATIONS_PER_BATCH && lastCursor ? lastCursor : null

  return { conversations: all.slice(0, CONVERSATIONS_PER_BATCH), nextCursor }
}

async function fetchCallMessages(apiKey: string, conversationId: string): Promise<GHLMessage[]> {
  const calls: GHLMessage[] = []
  let lastMessageId: string | undefined

  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({ limit: '50' })
    if (lastMessageId) params.set('lastMessageId', lastMessageId)

    const url = `${GHL_BASE_URL}/conversations/${conversationId}/messages?${params}`
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) break

    const data = await res.json()
    const msgs: GHLMessage[] = data.messages?.messages || data.messages || []
    if (msgs.length === 0) break

    // Accept call messages via multiple detection methods
    const filtered = msgs.filter(m => {
      const t = m.type
      const ct = String(m.contentType || '').toLowerCase()
      const mt = String((m as any).messageType || '').toLowerCase()
      return t === 5 || t === 'Call' as any || ct.includes('call') || mt.includes('call')
    })

    calls.push(...filtered)
    if (msgs.length < 50 || !data.nextPage) break
    lastMessageId = msgs[msgs.length - 1].id

    await new Promise(r => setTimeout(r, 300))
  }
  return calls
}

function parseDirection(msg: GHLMessage): string {
  const d = String(msg.direction ?? '').toLowerCase().trim()
  return (d === 'inbound' || d === 'incoming' || d === '1') ? 'inbound' : 'outbound'
}

function parseStatus(msg: GHLMessage): string {
  const s = String(msg.meta?.callStatus ?? msg.status ?? '').toLowerCase()
  if (s.includes('missed') || s.includes('no-answer')) return 'missed'
  if (s.includes('voicemail')) return 'voicemail'
  if (s.includes('busy')) return 'busy'
  if (s.includes('failed') || s.includes('cancel')) return 'failed'
  return 'completed'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { projectName, dateFrom, dateTo } = await req.json()

    if (!projectName) {
      return new Response(
        JSON.stringify({ success: false, error: 'projectName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[SYNC] Processing project: ${projectName}, from=${dateFrom}, to=${dateTo}`)

    // Get project credentials
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('project_name, ghl_api_key, ghl_location_id')
      .eq('project_name', projectName)
      .eq('active', true)
      .not('ghl_api_key', 'is', null)
      .not('ghl_location_id', 'is', null)
      .single()

    if (projErr || !project) {
      return new Response(
        JSON.stringify({ success: false, error: `Project not found or missing GHL credentials: ${projectName}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Read cursor from call_sync_cursors table
    let cursorQuery = supabase
      .from('call_sync_cursors')
      .select('*')
      .eq('project_name', projectName)
      .eq('status', 'in_progress')

    if (dateFrom) cursorQuery = cursorQuery.eq('date_from', dateFrom)
    else cursorQuery = cursorQuery.is('date_from', null)

    if (dateTo) cursorQuery = cursorQuery.eq('date_to', dateTo)
    else cursorQuery = cursorQuery.is('date_to', null)

    const { data: existingCursor } = await cursorQuery
      .maybeSingle()

    const cursor = existingCursor?.cursor_value || undefined
    const prevProcessed = existingCursor?.conversations_processed || 0
    const prevSynced = existingCursor?.calls_synced || 0

    console.log(`[SYNC] ${projectName}: cursor=${cursor ? 'resuming' : 'fresh start'}, prevProcessed=${prevProcessed}`)

    // Fetch batch of conversations
    const { conversations, nextCursor } = await fetchConversationBatch(
      project.ghl_api_key, project.ghl_location_id, cursor, dateFrom, dateTo
    )

    console.log(`[SYNC] ${projectName}: fetched ${conversations.length} conversations, hasMore=${!!nextCursor}`)

    // Process conversations: fetch messages and filter for calls
    const records: any[] = []
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i]
      try {
        const messages = await fetchCallMessages(project.ghl_api_key, conv.id)
        if (messages.length > 0) {
          const contactName = conv.fullName || conv.contactName || 'Unknown'
          const phone = conv.phone || ''

          for (const msg of messages) {
            const dt = msg.dateAdded || new Date().toISOString()

            // Filter call messages by date range if provided
            if (dateFrom && new Date(dt) < new Date(dateFrom)) continue
            if (dateTo && new Date(dt) > new Date(dateTo)) continue
            const duration = (msg.meta as any)?.call?.duration ?? msg.meta?.callDuration ?? 0
            records.push({
              ghl_id: msg.id,
              project_name: project.project_name,
              lead_name: contactName,
              lead_phone_number: phone || '0000000000',
              direction: parseDirection(msg),
              call_datetime: dt,
              date: dt.split('T')[0] || new Date().toISOString().split('T')[0],
              duration_seconds: typeof duration === 'number' ? duration : 0,
              status: parseStatus(msg),
              call_summary: msg.body || null,
            })
          }
        }

        if ((i + 1) % 25 === 0) {
          console.log(`[SYNC] ${projectName}: ${i + 1}/${conversations.length} convs, ${records.length} calls`)
        }

        if (i < conversations.length - 1) await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS))
      } catch (e) {
        console.error(`[SYNC] Conv ${conv.id} error:`, e)
      }
    }

    // Upsert records in batches
    let synced = 0
    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50)
      const { error } = await supabase.from('all_calls').upsert(batch, { onConflict: 'ghl_id' })
      if (error) console.error(`[SYNC] Upsert error:`, error)
      else synced += batch.length
    }

    const totalProcessed = prevProcessed + conversations.length
    const totalSynced = prevSynced + synced
    const hasMore = !!nextCursor

    // Update cursor state
    if (hasMore) {
      await supabase.from('call_sync_cursors').upsert({
        project_name: projectName,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        cursor_value: nextCursor,
        conversations_processed: totalProcessed,
        calls_synced: totalSynced,
        status: 'in_progress',
      }, { onConflict: 'project_name,date_from,date_to' })
    } else {
      // Mark complete or delete cursor
      let deleteQuery = supabase.from('call_sync_cursors')
        .delete()
        .eq('project_name', projectName)

      if (dateFrom) deleteQuery = deleteQuery.eq('date_from', dateFrom)
      else deleteQuery = deleteQuery.is('date_from', null)

      if (dateTo) deleteQuery = deleteQuery.eq('date_to', dateTo)
      else deleteQuery = deleteQuery.is('date_to', null)

      await deleteQuery
    }

    console.log(`[SYNC] ${projectName}: batch done. synced=${synced}, totalSynced=${totalSynced}, totalProcessed=${totalProcessed}, hasMore=${hasMore}`)

    return new Response(
      JSON.stringify({
        success: true,
        projectName,
        synced: synced,
        totalSynced,
        totalProcessed,
        conversationsInBatch: conversations.length,
        hasMore,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[SYNC] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
