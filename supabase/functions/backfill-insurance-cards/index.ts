import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchInsuranceCardUrl } from '../_shared/ghl-client.ts'

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

    const ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
    if (!ghlApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'GHL API key not configured',
          message: 'GOHIGHLEVEL_API_KEY environment variable is required'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size || 50;
    const projectFilter = body.project_name || null;

    console.log(`Starting insurance card backfill (batch size: ${batchSize})`);
    if (projectFilter) {
      console.log(`Filtering by project: ${projectFilter}`);
    }

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalFailed = 0;

    // Process appointments
    console.log('Processing appointments...');
    let appointmentsQuery = supabase
      .from('all_appointments')
      .select('id, ghl_id, lead_name, project_name')
      .is('insurance_id_link', null)
      .not('ghl_id', 'is', null)
      .limit(batchSize);

    if (projectFilter) {
      appointmentsQuery = appointmentsQuery.eq('project_name', projectFilter);
    }

    const { data: appointments, error: apptError } = await appointmentsQuery;

    if (apptError) {
      console.error('Error fetching appointments:', apptError);
    } else if (appointments) {
      console.log(`Found ${appointments.length} appointments to process`);
      
      for (const appointment of appointments) {
        totalProcessed++;
        
        try {
          console.log(`Fetching insurance card for appointment ${appointment.id} (${appointment.lead_name})`);
          
          const insuranceCardUrl = await fetchInsuranceCardUrl(appointment.ghl_id, ghlApiKey);
          
          if (insuranceCardUrl) {
            const { error: updateError } = await supabase
              .from('all_appointments')
              .update({ insurance_id_link: insuranceCardUrl })
              .eq('id', appointment.id);
            
            if (updateError) {
              console.error(`Failed to update appointment ${appointment.id}:`, updateError);
              totalFailed++;
            } else {
              console.log(`✓ Updated appointment ${appointment.id}`);
              totalUpdated++;
            }
          } else {
            console.log(`No insurance card found for appointment ${appointment.id}`);
          }
          
          // Rate limiting - wait 100ms between requests
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error processing appointment ${appointment.id}:`, error);
          totalFailed++;
        }
      }
    }

    // Process leads
    console.log('Processing leads...');
    let leadsQuery = supabase
      .from('new_leads')
      .select('id, contact_id, lead_name, project_name')
      .is('insurance_id_link', null)
      .not('contact_id', 'is', null)
      .limit(batchSize);

    if (projectFilter) {
      leadsQuery = leadsQuery.eq('project_name', projectFilter);
    }

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
    } else if (leads) {
      console.log(`Found ${leads.length} leads to process`);
      
      for (const lead of leads) {
        totalProcessed++;
        
        try {
          console.log(`Fetching insurance card for lead ${lead.id} (${lead.lead_name})`);
          
          const insuranceCardUrl = await fetchInsuranceCardUrl(lead.contact_id, ghlApiKey);
          
          if (insuranceCardUrl) {
            const { error: updateError } = await supabase
              .from('new_leads')
              .update({ insurance_id_link: insuranceCardUrl })
              .eq('id', lead.id);
            
            if (updateError) {
              console.error(`Failed to update lead ${lead.id}:`, updateError);
              totalFailed++;
            } else {
              console.log(`✓ Updated lead ${lead.id}`);
              totalUpdated++;
            }
          } else {
            console.log(`No insurance card found for lead ${lead.id}`);
          }
          
          // Rate limiting - wait 100ms between requests
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error processing lead ${lead.id}:`, error);
          totalFailed++;
        }
      }
    }

    console.log('Backfill completed');
    console.log(`Processed: ${totalProcessed}, Updated: ${totalUpdated}, Failed: ${totalFailed}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Insurance card backfill completed',
        stats: {
          total_processed: totalProcessed,
          total_updated: totalUpdated,
          total_failed: totalFailed,
          appointments_found: appointments?.length || 0,
          leads_found: leads?.length || 0
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Backfill error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
