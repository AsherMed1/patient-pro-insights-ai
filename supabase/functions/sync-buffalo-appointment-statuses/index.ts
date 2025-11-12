import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusUpdate {
  lead_name: string;
  date: string;
  csv_status: string;
  db_status?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { statusUpdates } = await req.json() as { statusUpdates: StatusUpdate[] };

    console.log(`Processing ${statusUpdates.length} status updates for Buffalo Vascular Care`);

    const results = {
      total: statusUpdates.length,
      successful: 0,
      failed: 0,
      errors: [] as any[],
      updates: [] as any[]
    };

    for (const update of statusUpdates) {
      try {
        // Normalize lead name for matching (remove titles, trim spaces)
        const normalizedName = update.lead_name
          .replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s*/i, '')
          .trim();

        // Find the appointment by lead_name (exact or normalized) and date
        const { data: appointments, error: searchError } = await supabase
          .from('all_appointments')
          .select('id, lead_name, status, date_of_appointment')
          .eq('project_name', 'Buffalo Vascular Care')
          .eq('date_of_appointment', update.date)
          .or(`lead_name.eq.${update.lead_name},lead_name.eq.${normalizedName}`);

        if (searchError) {
          throw searchError;
        }

        if (!appointments || appointments.length === 0) {
          console.warn(`No appointment found for ${update.lead_name} on ${update.date}`);
          results.errors.push({
            lead_name: update.lead_name,
            date: update.date,
            error: 'Appointment not found'
          });
          results.failed++;
          continue;
        }

        // Update the appointment status
        const appointment = appointments[0];
        const { error: updateError } = await supabase
          .from('all_appointments')
          .update({ status: update.csv_status })
          .eq('id', appointment.id);

        if (updateError) {
          throw updateError;
        }

        results.successful++;
        results.updates.push({
          lead_name: update.lead_name,
          date: update.date,
          old_status: appointment.status,
          new_status: update.csv_status
        });

        console.log(`✅ Updated ${update.lead_name}: ${appointment.status} → ${update.csv_status}`);
      } catch (error) {
        console.error(`❌ Failed to update ${update.lead_name}:`, error);
        results.failed++;
        results.errors.push({
          lead_name: update.lead_name,
          date: update.date,
          error: error.message
        });
      }
    }

    console.log(`Sync complete: ${results.successful} successful, ${results.failed} failed`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    console.error('Sync function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
