
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST to trigger speed-to-lead calculation.' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Starting speed-to-lead calculation...')

    // Get all new leads in batches to handle more than 1000 records
    let allNewLeads = []
    let currentPage = 0
    const pageSize = 1000
    let hasMoreData = true

    while (hasMoreData) {
      const { data: newLeads, error: leadsError } = await supabase
        .from('new_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1)

      if (leadsError) {
        console.error('Error fetching new leads:', leadsError)
        throw leadsError
      }

      if (newLeads && newLeads.length > 0) {
        allNewLeads = allNewLeads.concat(newLeads)
        console.log(`Fetched page ${currentPage + 1}: ${newLeads.length} leads`)
        currentPage++
        hasMoreData = newLeads.length === pageSize
      } else {
        hasMoreData = false
      }
    }

    console.log(`Found ${allNewLeads.length} total new leads to process`)

    // Get all calls for debugging
    const { data: allCalls, error: callsError } = await supabase
      .from('all_calls')
      .select('lead_name, call_datetime')
      .order('call_datetime', { ascending: true })

    if (callsError) {
      console.error('Error fetching calls:', callsError)
    } else {
      console.log(`Found ${allCalls?.length || 0} total calls in database`)
    }

    let processedCount = 0
    let createdCount = 0
    let updatedCount = 0
    let noCallsCount = 0

    // Process each new lead
    for (const lead of allNewLeads || []) {
      try {
        console.log(`Processing lead: ${lead.lead_name}`)

        // Find the first call for this lead - try multiple matching strategies
        let firstCall = null
        
        // Strategy 1: Exact match (case insensitive)
        const { data: exactMatch, error: exactError } = await supabase
          .from('all_calls')
          .select('*')
          .ilike('lead_name', lead.lead_name.trim())
          .order('call_datetime', { ascending: true })
          .limit(1)
          .maybeSingle()

        if (exactError) {
          console.error(`Error finding exact match for ${lead.lead_name}:`, exactError)
        }

        if (exactMatch) {
          firstCall = exactMatch
          console.log(`Found exact match for ${lead.lead_name}`)
        } else {
          // Strategy 2: Try partial matching (first and last name separately)
          const nameParts = lead.lead_name.trim().split(' ')
          if (nameParts.length >= 2) {
            const firstName = nameParts[0]
            const lastName = nameParts[nameParts.length - 1]
            
            const { data: partialMatch, error: partialError } = await supabase
              .from('all_calls')
              .select('*')
              .or(`lead_name.ilike.%${firstName}%,lead_name.ilike.%${lastName}%`)
              .order('call_datetime', { ascending: true })
              .limit(1)
              .maybeSingle()

            if (partialError) {
              console.error(`Error finding partial match for ${lead.lead_name}:`, partialError)
            }

            if (partialMatch) {
              firstCall = partialMatch
              console.log(`Found partial match for ${lead.lead_name}: ${partialMatch.lead_name}`)
            }
          }
        }

        if (!firstCall) {
          console.log(`No call found for lead: ${lead.lead_name}`)
          noCallsCount++
        }

        // Use the lead's created_at timestamp as the starting point
        const leadCreatedTime = new Date(lead.created_at)

        // Check if speed-to-lead record already exists for this lead
        const { data: existingRecord, error: existingError } = await supabase
          .from('speed_to_lead_stats')
          .select('*')
          .eq('lead_name', lead.lead_name)
          .eq('project_name', lead.project_name)
          .eq('date', lead.date)
          .maybeSingle()

        if (existingError) {
          console.error(`Error checking existing record for ${lead.lead_name}:`, existingError)
          continue
        }

        // Calculate speed to lead if we have a first call
        let speedToLeadMin = null
        if (firstCall) {
          const callDateTime = new Date(firstCall.call_datetime)
          const timeDiffMs = callDateTime.getTime() - leadCreatedTime.getTime()
          speedToLeadMin = Math.round(timeDiffMs / (1000 * 60)) // Convert to minutes
          console.log(`Calculated speed-to-lead for ${lead.lead_name}: ${speedToLeadMin} minutes`)
        }

        const speedToLeadData = {
          lead_name: lead.lead_name,
          lead_phone_number: firstCall?.lead_phone_number || '',
          project_name: lead.project_name,
          date: lead.date,
          date_time_in: leadCreatedTime.toISOString(),
          date_time_of_first_call: firstCall?.call_datetime || null,
          speed_to_lead_time_min: speedToLeadMin
        }

        if (existingRecord) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('speed_to_lead_stats')
            .update(speedToLeadData)
            .eq('id', existingRecord.id)

          if (updateError) {
            console.error(`Error updating speed-to-lead record for ${lead.lead_name}:`, updateError)
            continue
          }
          updatedCount++
          console.log(`Updated speed-to-lead record for ${lead.lead_name}: ${speedToLeadMin} minutes`)
        } else {
          // Create new record
          const { error: insertError } = await supabase
            .from('speed_to_lead_stats')
            .insert([speedToLeadData])

          if (insertError) {
            console.error(`Error creating speed-to-lead record for ${lead.lead_name}:`, insertError)
            continue
          }
          createdCount++
          console.log(`Created speed-to-lead record for ${lead.lead_name}: ${speedToLeadMin} minutes`)
        }

        processedCount++
      } catch (error) {
        console.error(`Error processing lead ${lead.lead_name}:`, error)
        continue
      }
    }

    console.log(`Speed-to-lead calculation completed.`)
    console.log(`Total leads processed: ${processedCount}`)
    console.log(`Records created: ${createdCount}`)
    console.log(`Records updated: ${updatedCount}`)
    console.log(`Leads without calls: ${noCallsCount}`)

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Speed-to-lead calculation completed successfully',
        stats: {
          totalProcessed: processedCount,
          recordsCreated: createdCount,
          recordsUpdated: updatedCount,
          leadsWithoutCalls: noCallsCount
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
