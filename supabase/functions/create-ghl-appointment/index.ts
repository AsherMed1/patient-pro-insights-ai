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
    const { project_name, calendar_id, start_time, end_time, title } = body;

    console.log('[CREATE-GHL-BLOCK-SLOT] Request received:', {
      project_name,
      calendar_id,
      start_time,
      end_time,
      title
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

    // If block-slots with calendarId succeeded (event calendar), return success
    if (ghlResponse.ok) {
      console.log('[CREATE-GHL-BLOCK-SLOT] Block slot created successfully with calendarId:', ghlData);

      return new Response(
        JSON.stringify({
          success: true,
          ghl_appointment_id: ghlData?.id || ghlData?.appointmentId || null,
          all_block_ids: [ghlData?.id || ghlData?.appointmentId].filter(Boolean),
          team_members_blocked: 1,
          ghl_synced: true,
          ghl_data: ghlData
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // If still no team members, return success with local-only tracking
    if (teamMembers.length === 0) {
      console.log('[CREATE-GHL-BLOCK-SLOT] No team members available, allowing local-only block');
      return new Response(
        JSON.stringify({
          success: true,
          ghl_appointment_id: null,
          all_block_ids: [],
          team_members_blocked: 0,
          ghl_synced: false,
          message: 'No team members found on calendar. Block saved locally but not synced to GHL.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create block slots for each team member using assignedUserId
    const allBlockIds: string[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const member of teamMembers) {
      const userId = member.userId || member.id;
      if (!userId) continue;

      // Use assignedUserId instead of calendarId for round-robin calendars
      const userBlockPayload = {
        assignedUserId: userId,
        locationId: project.ghl_location_id,
        title: title || 'Reserved',
        startTime: start_time,
        endTime: end_time,
      };

      console.log('[CREATE-GHL-BLOCK-SLOT] Creating block for user:', userId);

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
          if (blockId) allBlockIds.push(blockId);
          successCount++;
          console.log('[CREATE-GHL-BLOCK-SLOT] Block created for user:', userId, blockId);
        } else {
          failCount++;
          console.log('[CREATE-GHL-BLOCK-SLOT] Failed to create block for user:', userId, userBlockData);
        }
      } catch (e) {
        failCount++;
        console.error('[CREATE-GHL-BLOCK-SLOT] Error creating block for user:', userId, e);
      }
    }

    console.log('[CREATE-GHL-BLOCK-SLOT] Results:', { successCount, failCount, allBlockIds });

    // Return success even if some failed - we at least have local tracking
    return new Response(
      JSON.stringify({
        success: true,
        ghl_appointment_id: allBlockIds[0] || null,
        all_block_ids: allBlockIds,
        team_members_blocked: successCount,
        team_members_failed: failCount,
        ghl_synced: successCount > 0,
        message: successCount > 0 
          ? `Successfully blocked ${successCount} team member(s)` 
          : 'Block saved locally but not synced to GHL (no available slots or API limitation)'
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
