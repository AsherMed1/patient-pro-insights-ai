import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-04-15'
const MAX_CONVERSATIONS_PER_PROJECT = 100
const RATE_LIMIT_DELAY_MS = 600

interface GHLConversation {
  id: string
  contactId?: string
  fullName?: string
  contactName?: string
  phone?: string
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

async function fetchCallConversations(
  apiKey: string, locationId: string, startAfterDate?: string, endAfterDate?: string,
): Promise<GHLConversation[]> {
  const all: GHLConversation[] = []
  let lastCursor: string | undefined

  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({ locationId, limit: '50', lastMessageType: 'TYPE_CALL' })
    if (page === 0) {
      if (startAfterDate) params.set('startAfterDate', String(new Date(startAfterDate).getTime()))
      if (endAfterDate) params.set('endAfterDate', String(new Date(endAfterDate).getTime()))
    } else if (lastCursor) {
      params.set('startAfterDate', lastCursor)
    }

    const res = await fetch(`${GHL_BASE_URL}/conversations/search?${params}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Version': GHL_API_VERSION, 'Content-Type': 'application/json' },
    })
    if (!res.ok) { console.error(`[SYNC] Conv API error ${res.status}`); break }

    const data = await res.json()
    const convs = data.conversations || []
    if (convs.length === 0) break
    all.push(...convs)
    if (all.length >= MAX_CONVERSATIONS_PER_PROJECT || convs.length < 50) break
    lastCursor = convs[convs.length - 1].lastMessageDate || undefined
    if (!lastCursor) break
  }
  return all.slice(0, MAX_CONVERSATIONS_PER_PROJECT)
}

async function fetchCallMessages(apiKey: string, conversationId: string, debug = false): Promise<GHLMessage[]> {
  const calls: GHLMessage[] = []
  let lastMessageId: string | undefined

  for (let page = 0; page < 3; page++) {
    // Don't filter by type in query — fetch all messages and filter locally
    const params = new URLSearchParams({ limit: '50' })
    if (lastMessageId) params.set('lastMessageId', lastMessageId)

    const url = `${GHL_BASE_URL}/conversations/${conversationId}/messages?${params}`
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Version': GHL_API_VERSION, 'Content-Type': 'application/json' },
    })
    
    if (!res.ok) {
      if (debug) console.error(`[SYNC] Messages API ${res.status} for ${conversationId}`)
      break
    }

    const data = await res.json()
    
    if (debug && page === 0) {
      // Log raw response structure for debugging
      const keys = Object.keys(data)
      console.log(`[SYNC] DEBUG Messages response keys: ${keys.join(', ')}`)
      const rawMsgs = data.messages?.messages || data.messages || []
      if (rawMsgs.length > 0) {
        const sample = rawMsgs[0]
        console.log(`[SYNC] DEBUG First msg: type=${sample.type}, contentType=${sample.contentType}, direction=${sample.direction}, messageType=${sample.messageType}, keys=${Object.keys(sample).join(',')}`)
        console.log(`[SYNC] DEBUG First msg raw:`, JSON.stringify(sample).substring(0, 800))
      } else {
        console.log(`[SYNC] DEBUG No messages in response. Raw:`, JSON.stringify(data).substring(0, 500))
      }
    }

    const msgs: GHLMessage[] = data.messages?.messages || data.messages || []
    if (msgs.length === 0) break

    // Accept call messages via multiple detection methods
    const filtered = msgs.filter(m => {
      const t = m.type
      const ct = String(m.contentType || '').toLowerCase()
      const mt = String((m as any).messageType || '').toLowerCase()
      return t === 5 || t === 'Call' as any || ct.includes('call') || mt.includes('call')
    })
    
    if (debug && page === 0) {
      console.log(`[SYNC] DEBUG Page 0: ${msgs.length} total msgs, ${filtered.length} call msgs`)
      // Show all unique types in this batch
      const types = [...new Set(msgs.map(m => `type=${m.type},ct=${m.contentType},mt=${(m as any).messageType}`))]
      console.log(`[SYNC] DEBUG Message types found: ${types.join(' | ')}`)
    }

    calls.push(...filtered)
    if (msgs.length < 50 || !data.nextPage) break
    lastMessageId = msgs[msgs.length - 1].id
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

async function processProjects(supabase: any, projects: any[], dateFrom: string, dateTo: string) {
  let totalSynced = 0
  const results: Record<string, number> = {}

  for (const project of projects) {
    try {
      console.log(`[SYNC] Processing ${project.project_name}`)
      const conversations = await fetchCallConversations(project.ghl_api_key, project.ghl_location_id, dateFrom, dateTo)
      console.log(`[SYNC] ${project.project_name}: ${conversations.length} conversations`)

      if (conversations.length === 0) { results[project.project_name] = 0; continue }

      const records: any[] = []
      let totalMsgsFetched = 0
      let totalCallsFound = 0

      for (let i = 0; i < conversations.length; i++) {
        const conv = conversations[i]
        try {
          const messages = await fetchCallMessages(project.ghl_api_key, conv.id, i < 3)
          totalCallsFound += messages.length
          
          if (messages.length > 0) {
            if (i < 3) {
              console.log(`[SYNC] Conv ${i}: ${messages.length} calls found, sample id=${messages[0].id}`)
            }

            const contactName = conv.fullName || conv.contactName || 'Unknown'
            const phone = conv.phone || ''

            for (const msg of messages) {
              const dt = msg.dateAdded || new Date().toISOString()
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

          // Log progress every 25 conversations
          if ((i + 1) % 25 === 0) {
            console.log(`[SYNC] Progress: ${i + 1}/${conversations.length} convs, ${records.length} records so far`)
          }

          // Rate limit
          if (i < conversations.length - 1) await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY_MS))
        } catch (e) {
          console.error(`[SYNC] Conv ${i} (${conv.id}) error:`, e)
        }
      }

      console.log(`[SYNC] ${project.project_name}: totalCallsFound=${totalCallsFound}, records=${records.length}`)

      console.log(`[SYNC] ${project.project_name}: ${records.length} individual call records`)

      // Upsert in batches
      let synced = 0
      for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50)
        const { error } = await supabase.from('all_calls').upsert(batch, { onConflict: 'ghl_id' })
        if (error) console.error(`[SYNC] Upsert error:`, error)
        else synced += batch.length
      }

      results[project.project_name] = synced
      totalSynced += synced
      console.log(`[SYNC] ${project.project_name}: synced ${synced} records`)

      if (projects.length > 1) await new Promise(r => setTimeout(r, 1000))
    } catch (e) {
      console.error(`[SYNC] ${project.project_name} error:`, e)
      results[project.project_name] = -1
    }
  }

  console.log(`[SYNC] COMPLETE: ${totalSynced} total records across ${projects.length} projects`)
  return { totalSynced, results }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { dateFrom, dateTo, projectName } = await req.json()
    console.log(`[SYNC] Request: from=${dateFrom} to=${dateTo} project=${projectName || 'ALL'}`)

    let q = supabase.from('projects').select('project_name, ghl_api_key, ghl_location_id')
      .eq('active', true).not('ghl_api_key', 'is', null).not('ghl_location_id', 'is', null)
    if (projectName && projectName !== 'ALL') q = q.eq('project_name', projectName)

    const { data: projects, error } = await q
    if (error) throw error
    if (!projects?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No projects found', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`[SYNC] ${projects.length} projects, starting background processing`)

    // Background processing via waitUntil
    const bgTask = processProjects(supabase, projects, dateFrom, dateTo)
    
    // @ts-ignore - EdgeRuntime.waitUntil is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(bgTask)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processing ${projects.length} projects in background. Check logs for results.`,
        projectCount: projects.length,
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
