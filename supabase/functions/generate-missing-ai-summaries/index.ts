import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting bulk AI summary generation...')

    // Find all appointments with patient_intake_notes but no ai_summary
    const { data: appointments, error: fetchError } = await supabase
      .from('all_appointments')
      .select('id, lead_name, project_name, patient_intake_notes')
      .not('patient_intake_notes', 'is', null)
      .neq('patient_intake_notes', '')
      .is('ai_summary', null)

    if (fetchError) {
      throw new Error(`Failed to fetch appointments: ${fetchError.message}`)
    }

    console.log(`Found ${appointments?.length || 0} appointments missing AI summaries`)

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No appointments found missing AI summaries',
          processed: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    // Process each appointment
    for (const appointment of appointments) {
      try {
        console.log(`Processing AI summary for ${appointment.lead_name} (${appointment.id})`)

        // Call the format-intake-ai function for this appointment
        const aiResponse = await fetch(`${supabaseUrl}/functions/v1/format-intake-ai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            type: 'appointment_summary',
            data: {
              patient_intake_notes: appointment.patient_intake_notes,
              lead_name: appointment.lead_name,
              project_name: appointment.project_name
            },
            recordId: appointment.id,
            tableName: 'all_appointments'
          })
        })

        const aiResult = await aiResponse.json()

        if (aiResult.success) {
          results.push({
            id: appointment.id,
            lead_name: appointment.lead_name,
            status: 'success'
          })
          successCount++
          console.log(`✓ Generated AI summary for ${appointment.lead_name}`)
        } else {
          results.push({
            id: appointment.id,
            lead_name: appointment.lead_name,
            status: 'error',
            error: aiResult.error
          })
          errorCount++
          console.log(`✗ Failed to generate AI summary for ${appointment.lead_name}: ${aiResult.error}`)
        }

        // Small delay to avoid overwhelming the AI service
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        results.push({
          id: appointment.id,
          lead_name: appointment.lead_name,
          status: 'error',
          error: error.message
        })
        errorCount++
        console.error(`✗ Error processing ${appointment.lead_name}:`, error)
      }
    }

    console.log(`Bulk AI summary generation complete. Success: ${successCount}, Errors: ${errorCount}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${appointments.length} appointments`,
        summary: {
          total: appointments.length,
          successful: successCount,
          errors: errorCount
        },
        results: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in bulk AI summary generation:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})