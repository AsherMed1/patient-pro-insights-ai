import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 2000;

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
    const limit = body.limit || null; // Optional limit for testing

    console.log(`[BACKFILL-ALLY] Starting backfill. dryRun=${dryRun}, limit=${limit || 'none'}`);

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
      return new Response(
        JSON.stringify({ error: 'Failed to query appointments', details: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalCount = appointments?.length || 0;
    console.log(`[BACKFILL-ALLY] Found ${totalCount} appointments to process`);

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

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No appointments to process', totalProcessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process in batches
    const results = {
      total: totalCount,
      processed: 0,
      enrichSuccess: 0,
      enrichFailed: 0,
      reparseSuccess: 0,
      reparseFailed: 0,
      errors: [] as Array<{ id: string; name: string; step: string; error: string }>
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
          console.log(`[BACKFILL-ALLY] ✓ Enriched ${appointment.lead_name}`);

          // Step 2: Trigger reparse
          const reparseResponse = await supabase.functions.invoke('trigger-reparse', {
            body: { appointment_id: appointment.id }
          });

          if (reparseResponse.error) {
            throw new Error(`Reparse failed: ${reparseResponse.error.message}`);
          }

          results.reparseSuccess++;
          console.log(`[BACKFILL-ALLY] ✓ Reparsed ${appointment.lead_name}`);

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[BACKFILL-ALLY] ✗ Error for ${appointment.lead_name}: ${errorMsg}`);
          
          if (errorMsg.includes('Enrich')) {
            results.enrichFailed++;
          } else {
            results.reparseFailed++;
          }
          
          results.errors.push({
            id: appointment.id,
            name: appointment.lead_name,
            step: errorMsg.includes('Enrich') ? 'enrich' : 'reparse',
            error: errorMsg
          });
        }
      }

      // Add delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < appointments.length) {
        console.log(`[BACKFILL-ALLY] Waiting ${BATCH_DELAY_MS}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(`[BACKFILL-ALLY] ✓ Complete! Processed ${results.processed}/${results.total}`);
    console.log(`[BACKFILL-ALLY] Enrich: ${results.enrichSuccess} success, ${results.enrichFailed} failed`);
    console.log(`[BACKFILL-ALLY] Reparse: ${results.reparseSuccess} success, ${results.reparseFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} appointments`,
        results: {
          ...results,
          errors: results.errors.slice(0, 20) // Limit errors in response
        }
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
