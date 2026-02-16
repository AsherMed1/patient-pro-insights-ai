import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-04-15'

interface GHLConversation {
  id: string
  contactId?: string
  locationId?: string
  lastMessageDate?: string
  lastMessageType?: string
  lastMessageBody?: string
  lastMessageDirection?: string
  type?: string
  fullName?: string
  contactName?: string
  phone?: string
  email?: string
}

interface GHLSearchResponse {
  conversations: GHLConversation[]
  total?: number
}

async function fetchGHLCallConversations(
  apiKey: string,
  locationId: string,
  startAfterDate?: string,
  endAfterDate?: string,
  limit = 50
): Promise<GHLConversation[]> {
  const allConversations: GHLConversation[] = []
  let lastCursor: string | undefined

  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      locationId,
      limit: String(limit),
      lastMessageType: 'TYPE_CALL',
    })

    // For the first page, use the provided date filters as Unix timestamps
    if (page === 0) {
      if (startAfterDate) {
        params.set('startAfterDate', String(new Date(startAfterDate).getTime()))
      }
      if (endAfterDate) {
        params.set('endAfterDate', String(new Date(endAfterDate).getTime()))
      }
    } else if (lastCursor) {
      // For subsequent pages, use the last conversation's date as cursor
      params.set('startAfterDate', lastCursor)
    }

    const url = `${GHL_BASE_URL}/conversations/search?${params.toString()}`
    console.log(`[SYNC-GHL-CALLS] Fetching page ${page}: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[SYNC-GHL-CALLS] GHL API error (${response.status}): ${errorText}`)
      break
    }

    const data: GHLSearchResponse = await response.json()
    if (!data.conversations || data.conversations.length === 0) break

    allConversations.push(...data.conversations)
    console.log(`[SYNC-GHL-CALLS] Page ${page}: got ${data.conversations.length} call conversations`)

    if (data.conversations.length < limit) break

    // Use lastMessageDate of the last conversation as pagination cursor
    const lastConv = data.conversations[data.conversations.length - 1]
    lastCursor = lastConv.lastMessageDate || undefined
    if (!lastCursor) break
  }

  return allConversations
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

    console.log(`[SYNC-GHL-CALLS] Syncing calls from=${dateFrom} to=${dateTo} project=${projectName || 'ALL'}`)

    let projectsQuery = supabase
      .from('projects')
      .select('project_name, ghl_api_key, ghl_location_id')
      .eq('active', true)
      .not('ghl_api_key', 'is', null)
      .not('ghl_location_id', 'is', null)

    if (projectName && projectName !== 'ALL') {
      projectsQuery = projectsQuery.eq('project_name', projectName)
    }

    const { data: projects, error: projectsError } = await projectsQuery
    if (projectsError) throw projectsError

    if (!projects || projects.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No projects with GHL credentials found', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[SYNC-GHL-CALLS] Found ${projects.length} projects with GHL credentials`)

    let totalSynced = 0
    const projectResults: Record<string, number> = {}

    for (const project of projects) {
      try {
        const keyPrefix = project.ghl_api_key?.substring(0, 6) || 'N/A'
        console.log(`[SYNC-GHL-CALLS] Processing ${project.project_name} (key prefix: ${keyPrefix}..., location: ${project.ghl_location_id})`)

        const conversations = await fetchGHLCallConversations(
          project.ghl_api_key,
          project.ghl_location_id,
          dateFrom,
          dateTo
        )

        console.log(`[SYNC-GHL-CALLS] Found ${conversations.length} call conversations for ${project.project_name}`)

        if (conversations.length === 0) {
          projectResults[project.project_name] = 0
          continue
        }

        const callRecords = conversations.map(conv => {
          const contactName = conv.fullName || conv.contactName || 'Unknown'
          const phone = conv.phone || ''
        const rawDir = String(conv.lastMessageDirection ?? '').toLowerCase().trim()
        if (conversations.indexOf(conv) === 0) {
          console.log(`[SYNC-GHL-CALLS] DEBUG raw lastMessageDirection for ${project.project_name}:`, JSON.stringify(conv.lastMessageDirection), `=> rawDir="${rawDir}"`)
        }
        const direction = (rawDir === '1' || rawDir.includes('inbound') || rawDir.includes('incoming'))
          ? 'inbound'
          : 'outbound'
          // lastMessageDate can be a Unix timestamp (number) or ISO string
          const rawDate = conv.lastMessageDate
          const callDatetime = typeof rawDate === 'number'
            ? new Date(rawDate).toISOString()
            : (rawDate || new Date().toISOString())
          const dateOnly = callDatetime.split('T')[0] || new Date().toISOString().split('T')[0]

          return {
            ghl_id: conv.contactId || conv.id,
            project_name: project.project_name,
            lead_name: contactName,
            lead_phone_number: phone || '0000000000',
            direction,
            call_datetime: callDatetime,
            date: dateOnly,
            duration_seconds: 0,
            status: 'completed',
            call_summary: conv.lastMessageBody || null,
          }
        })

        const batchSize = 50
        let projectSynced = 0

        for (let i = 0; i < callRecords.length; i += batchSize) {
          const batch = callRecords.slice(i, i + batchSize)
          const { error: upsertError } = await supabase
            .from('all_calls')
            .upsert(batch, { onConflict: 'ghl_id' })

          if (upsertError) {
            console.error(`[SYNC-GHL-CALLS] Upsert error for ${project.project_name}:`, upsertError)
          } else {
            projectSynced += batch.length
          }
        }

        projectResults[project.project_name] = projectSynced
        totalSynced += projectSynced
        console.log(`[SYNC-GHL-CALLS] Synced ${projectSynced} records for ${project.project_name}`)

        if (projects.length > 1) {
          await new Promise(r => setTimeout(r, 1000))
        }
      } catch (projectError) {
        console.error(`[SYNC-GHL-CALLS] Error processing ${project.project_name}:`, projectError)
        projectResults[project.project_name] = -1
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        projects: projectResults,
        message: `Synced ${totalSynced} call records across ${projects.length} projects`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[SYNC-GHL-CALLS] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
