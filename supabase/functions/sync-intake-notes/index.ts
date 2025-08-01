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

    // Use a direct SQL approach to sync in one operation
    const { data: syncResults, error: syncError } = await supabase.rpc('bulk_sync_patient_intake_notes');

    if (syncError) {
      console.error('Sync error:', syncError);
      throw syncError;
    }

    console.log(`Sync completed. Updated ${syncResults?.length || 0} appointments with intake notes.`);
    console.log('Sync details:', syncResults?.slice(0, 5));

    return new Response(JSON.stringify({ 
      success: true, 
      syncedCount: syncResults?.length || 0,
      message: `Successfully synced ${syncResults?.length || 0} appointment records with intake notes from leads`,
      details: syncResults?.slice(0, 10) // Show first 10 synced records
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