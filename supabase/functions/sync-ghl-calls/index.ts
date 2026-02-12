import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const GHL_BASE_URL = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

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

async function fetchGHLConversations(
  apiKey: string,
  locationId: string,
  startAfterDate?: string,
  endAfterDate?: string,
  limit = 50
): Promise<GHLConversation[]> {
  const allConversations: GHLConversation[] = []
  let startAfterId: string | undefined

  // Paginate through results
  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams({
      locationId,
      limit: String(limit),
    })
    if (startAfterDate) params.set('startAfterDate', startAfterDate)
    if (endAfterDate) params.set('endAfterDate', endAfterDate)
    if (startAfterId) params.set('startAfterId', startAfterId)

    const url = `${GHL_BASE_URL}/conversations/search?${params.toString()}`
    console.log(`[SYNC-GHL-CALLS] Fetching: ${url}`)

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

    if (data.conversations.length < limit) break
    startAfterId = data.conversations[data.conversations.length - 1].id
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

    // Get projects with GHL credentials
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

    let totalSynced = 0
    const projectResults: Record<string, number> = {}

    for (const project of projects) {
      try {
        console.log(`[SYNC-GHL-CALLS] Processing project: ${project.project_name}`)

        const conversations = await fetchGHLConversations(
          project.ghl_api_key,
          project.ghl_location_id,
          dateFrom,
          dateTo
        )

        console.log(`[SYNC-GHL-CALLS] Found ${conversations.length} conversations for ${project.project_name}`)

        if (conversations.length === 0) {
          projectResults[project.project_name] = 0
          continue
        }

        // Map conversations to all_calls records
        const callRecords = conversations.map(conv => {
          const contactName = conv.fullName || conv.contactName || 'Unknown'
          const phone = conv.phone || ''
          const direction = (conv.lastMessageDirection || 'outbound').toLowerCase().includes('inbound')
            ? 'inbound'
            : 'outbound'
          const callDatetime = conv.lastMessageDate || new Date().toISOString()
          const dateOnly = callDatetime.split('T')[0] || new Date().toISOString().split('T')[0]

          return {
            ghl_id: conv.contactId || conv.id,
            project_name: project.project_name,
            lead_name: contactName,
            lead_phone_number: phone || '0000000000',
            direction,
            call_datetime: callDatetime,
            date: dateOnly,
            duration_seconds: 0, // Not available from conversations API
            status: 'completed',
            call_summary: conv.lastMessageBody || null,
          }
        })

        // Upsert in batches
        const batchSize = 50
        let projectSynced = 0

        for (let i = 0; i < callRecords.length; i += batchSize) {
          const batch = callRecords.slice(i, i + batchSize)
          const { error: upsertError, data: upsertData } = await supabase
            .from('all_calls')
            .upsert(batch, { onConflict: 'ghl_id', ignoreDuplicates: true })

          if (upsertError) {
            console.error(`[SYNC-GHL-CALLS] Upsert error for ${project.project_name}:`, upsertError)
          } else {
            projectSynced += batch.length
          }
        }

        projectResults[project.project_name] = projectSynced
        totalSynced += projectSynced
        console.log(`[SYNC-GHL-CALLS] Synced ${projectSynced} records for ${project.project_name}`)

        // Rate limit: wait between projects
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
