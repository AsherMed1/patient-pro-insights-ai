import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { appointment_ids } = await req.json();

    if (!appointment_ids || !Array.isArray(appointment_ids) || appointment_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'appointment_ids array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[REPARSE] Processing ${appointment_ids.length} appointments: GHL fetch → reset → reparse`);

    // Step 1: Fetch fresh GHL data for each appointment (server-to-server)
    const ghlResults = [];
    for (const appointmentId of appointment_ids) {
      try {
        console.log(`[REPARSE] Fetching GHL data for appointment: ${appointmentId}`);
        const ghlResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-ghl-contact-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ appointmentId })
        });

        const ghlResult = await ghlResponse.json();
        console.log(`[REPARSE] GHL fetch result for ${appointmentId}:`, ghlResult.success ? 'success' : ghlResult.error);
        ghlResults.push({ appointmentId, success: ghlResult.success || false, error: ghlResult.error });
      } catch (err) {
        console.error(`[REPARSE] GHL fetch failed for ${appointmentId}:`, err.message);
        ghlResults.push({ appointmentId, success: false, error: err.message });
      }
    }

    // Step 2: Reset parsing_completed_at for these specific appointments
    console.log(`[REPARSE] Resetting parsing for ${appointment_ids.length} appointments`);
    const { data: resetData, error: resetError } = await supabase
      .from('all_appointments')
      .update({ parsing_completed_at: null })
      .in('id', appointment_ids)
      .select('id, lead_name, project_name');

    if (resetError) {
      console.error('[REPARSE] Failed to reset appointments:', resetError);
      throw new Error(`Failed to reset appointments: ${resetError.message}`);
    }

    console.log(`[REPARSE] Reset ${resetData?.length || 0} appointments for re-parsing`);

    // Step 3: Call auto-parse-intake-notes to immediately process them
    console.log('[REPARSE] Invoking auto-parse-intake-notes...');
    const parseResponse = await fetch(`${supabaseUrl}/functions/v1/auto-parse-intake-notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({})
    });

    const parseResult = await parseResponse.json();
    console.log('[REPARSE] Parse result:', parseResult);

    return new Response(
      JSON.stringify({
        success: true,
        ghl_results: ghlResults,
        reset_appointments: resetData,
        parse_result: parseResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[REPARSE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
