import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    console.log(`[REPARSE] Resetting parsing for ${appointment_ids.length} appointments:`, appointment_ids);

    // Reset parsing_completed_at for these specific appointments
    const { data: resetData, error: resetError } = await supabase
      .from('all_appointments')
      .update({ parsing_completed_at: null })
      .in('id', appointment_ids)
      .select('id, lead_name, project_name');

    if (resetError) {
      console.error('[REPARSE] Failed to reset appointments:', resetError);
      throw new Error(`Failed to reset appointments: ${resetError.message}`);
    }

    console.log(`[REPARSE] Reset ${resetData?.length || 0} appointments for re-parsing:`, resetData?.map(r => r.lead_name));

    // Call auto-parse-intake-notes to immediately process them
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
