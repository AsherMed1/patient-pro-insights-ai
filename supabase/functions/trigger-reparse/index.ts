import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

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

    const { project_name } = await req.json();

    if (!project_name) {
      return new Response(
        JSON.stringify({ error: 'project_name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TRIGGER-REPARSE] Starting re-parse for project: ${project_name}`);

    // Reset parsing_completed_at for appointments parsed before 2025-11-20
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('all_appointments')
      .update({ 
        parsing_completed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('project_name', project_name)
      .lt('parsing_completed_at', '2025-11-20T00:00:00Z')
      .select('id');

    if (appointmentsError) {
      console.error('[TRIGGER-REPARSE] Error updating appointments:', appointmentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to reset appointments', details: appointmentsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset parsing_completed_at for leads parsed before 2025-11-20
    const { data: leadsData, error: leadsError } = await supabase
      .from('new_leads')
      .update({ 
        parsing_completed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('project_name', project_name)
      .lt('parsing_completed_at', '2025-11-20T00:00:00Z')
      .select('id');

    if (leadsError) {
      console.error('[TRIGGER-REPARSE] Error updating leads:', leadsError);
      return new Response(
        JSON.stringify({ error: 'Failed to reset leads', details: leadsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appointmentsCount = appointmentsData?.length || 0;
    const leadsCount = leadsData?.length || 0;
    const totalCount = appointmentsCount + leadsCount;

    console.log(`[TRIGGER-REPARSE] ✓ Queued ${totalCount} records for re-parsing (${appointmentsCount} appointments, ${leadsCount} leads)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Queued ${totalCount} records for re-parsing`,
        appointments: appointmentsCount,
        leads: leadsCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TRIGGER-REPARSE] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
