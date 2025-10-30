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

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size || 50;
    const projectFilter = body.projectName || body.project_name || null;
    const processQueue = body.process_queue !== false; // Default to true

    console.log(`Starting insurance card backfill (batch size: ${batchSize})`);
    if (projectFilter) {
      console.log(`Filtering by project: ${projectFilter}`);
    }

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    let queueProcessed = 0;

    // FIRST: Process the insurance_fetch_queue if enabled
    if (processQueue) {
      console.log('Processing insurance fetch queue...');
      
      let queueQuery = supabase
        .from('insurance_fetch_queue')
        .select('id, appointment_id, ghl_id, project_name, retry_count')
        .eq('status', 'pending')
        .lt('retry_count', 3)
        .order('created_at', { ascending: true })
        .limit(batchSize);

      if (projectFilter) {
        queueQuery = queueQuery.eq('project_name', projectFilter);
      }

      const { data: queueItems, error: queueError } = await queueQuery;

      if (queueError) {
        console.error('Error fetching queue items:', queueError);
      } else if (queueItems && queueItems.length > 0) {
        console.log(`Found ${queueItems.length} items in queue to process`);

        for (const queueItem of queueItems) {
          try {
            // Get project-specific API key if available
            let ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
            const { data: project } = await supabase
              .from('projects')
              .select('ghl_api_key')
              .eq('project_name', queueItem.project_name)
              .single();
            
            if (project?.ghl_api_key) {
              ghlApiKey = project.ghl_api_key;
            }

            if (!ghlApiKey) {
              throw new Error('No GHL API key available');
            }

            console.log(`Processing queue item ${queueItem.id} for appointment ${queueItem.appointment_id}`);
            
            const insuranceCardUrl = await fetchInsuranceCardUrl(queueItem.ghl_id, ghlApiKey);
            
            if (insuranceCardUrl) {
              // Update appointment with insurance card
              const { error: updateError } = await supabase
                .from('all_appointments')
                .update({ insurance_id_link: insuranceCardUrl })
                .eq('id', queueItem.appointment_id);
              
              if (updateError) {
                throw new Error(`Failed to update appointment: ${updateError.message}`);
              }

              // Mark queue item as completed
              await supabase
                .from('insurance_fetch_queue')
                .update({ 
                  status: 'completed', 
                  processed_at: new Date().toISOString() 
                })
                .eq('id', queueItem.id);

              console.log(`✓ Queue item ${queueItem.id} completed successfully`);
              queueProcessed++;
              totalUpdated++;
            } else {
              // No insurance card found - mark as completed anyway
              await supabase
                .from('insurance_fetch_queue')
                .update({ 
                  status: 'completed', 
                  processed_at: new Date().toISOString(),
                  last_error: 'No insurance card found in GHL'
                })
                .eq('id', queueItem.id);

              console.log(`Queue item ${queueItem.id} - no insurance card found`);
            }

            totalProcessed++;
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            console.error(`Error processing queue item ${queueItem.id}:`, error);
            
            // Update queue item with error and increment retry count
            await supabase
              .from('insurance_fetch_queue')
              .update({ 
                status: queueItem.retry_count >= 2 ? 'failed' : 'pending',
                retry_count: queueItem.retry_count + 1,
                last_error: error.message
              })
              .eq('id', queueItem.id);

            totalFailed++;
          }
        }

        console.log(`Queue processing complete: ${queueProcessed} items processed`);
      } else {
        console.log('No items in queue to process');
      }
    }

    // SECOND: Process appointments in batch mode (optional)
    const processBatch = body.process_batch === true;
    
    if (processBatch) {
      // Determine which API key to use
      let ghlApiKey = Deno.env.get('GOHIGHLEVEL_API_KEY');
      
      // If filtering by project, try to get project-specific API key
      if (projectFilter) {
        const { data: project } = await supabase
          .from('projects')
          .select('ghl_api_key')
          .eq('project_name', projectFilter)
          .single();
        
        if (project?.ghl_api_key) {
          console.log('Using project-specific GHL API key');
          ghlApiKey = project.ghl_api_key;
        } else {
          console.log('Using global GHL API key');
        }
      }
      
      if (!ghlApiKey) {
        return new Response(
          JSON.stringify({ 
            error: 'GHL API key not configured',
            message: 'No GHL API key found (neither project-specific nor global)'
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

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
    } // End of processBatch

    console.log('Backfill completed');
    console.log(`Queue processed: ${queueProcessed}, Total processed: ${totalProcessed}, Updated: ${totalUpdated}, Failed: ${totalFailed}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Insurance card backfill completed',
        stats: {
          queue_processed: queueProcessed,
          total_processed: totalProcessed,
          total_updated: totalUpdated,
          total_failed: totalFailed,
          appointments_found: processBatch ? (appointments?.length || 0) : 0,
          leads_found: processBatch ? (leads?.length || 0) : 0
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
