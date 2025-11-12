import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface SheetSyncPayload {
  leadName: string;
  date: string; // YYYY-MM-DD format
  projectName: string;
  status?: string;
  procedureOrdered?: boolean;
  requestedTime?: string;
  phoneNumber?: string;
  email?: string;
  insuranceProvider?: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: SheetSyncPayload = await req.json();

    console.log('📥 Received sync from Google Sheets:', {
      leadName: payload.leadName,
      date: payload.date,
      projectName: payload.projectName,
    });

    // Validate required fields
    if (!payload.leadName || !payload.date || !payload.projectName) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: leadName, date, projectName',
          success: false 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Normalize lead name for matching (lowercase, trim)
    const normalizedLeadName = payload.leadName.toLowerCase().trim();

    // Find matching appointment
    const { data: appointments, error: searchError } = await supabase
      .from('all_appointments')
      .select('id, lead_name, date_of_appointment, status, procedure_ordered')
      .eq('project_name', payload.projectName)
      .eq('date_of_appointment', payload.date);

    if (searchError) {
      console.error('❌ Database search error:', searchError);
      return new Response(
        JSON.stringify({ error: searchError.message, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Find exact match by normalized name
    const matchedAppointment = appointments?.find(
      apt => apt.lead_name.toLowerCase().trim() === normalizedLeadName
    );

    if (!matchedAppointment) {
      console.warn('⚠️ No matching appointment found:', {
        leadName: payload.leadName,
        date: payload.date,
        projectName: payload.projectName,
        foundAppointments: appointments?.length || 0
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'No matching appointment found',
          success: false,
          details: {
            searchedFor: payload.leadName,
            date: payload.date,
            projectName: payload.projectName
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = {
      last_sync_source: 'google_sheets',
      last_sync_timestamp: new Date().toISOString(),
    };

    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.procedureOrdered !== undefined) updates.procedure_ordered = payload.procedureOrdered;
    if (payload.requestedTime !== undefined) updates.requested_time = payload.requestedTime;
    if (payload.phoneNumber !== undefined) updates.phone_number = payload.phoneNumber;
    if (payload.email !== undefined) updates.email = payload.email;
    if (payload.insuranceProvider !== undefined) updates.insurance_provider = payload.insuranceProvider;
    if (payload.notes !== undefined) updates.patient_intake_notes = payload.notes;

    // Update appointment
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('all_appointments')
      .update(updates)
      .eq('id', matchedAppointment.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Successfully synced appointment:', {
      id: matchedAppointment.id,
      leadName: payload.leadName,
      updatedFields: Object.keys(updates).filter(k => !k.startsWith('last_sync'))
    });

    // Log to audit trail
    await supabase.from('audit_logs').insert({
      entity: 'all_appointments',
      action: 'sync_from_sheet',
      description: `Synced ${payload.leadName} from Google Sheets`,
      user_name: 'Google Sheets Webhook',
      source: 'google_sheets',
      metadata: {
        appointment_id: matchedAppointment.id,
        lead_name: payload.leadName,
        project_name: payload.projectName,
        updated_fields: Object.keys(updates).filter(k => !k.startsWith('last_sync')),
        sync_timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        appointmentId: matchedAppointment.id,
        updatedFields: Object.keys(updates).filter(k => !k.startsWith('last_sync')),
        data: updatedAppointment
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
