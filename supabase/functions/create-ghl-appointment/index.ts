import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateBlockSlotRequest {
  project_name: string;
  calendar_id: string;
  start_time: string; // ISO 8601 datetime
  end_time: string; // ISO 8601 datetime
  title?: string;
  reason?: string;
  // For local record creation
  calendar_name?: string;
  user_name?: string;
  user_id?: string;
  create_local_record?: boolean;
}

interface TeamMember {
  userId?: string;
  id?: string;
}

interface CalendarData {
  calendar?: {
    teamMembers?: TeamMember[];
    users?: TeamMember[];
    calendarType?: string;
  };
  teamMembers?: TeamMember[];
  users?: TeamMember[];
  calendarType?: string;
}

async function ghlJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Helper to delete GHL block on rollback
async function deleteGhlBlock(eventId: string, apiKey: string): Promise<void> {
  if (!eventId) {
    console.log('[CREATE-GHL-BLOCK-SLOT] No event ID to rollback');
    return;
  }
  
  try {
    console.log('[CREATE-GHL-BLOCK-SLOT] Attempting rollback for event:', eventId);
    const response = await fetch(
      `https://services.leadconnectorhq.com/calendars/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('[CREATE-GHL-BLOCK-SLOT] Rollback result:', response.status);
  } catch (err) {
    console.error('[CREATE-GHL-BLOCK-SLOT] Rollback failed:', err);
  }
}

// Helper to create local record and audit note
async function createLocalRecord(
  supabase: ReturnType<typeof createClient>,
  params: {
    project_name: string;
    title: string;
    start_time: string;
    end_time: string;
    calendar_name: string;
    user_name: string;
    user_id?: string;
    reason?: string;
    ghl_appointment_id: string | null;
    ghl_location_id: string;
  }
): Promise<{ success: boolean; local_appointment_id?: string; error?: string }> {
  const {
    project_name,
    title,
    start_time,
    end_time,
    calendar_name,
    user_name,
    user_id,
    reason,
    ghl_appointment_id,
    ghl_location_id,
  } = params;

  // Parse dates from ISO string
  const startDate = new Date(start_time);
  const endDate = new Date(end_time);
  
  // Format for database (use the date/time from the ISO string directly)
  const dateOfAppointment = start_time.split('T')[0];
  const requestedTime = start_time.substring(11, 16);
  const reservedEndTime = end_time.substring(11, 16);
  const today = new Date().toISOString().split('T')[0];

  const localRecord = {
    project_name,
    lead_name: title || 'Reserved',
    date_of_appointment: dateOfAppointment,
    requested_time: requestedTime,
    reserved_end_time: reservedEndTime,
    calendar_name,
    status: 'Confirmed',
    is_reserved_block: true,
    internal_process_complete: true,
    ghl_appointment_id,
    ghl_location_id,
    date_appointment_created: today,
    patient_intake_notes: `Time block reserved by ${user_name} on ${new Date().toLocaleDateString()}\nReason: ${reason || 'Not specified'}\nCalendar: ${calendar_name}\nTime: ${requestedTime} - ${reservedEndTime}`,
  };

  console.log('[CREATE-GHL-BLOCK-SLOT] Creating local record:', localRecord);

  const { data: newAppt, error: insertError } = await supabase
    .from('all_appointments')
    .insert(localRecord)
    .select()
    .single();

  if (insertError) {
    console.error('[CREATE-GHL-BLOCK-SLOT] Local insert failed:', insertError);
    return { success: false, error: insertError.message };
  }

  console.log('[CREATE-GHL-BLOCK-SLOT] Local record created:', newAppt?.id);

  // Create audit note (non-critical)
  if (user_id && newAppt?.id) {
    try {
      await supabase.from('appointment_notes').insert({
        appointment_id: newAppt.id,
        note_text: `Reserved time block created by ${user_name}. Reason: ${reason || 'Not specified'}. Calendar: ${calendar_name}.`,
        created_by: user_id,
      });
      console.log('[CREATE-GHL-BLOCK-SLOT] Audit note created');
    } catch (noteErr) {
      console.warn('[CREATE-GHL-BLOCK-SLOT] Audit note failed (non-critical):', noteErr);
    }
  }

  return { success: true, local_appointment_id: newAppt?.id };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateBlockSlotRequest = await req.json();
    const { 
      project_name, 
      calendar_id, 
      start_time, 
      end_time, 
      title, 
      reason,
      calendar_name,
      user_name,
      user_id,
      create_local_record,
    } = body;

    console.log('[CREATE-GHL-BLOCK-SLOT] Request received:', {
      project_name,
      calendar_id,
      calendar_name,
      start_time,
      end_time,
      title,
      create_local_record,
      user_name,
    });

    // Validate required fields
    if (!project_name || !calendar_id || !start_time || !end_time) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: project_name, calendar_id, start_time, end_time' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch project to get GHL credentials
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('ghl_location_id, ghl_api_key, timezone')
      .eq('project_name', project_name)
      .single();

    if (projectError || !project) {
      console.error('[CREATE-GHL-BLOCK-SLOT] Project not found:', projectError);
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!project.ghl_location_id || !project.ghl_api_key) {
      console.error('[CREATE-GHL-BLOCK-SLOT] Project missing GHL credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Project is not configured for GHL integration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Fetch calendar details to determine type and team members
    let calendarData: CalendarData | null = null;
    let teamMembers: TeamMember[] = [];
    
    try {
      console.log('[CREATE-GHL-BLOCK-SLOT] Fetching calendar details...');
      const calendarResponse = await fetch(
        `https://services.leadconnectorhq.com/calendars/${calendar_id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${project.ghl_api_key}`,
            'Version': '2021-04-15',
            'Content-Type': 'application/json',
          },
        }
      );

      calendarData = await ghlJson(calendarResponse);
      console.log('[CREATE-GHL-BLOCK-SLOT] Calendar data:', JSON.stringify(calendarData, null, 2));

      // Extract team members from various possible locations
      teamMembers = calendarData?.calendar?.teamMembers || 
                    calendarData?.teamMembers || 
                    calendarData?.calendar?.users ||
                    calendarData?.users ||
                    [];
                    
      console.log('[CREATE-GHL-BLOCK-SLOT] Found team members:', teamMembers.length);
    } catch (e) {
      console.error('[CREATE-GHL-BLOCK-SLOT] Error fetching calendar:', e);
    }

    // Step 2: Try block-slots endpoint with calendarId first (works for event calendars)
    const blockSlotPayload = {
      calendarId: calendar_id,
      locationId: project.ghl_location_id,
      title: title || 'Reserved',
      startTime: start_time,
      endTime: end_time,
    };

    console.log('[CREATE-GHL-BLOCK-SLOT] Trying block-slots with calendarId:', blockSlotPayload);

    let ghlResponse = await fetch(
      'https://services.leadconnectorhq.com/calendars/events/block-slots',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${project.ghl_api_key}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blockSlotPayload),
      }
    );

    let ghlData = await ghlJson(ghlResponse);
    let ghlAppointmentId: string | null = null;
    let ghlSynced = false;
    let allBlockIds: string[] = [];

    // If block-slots with calendarId succeeded (event calendar)
    if (ghlResponse.ok) {
      console.log('[CREATE-GHL-BLOCK-SLOT] Block slot created successfully with calendarId:', ghlData);
      ghlAppointmentId = ghlData?.id || ghlData?.appointmentId || null;
      allBlockIds = [ghlAppointmentId].filter(Boolean) as string[];
      ghlSynced = true;
    } else {
      // Step 3: For round-robin/service calendars, use assignedUserId instead of calendarId
      console.log('[CREATE-GHL-BLOCK-SLOT] calendarId approach failed, trying assignedUserId for each team member...');
      console.log('[CREATE-GHL-BLOCK-SLOT] Block-slots error:', ghlData);

      if (teamMembers.length === 0) {
        // Try to get users from location as fallback
        console.log('[CREATE-GHL-BLOCK-SLOT] No team members found, fetching location users...');
        try {
          const usersResponse = await fetch(
            `https://services.leadconnectorhq.com/users/?locationId=${project.ghl_location_id}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${project.ghl_api_key}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json',
              },
            }
          );

          const usersData = await ghlJson(usersResponse);
          if (usersData?.users && usersData.users.length > 0) {
            teamMembers = usersData.users.map((u: { id: string }) => ({ userId: u.id }));
            console.log('[CREATE-GHL-BLOCK-SLOT] Found location users:', teamMembers.length);
          }
        } catch (e) {
          console.error('[CREATE-GHL-BLOCK-SLOT] Error fetching location users:', e);
        }
      }

      // If we have team members, create blocks for each
      if (teamMembers.length > 0) {
        let successCount = 0;
        let failCount = 0;

        for (const member of teamMembers) {
          const memberUserId = member.userId || member.id;
          if (!memberUserId) continue;

          const userBlockPayload = {
            assignedUserId: memberUserId,
            locationId: project.ghl_location_id,
            title: title || 'Reserved',
            startTime: start_time,
            endTime: end_time,
          };

          console.log('[CREATE-GHL-BLOCK-SLOT] Creating block for user:', memberUserId);

          try {
            const userBlockResponse = await fetch(
              'https://services.leadconnectorhq.com/calendars/events/block-slots',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${project.ghl_api_key}`,
                  'Version': '2021-04-15',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(userBlockPayload),
              }
            );

            const userBlockData = await ghlJson(userBlockResponse);

            if (userBlockResponse.ok) {
              const blockId = userBlockData?.id || userBlockData?.appointmentId;
              if (blockId) {
                allBlockIds.push(blockId);
                if (!ghlAppointmentId) ghlAppointmentId = blockId;
              }
              successCount++;
              ghlSynced = true;
              console.log('[CREATE-GHL-BLOCK-SLOT] Block created for user:', memberUserId, blockId);
            } else {
              failCount++;
              console.log('[CREATE-GHL-BLOCK-SLOT] Failed to create block for user:', memberUserId, userBlockData);
            }
          } catch (e) {
            failCount++;
            console.error('[CREATE-GHL-BLOCK-SLOT] Error creating block for user:', memberUserId, e);
          }
        }

        console.log('[CREATE-GHL-BLOCK-SLOT] Team member results:', { successCount, failCount, allBlockIds });
      }
    }

    // Step 4: Create local record if requested
    if (create_local_record && calendar_name) {
      const localResult = await createLocalRecord(supabase, {
        project_name,
        title: title || 'Reserved',
        start_time,
        end_time,
        calendar_name,
        user_name: user_name || 'Portal User',
        user_id,
        reason,
        ghl_appointment_id: ghlAppointmentId,
        ghl_location_id: project.ghl_location_id,
      });

      if (!localResult.success) {
        console.error('[CREATE-GHL-BLOCK-SLOT] Local insert failed, attempting rollback...');
        
        // Rollback all GHL blocks we created
        for (const blockId of allBlockIds) {
          await deleteGhlBlock(blockId, project.ghl_api_key);
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to save reservation locally: ${localResult.error}. GHL block(s) rolled back.`,
            rollback_performed: true,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Return success with both GHL and local info
      return new Response(
        JSON.stringify({
          success: true,
          ghl_appointment_id: ghlAppointmentId,
          local_appointment_id: localResult.local_appointment_id,
          all_block_ids: allBlockIds,
          team_members_blocked: allBlockIds.length,
          ghl_synced: ghlSynced,
          local_saved: true,
          message: ghlSynced 
            ? `Successfully created reservation${allBlockIds.length > 1 ? ` (${allBlockIds.length} team members blocked)` : ''}`
            : 'Reservation saved locally but not synced to GHL',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If not creating local record, return GHL-only result (legacy behavior)
    return new Response(
      JSON.stringify({
        success: true,
        ghl_appointment_id: ghlAppointmentId,
        all_block_ids: allBlockIds,
        team_members_blocked: allBlockIds.length,
        ghl_synced: ghlSynced,
        local_saved: false,
        message: ghlSynced 
          ? `Successfully blocked ${allBlockIds.length} slot(s) in GHL` 
          : 'Block saved but not synced to GHL (no available slots or API limitation)'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CREATE-GHL-BLOCK-SLOT] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
