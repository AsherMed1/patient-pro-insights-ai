import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 2000;

// Background processing function
async function processBackfill(supabaseUrl: string, supabaseKey: string, limit: number | null) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`[BACKFILL-ALLY] Background task started. limit=${limit || 'none'}`);

  // Query appointments missing insurance data with valid ghl_id
  let query = supabase
    .from('all_appointments')
    .select('id, lead_name, ghl_id, ghl_appointment_id, detected_insurance_provider')
    .ilike('project_name', '%Ally Vascular%')
    .is('detected_insurance_provider', null)
    .not('ghl_id', 'is', null)
    .order('date_appointment_created', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: appointments, error: queryError } = await query;

  if (queryError) {
    console.error('[BACKFILL-ALLY] Query error:', queryError);
    return;
  }

  const totalCount = appointments?.length || 0;
  console.log(`[BACKFILL-ALLY] Found ${totalCount} appointments to process`);

  if (!appointments || appointments.length === 0) {
    console.log('[BACKFILL-ALLY] No appointments to process');
    return;
  }

  // Process in batches
  const results = {
    total: totalCount,
    processed: 0,
    enrichSuccess: 0,
    enrichFailed: 0,
    reparseSuccess: 0,
    reparseFailed: 0,
  };

  for (let i = 0; i < appointments.length; i += BATCH_SIZE) {
    const batch = appointments.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(appointments.length / BATCH_SIZE);
    
    console.log(`[BACKFILL-ALLY] Processing batch ${batchNum}/${totalBatches} (${batch.length} appointments)`);

    // Process each appointment in the batch
    for (const appointment of batch) {
      results.processed++;

      try {
        // Step 1: Fetch GHL contact data
        console.log(`[BACKFILL-ALLY] Enriching ${appointment.lead_name} (${appointment.id})`);
        
        const enrichResponse = await supabase.functions.invoke('fetch-ghl-contact-data', {
          body: { appointmentId: appointment.id }
        });

        if (enrichResponse.error) {
          throw new Error(`Enrich failed: ${enrichResponse.error.message}`);
        }

        results.enrichSuccess++;

        // Step 2: Trigger reparse
        const reparseResponse = await supabase.functions.invoke('trigger-reparse', {
          body: { appointment_id: appointment.id }
        });

        if (reparseResponse.error) {
          throw new Error(`Reparse failed: ${reparseResponse.error.message}`);
        }

        results.reparseSuccess++;
        console.log(`[BACKFILL-ALLY] ✓ Processed ${appointment.lead_name} (${results.processed}/${totalCount})`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[BACKFILL-ALLY] ✗ Error for ${appointment.lead_name}: ${errorMsg}`);
        
        if (errorMsg.includes('Enrich')) {
          results.enrichFailed++;
        } else {
          results.reparseFailed++;
        }
      }
    }

    // Add delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < appointments.length) {
      console.log(`[BACKFILL-ALLY] Waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`[BACKFILL-ALLY] ✓ COMPLETE! Processed ${results.processed}/${results.total}`);
  console.log(`[BACKFILL-ALLY] Enrich: ${results.enrichSuccess} success, ${results.enrichFailed} failed`);
  console.log(`[BACKFILL-ALLY] Reparse: ${results.reparseSuccess} success, ${results.reparseFailed} failed`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional parameters
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true;
    const limit = body.limit || null;

    console.log(`[BACKFILL-ALLY] Request received. dryRun=${dryRun}, limit=${limit || 'none'}`);

    // Query count for response
    let query = supabase
      .from('all_appointments')
      .select('id, lead_name, ghl_id', { count: 'exact' })
      .ilike('project_name', '%Ally Vascular%')
      .is('detected_insurance_provider', null)
      .not('ghl_id', 'is', null);

    if (limit) {
      query = query.limit(limit);
    }

    const { data: appointments, count, error: queryError } = await query;

    if (queryError) {
      console.error('[BACKFILL-ALLY] Query error:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to query appointments', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalCount = limit ? (appointments?.length || 0) : (count || 0);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dryRun: true,
          totalAppointments: totalCount,
          sampleAppointments: appointments?.slice(0, 5).map(a => ({
            id: a.id,
            name: a.lead_name,
            ghl_id: a.ghl_id
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (totalCount === 0) {
      return new Response(
        JSON.stringify({ message: 'No appointments to process', totalAppointments: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start background processing
    EdgeRuntime.waitUntil(processBackfill(supabaseUrl, supabaseKey, limit));

    // Return immediately
    return new Response(
      JSON.stringify({
        success: true,
        message: `Started background processing of ${totalCount} appointments`,
        totalAppointments: totalCount,
        estimatedTimeMinutes: Math.ceil((totalCount / BATCH_SIZE) * (BATCH_DELAY_MS / 1000 / 60) + totalCount * 0.05),
        checkLogs: 'https://supabase.com/dashboard/project/bhabbokbhnqioykjimix/functions/backfill-ally-ghl-data/logs'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BACKFILL-ALLY] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
