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

    console.log('[BACKFILL-ALLY] Starting insurance data backfill for Ally Vascular appointments...');

    // Step 1: Query target appointments - Ally Vascular with insurance mentions but no structured data
    const { data: targetAppointments, error: queryError } = await supabase
      .from('all_appointments')
      .select('id, lead_name, project_name, patient_intake_notes')
      .ilike('project_name', '%Ally Vascular%')
      .is('detected_insurance_provider', null)
      .not('patient_intake_notes', 'is', null)
      .neq('patient_intake_notes', '')
      .or('patient_intake_notes.ilike.%insurance%,patient_intake_notes.ilike.%plan:%,patient_intake_notes.ilike.%group%,patient_intake_notes.ilike.%medicare%,patient_intake_notes.ilike.%medicaid%,patient_intake_notes.ilike.%united%,patient_intake_notes.ilike.%aetna%,patient_intake_notes.ilike.%cigna%,patient_intake_notes.ilike.%humana%,patient_intake_notes.ilike.%bcbs%,patient_intake_notes.ilike.%blue%cross%');

    if (queryError) {
      console.error('[BACKFILL-ALLY] Query error:', queryError);
      throw new Error(`Failed to query appointments: ${queryError.message}`);
    }

    const totalTargets = targetAppointments?.length || 0;
    console.log(`[BACKFILL-ALLY] Found ${totalTargets} appointments to re-parse`);

    if (totalTargets === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No appointments found matching criteria',
          queued: 0,
          processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Reset parsing_completed_at to null for these records
    const appointmentIds = targetAppointments.map((a) => a.id);
    
    const { error: resetError } = await supabase
      .from('all_appointments')
      .update({ 
        parsing_completed_at: null,
        updated_at: new Date().toISOString()
      })
      .in('id', appointmentIds);

    if (resetError) {
      console.error('[BACKFILL-ALLY] Reset error:', resetError);
      throw new Error(`Failed to reset parsing status: ${resetError.message}`);
    }

    console.log(`[BACKFILL-ALLY] Reset parsing_completed_at for ${totalTargets} appointments`);

    // Step 3: Trigger auto-parse in batches
    const batchSize = 25;
    const totalBatches = Math.ceil(totalTargets / batchSize);
    let processedCount = 0;
    let errorCount = 0;
    const batchResults: Array<{ batch: number; processed: number; errors: number }> = [];

    for (let batch = 0; batch < totalBatches; batch++) {
      console.log(`[BACKFILL-ALLY] Processing batch ${batch + 1}/${totalBatches}...`);
      
      try {
        const parseResponse = await fetch(`${supabaseUrl}/functions/v1/auto-parse-intake-notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({}),
        });

        if (!parseResponse.ok) {
          console.error(`[BACKFILL-ALLY] Batch ${batch + 1} failed with status ${parseResponse.status}`);
          errorCount += batchSize;
          batchResults.push({ batch: batch + 1, processed: 0, errors: batchSize });
        } else {
          const result = await parseResponse.json();
          const batchProcessed = result.processed || 0;
          const batchErrors = result.errors || 0;
          processedCount += batchProcessed;
          errorCount += batchErrors;
          batchResults.push({ batch: batch + 1, processed: batchProcessed, errors: batchErrors });
          console.log(`[BACKFILL-ALLY] Batch ${batch + 1} complete: ${batchProcessed} processed, ${batchErrors} errors`);
        }
      } catch (batchError) {
        console.error(`[BACKFILL-ALLY] Batch ${batch + 1} exception:`, batchError);
        errorCount += batchSize;
        batchResults.push({ batch: batch + 1, processed: 0, errors: batchSize });
      }

      // Small delay between batches to avoid overwhelming the parser
      if (batch < totalBatches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`[BACKFILL-ALLY] ✓ Backfill complete: ${processedCount} processed, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfill complete for Ally Vascular appointments`,
        queued: totalTargets,
        processed: processedCount,
        errors: errorCount,
        batches: batchResults,
        sample_appointments: targetAppointments.slice(0, 5).map((a) => ({
          id: a.id,
          lead_name: a.lead_name,
          project_name: a.project_name,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[BACKFILL-ALLY] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
