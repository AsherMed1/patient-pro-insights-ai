import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting intake notes sync process...');

    // Find appointments that don't have patient_intake_notes but have matching leads that do
    const { data: appointmentsToSync, error: queryError } = await supabase
      .from('all_appointments')
      .select('id, lead_name, project_name, patient_intake_notes')
      .is('patient_intake_notes', null);

    if (queryError) {
      console.error('Error fetching appointments:', queryError);
      throw queryError;
    }

    console.log(`Found ${appointmentsToSync?.length || 0} appointments without intake notes`);

    let syncCount = 0;
    let updatePromises = [];

    for (const appointment of appointmentsToSync || []) {
      // Find matching lead with intake notes (exact match first, then case-insensitive)
      const { data: matchingLeads, error: leadError } = await supabase
        .from('new_leads')
        .select('patient_intake_notes')
        .eq('lead_name', appointment.lead_name)
        .eq('project_name', appointment.project_name)
        .not('patient_intake_notes', 'is', null)
        .neq('patient_intake_notes', '')
        .order('created_at', { ascending: false })
        .limit(1);

      if (leadError) {
        console.error(`Error fetching lead for ${appointment.lead_name}:`, leadError);
        continue;
      }

      if (matchingLeads && matchingLeads.length > 0) {
        const leadNotes = matchingLeads[0].patient_intake_notes;
        console.log(`Syncing notes for ${appointment.lead_name}...`);

        // Update appointment with intake notes
        const updatePromise = supabase
          .from('all_appointments')
          .update({ 
            patient_intake_notes: leadNotes,
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment.id);

        updatePromises.push(updatePromise);
        syncCount++;

        // Process in batches of 10 to avoid overwhelming the database
        if (updatePromises.length >= 10) {
          await Promise.all(updatePromises);
          updatePromises = [];
          console.log(`Processed batch of 10 updates...`);
        }
      }
    }

    // Process remaining updates
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    console.log(`Sync completed. Updated ${syncCount} appointments with intake notes.`);

    return new Response(JSON.stringify({ 
      success: true, 
      syncedCount: syncCount,
      message: `Successfully synced ${syncCount} appointment records with intake notes from leads`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sync-intake-notes function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});