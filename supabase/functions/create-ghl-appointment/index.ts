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
    const { project_name, calendar_id, start_time, end_time, title, reason } = body;

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

    // First, try the block-slots endpoint (works for event calendars)
    const blockSlotPayload = {
      calendarId: calendar_id,
      locationId: project.ghl_location_id,
      title: title || 'Reserved',
      startTime: start_time,
      endTime: end_time,
    };

    console.log('[CREATE-GHL-BLOCK-SLOT] Trying block-slots endpoint:', blockSlotPayload);

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

    let ghlData = await ghlResponse.json();

    const notEventCalendarMessage = (typeof ghlData?.message === 'string' ? ghlData.message : '')
      .toLowerCase();
    const isNotEventCalendar = !ghlResponse.ok && notEventCalendarMessage.includes('not an event calendar');

    // For non-event calendars (round-robin, service, etc.), we need to block ALL team members
    if (isNotEventCalendar) {
      console.log('[CREATE-GHL-BLOCK-SLOT] Calendar is not event type. Fetching calendar details to block all team members...');

      try {
        const calendarDetailsResponse = await fetch(
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

        const calendarDetails = await calendarDetailsResponse.json();
        
        // Extract ALL team member IDs
        const teamMembers: string[] = (calendarDetails?.calendar?.teamMembers || [])
          .map((tm: { userId?: string; id?: string }) => tm.userId || tm.id)
          .filter(Boolean);

        console.log('[CREATE-GHL-BLOCK-SLOT] Calendar details fetched:', {
          calendarType: calendarDetails?.calendar?.calendarType,
          teamMemberCount: teamMembers.length,
          teamMembers: teamMembers,
        });

        if (teamMembers.length > 0) {
          // Create block slots for ALL team members
          const createdBlocks: string[] = [];
          const failedBlocks: { userId: string; error: unknown }[] = [];

          for (const userId of teamMembers) {
            const blockSlotByUserPayload = {
              assignedUserId: userId,
              locationId: project.ghl_location_id,
              title: title || 'Reserved',
              startTime: start_time,
              endTime: end_time,
            };

            console.log('[CREATE-GHL-BLOCK-SLOT] Creating block for team member:', userId);

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
                  body: JSON.stringify(blockSlotByUserPayload),
                }
              );

              const userBlockData = await userBlockResponse.json();

              if (userBlockResponse.ok && userBlockData.id) {
                createdBlocks.push(userBlockData.id);
                console.log('[CREATE-GHL-BLOCK-SLOT] Successfully blocked team member:', userId, 'Block ID:', userBlockData.id);
              } else {
                console.warn('[CREATE-GHL-BLOCK-SLOT] Failed to block for user:', userId, userBlockData);
                failedBlocks.push({ userId, error: userBlockData });
              }
            } catch (blockError) {
              console.error('[CREATE-GHL-BLOCK-SLOT] Error blocking team member:', userId, blockError);
              failedBlocks.push({ userId, error: blockError });
            }
          }

          // If we created at least one block, consider it a success
          if (createdBlocks.length > 0) {
            console.log('[CREATE-GHL-BLOCK-SLOT] Block slots created for team members:', {
              totalTeamMembers: teamMembers.length,
              successfulBlocks: createdBlocks.length,
              failedBlocks: failedBlocks.length,
            });

            return new Response(
              JSON.stringify({
                success: true,
                ghl_appointment_id: createdBlocks[0], // Primary ID for local DB
                all_block_ids: createdBlocks,
                team_members_blocked: createdBlocks.length,
                total_team_members: teamMembers.length,
                failed_blocks: failedBlocks.length,
                ghl_data: {
                  calendarType: calendarDetails?.calendar?.calendarType,
                  blockedUserIds: teamMembers.filter((_, i) => i < createdBlocks.length),
                }
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // If all blocks failed, we'll fall through to the placeholder contact approach
          console.warn('[CREATE-GHL-BLOCK-SLOT] All team member blocks failed. Falling back to placeholder contact...');
        } else {
          console.warn('[CREATE-GHL-BLOCK-SLOT] No team members found on calendar. Falling back to placeholder contact...');
        }
      } catch (e) {
        console.error('[CREATE-GHL-BLOCK-SLOT] Failed to fetch calendar details / block team members:', e);
      }
    }

    // If block-slots succeeded on first try (event calendar), return success
    if (ghlResponse.ok) {
      console.log('[CREATE-GHL-BLOCK-SLOT] Event calendar block slot created successfully:', ghlData);

      return new Response(
        JSON.stringify({
          success: true,
          ghl_appointment_id: ghlData.id || ghlData.appointmentId,
          all_block_ids: [ghlData.id || ghlData.appointmentId],
          team_members_blocked: 1,
          ghl_data: ghlData
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: Use placeholder contact approach for calendars that don't support block-slots
    console.log('[CREATE-GHL-BLOCK-SLOT] Block-slots failed, using placeholder contact approach...');

    // Search for existing placeholder contact
    const searchResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${project.ghl_location_id}&query=Reserved+Time+Block`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${project.ghl_api_key}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
      }
    );

    const searchData = await searchResponse.json();
    let placeholderContactId: string | null = null;

    if (searchData.contacts && searchData.contacts.length > 0) {
      placeholderContactId = searchData.contacts[0].id;
      console.log('[CREATE-GHL-BLOCK-SLOT] Found existing placeholder contact:', placeholderContactId);
    } else {
      // Create a new placeholder contact for time blocks
      console.log('[CREATE-GHL-BLOCK-SLOT] Creating new placeholder contact...');
      const createContactResponse = await fetch(
        'https://services.leadconnectorhq.com/contacts/',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${project.ghl_api_key}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locationId: project.ghl_location_id,
            firstName: 'Reserved',
            lastName: 'Time Block',
            email: `reserved-block-${project.ghl_location_id}@placeholder.local`,
            tags: ['system', 'time-block', 'do-not-contact'],
          }),
        }
      );

      const createContactData = await createContactResponse.json();
      
      if (!createContactResponse.ok) {
        console.error('[CREATE-GHL-BLOCK-SLOT] Failed to create placeholder contact:', createContactData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to create placeholder contact for time block',
            details: createContactData 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      placeholderContactId = createContactData.contact?.id;
      console.log('[CREATE-GHL-BLOCK-SLOT] Created placeholder contact:', placeholderContactId);
    }

    if (!placeholderContactId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not find or create placeholder contact' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Now create appointment with the placeholder contact
    const appointmentPayload = {
      calendarId: calendar_id,
      locationId: project.ghl_location_id,
      contactId: placeholderContactId,
      title: title || 'Reserved',
      startTime: start_time,
      endTime: end_time,
      appointmentStatus: 'confirmed',
      toNotify: false,
    };

    console.log('[CREATE-GHL-BLOCK-SLOT] Creating appointment with placeholder contact:', appointmentPayload);

    ghlResponse = await fetch(
      'https://services.leadconnectorhq.com/calendars/events/appointments',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${project.ghl_api_key}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentPayload),
      }
    );

    ghlData = await ghlResponse.json();

    if (!ghlResponse.ok) {
      console.error('[CREATE-GHL-BLOCK-SLOT] GHL API error:', ghlData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create GHL block slot',
          details: ghlData 
        }),
        { status: ghlResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-GHL-BLOCK-SLOT] Placeholder appointment created successfully:', ghlData);

    return new Response(
      JSON.stringify({
        success: true,
        ghl_appointment_id: ghlData.id || ghlData.appointmentId,
        all_block_ids: [ghlData.id || ghlData.appointmentId],
        team_members_blocked: 1,
        ghl_data: ghlData
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
