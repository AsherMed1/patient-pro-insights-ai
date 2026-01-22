import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    const { appointmentId, updates, userId, userName, changeSource } = await req.json();

    if (!appointmentId) {
      return new Response(
        JSON.stringify({ error: 'appointmentId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Updating appointment ${appointmentId} with:`, updates);
    console.log(`User context: userId=${userId}, userName=${userName}, source=${changeSource || 'unknown'}`);

    // Perform the update
    const { data, error } = await supabase
      .from('all_appointments')
      .update(updates)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Successfully updated appointment:', data.lead_name);

    // If user attribution is provided, create an internal note and audit log
    if (userId && userName) {
      const changedFields = Object.keys(updates).join(', ');
      const source = changeSource || 'portal';
      
      // Create an internal note documenting the change
      try {
        const noteText = `${source === 'portal' ? 'Portal' : 'System'} update by ${userName}: Updated ${changedFields}`;
        
        const { error: noteError } = await supabase
          .from('appointment_notes')
          .insert({
            appointment_id: appointmentId,
            note_text: noteText,
            created_by: userId,
          });

        if (noteError) {
          console.error('Failed to create internal note:', noteError);
        } else {
          console.log('✅ Created internal note for portal update');
        }
      } catch (noteErr) {
        console.error('Error creating internal note:', noteErr);
      }

      // Log to audit_logs with proper user attribution
      try {
        const { error: auditError } = await supabase
          .rpc('log_audit_event', {
            p_entity: 'appointment',
            p_action: 'portal_update',
            p_description: `${userName} updated appointment fields: ${changedFields}`,
            p_source: source,
            p_metadata: {
              appointment_id: appointmentId,
              user_id: userId,
              user_name: userName,
              updated_fields: Object.keys(updates),
              project_name: data?.project_name || null,
              lead_name: data?.lead_name || null,
            }
          });

        if (auditError) {
          console.error('Failed to log audit event:', auditError);
        } else {
          console.log('✅ Logged audit event for portal update');
        }
      } catch (auditErr) {
        console.error('Error logging audit event:', auditErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
