import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fixing completed appointments with internal_process_complete = false...');

    // First, get the appointments that need updating
    const { data: appointmentsToUpdate, error: selectError } = await supabase
      .from('all_appointments')
      .select('id, lead_name, status, internal_process_complete')
      .in('status', ['Cancelled', 'cancelled', 'Canceled', 'canceled', 'No Show', 'no show', 'noshow', 'NoShow', 'Showed', 'showed', 'OON', 'oon']);

    if (selectError) {
      console.error('Select error:', selectError);
      return new Response(
        JSON.stringify({ error: selectError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Filter for those with internal_process_complete = false or null
    const toUpdate = appointmentsToUpdate?.filter(a => 
      a.internal_process_complete === false || a.internal_process_complete === null
    ) || [];

    if (toUpdate.length === 0) {
      console.log('No appointments to update');
      return new Response(
        JSON.stringify({ 
          success: true, 
          updated_count: 0,
          message: 'No appointments needed updating'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Update all completed appointments to have internal_process_complete = true
    const ids = toUpdate.map(a => a.id);
    const { data, error } = await supabase
      .from('all_appointments')
      .update({ 
        internal_process_complete: true,
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .select('id, lead_name, status');

    if (error) {
      console.error('Update error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`✅ Successfully updated ${data?.length || 0} appointments`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated_count: data?.length || 0,
        appointments: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
