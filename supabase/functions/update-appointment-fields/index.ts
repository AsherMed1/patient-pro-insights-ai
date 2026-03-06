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

    const { appointmentId, updates, previousValues, userId, userName, changeSource } = await req.json();

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

    // If date_of_appointment changed, check for short-notice alert
    if (updates.date_of_appointment || updates.requested_time) {
      checkShortNoticeAlert(supabase, data);
    }

    // If user attribution is provided, create an internal note and audit log
    if (userId && userName) {
      const changedFields = Object.keys(updates);
      const source = changeSource || 'portal';

      // Special-case: if date_of_appointment changed, write a standardized reschedule note
      if (changedFields.includes('date_of_appointment')) {
        try {
          const fromDate = previousValues?.date_of_appointment || 'Unknown';
          const fromTime = previousValues?.requested_time || '';
          const toDate = updates.date_of_appointment;
          const toTime = updates.requested_time || previousValues?.requested_time || '';

          const fromStr = [fromDate, fromTime].filter(Boolean).join(' ').trim();
          const toStr = [toDate, toTime].filter(Boolean).join(' ').trim();
          const rescheduleNoteText = `Rescheduled | FROM: ${fromStr} | TO: ${toStr} | By: ${userName}`;

          const { error: rescheduleNoteError } = await supabase
            .from('appointment_notes')
            .insert({
              appointment_id: appointmentId,
              note_text: rescheduleNoteText,
              created_by: userId,
            });

          if (rescheduleNoteError) {
            console.error('Failed to create reschedule note:', rescheduleNoteError);
          } else {
            console.log('✅ Created standardized reschedule note');
          }
        } catch (rescheduleNoteErr) {
          console.error('Error creating reschedule note:', rescheduleNoteErr);
        }
      }

      // Build descriptive change details for the generic audit note (excluding date changes handled above)
      const nonDateFields = changedFields.filter(f => f !== 'date_of_appointment');

      // Build descriptive change details (hoisted so audit log can use it too)
      const friendlyNames: Record<string, string> = {
        parsed_medical_info: 'PCP/Medical Info',
        parsed_contact_info: 'Contact Info',
        parsed_insurance_info: 'Insurance Info',
        parsed_pathology_info: 'Pathology Info',
        parsed_demographics: 'Demographics',
      };

      const changeDetails = nonDateFields.map(field => {
        const oldVal = previousValues?.[field];
        const newVal = updates[field];
        const label = friendlyNames[field] || field;

        if (typeof newVal === 'object' && newVal !== null) {
          if (typeof oldVal === 'object' && oldVal !== null) {
            const diffs = Object.keys(newVal)
              .filter(k => JSON.stringify(newVal[k]) !== JSON.stringify(oldVal[k]) && newVal[k] != null)
              .map(k => oldVal[k] != null
                ? `${k} from "${oldVal[k]}" to "${newVal[k]}"`
                : `${k}: "${newVal[k]}"`)
              .join(', ');
            return diffs ? `${label} (${diffs})` : null;
          }
          const summary = Object.entries(newVal)
            .filter(([_, v]) => v != null && v !== '')
            .map(([k, v]) => `${k}: "${v}"`)
            .join(', ');
          return `${label} (${summary})`;
        }

        if (oldVal !== undefined && oldVal !== null) {
          return `${label} from "${oldVal}" to "${newVal}"`;
        }
        return `${label} to "${newVal}"`;
      }).filter(Boolean).join(', ');
      
      // Create an internal note documenting the change (for non-date fields)
      if (nonDateFields.length > 0 && changeDetails) {
        try {
          const noteText = `${source === 'portal' ? 'Portal' : 'System'} update by ${userName}: Updated ${changeDetails}`;
          
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
      }

      // Log to audit_logs with proper user attribution
      try {
        const { error: auditError } = await supabase
          .rpc('log_audit_event', {
            p_entity: 'appointment',
            p_action: 'portal_update',
            p_description: `${userName} updated appointment: ${changeDetails || Object.keys(updates).join(', ')}`,
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

// Determine if a given date falls within US Daylight Saving Time
function isUSDST(year: number, month: number, day: number): boolean {
  if (month < 3 || month > 11) return false;
  if (month > 3 && month < 11) return true;
  if (month === 3) {
    const firstDay = new Date(year, 2, 1).getDay();
    const secondSunday = firstDay === 0 ? 8 : (14 - firstDay + 1);
    return day >= secondSunday;
  }
  const firstDay = new Date(year, 10, 1).getDay();
  const firstSunday = firstDay === 0 ? 1 : (7 - firstDay + 1);
  return day < firstSunday;
}

function getTimezoneOffset(timezone: string, year: number, month: number, day: number): number {
  const stdOffsets: Record<string, [number, number]> = {
    'America/New_York': [-5, -4], 'US/Eastern': [-5, -4],
    'America/Chicago': [-6, -5], 'US/Central': [-6, -5],
    'America/Denver': [-7, -6], 'US/Mountain': [-7, -6],
    'America/Los_Angeles': [-8, -7], 'US/Pacific': [-8, -7],
    'America/Phoenix': [-7, -7],
  };
  const offsets = stdOffsets[timezone];
  if (!offsets) return -6;
  return isUSDST(year, month, day) ? offsets[1] : offsets[0];
}

// Convert a naive local datetime string to UTC by applying a timezone offset
function localDatetimeToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  const naive = `${dateStr}T${timeStr || '09:00'}`;
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  const offsetHours = getTimezoneOffset(timezone, year, month, day);
  const utcMs = new Date(naive + 'Z').getTime() - offsetHours * 3600000;
  return new Date(utcMs);
}

// Check if appointment qualifies as short-notice and fire Slack alert
async function checkShortNoticeAlert(supabase: any, appointment: any) {
  try {
    if (!appointment.date_of_appointment) return;

    const status = (appointment.status || '').toLowerCase().trim();
    const terminal = ['cancelled', 'canceled', 'no show', 'showed', 'oon'];
    if (terminal.some(t => status.includes(t))) return;

    const { data: project } = await supabase
      .from('projects')
      .select('short_notice_threshold_hours, timezone, ghl_location_id')
      .eq('project_name', appointment.project_name)
      .single();

    const threshold = project?.short_notice_threshold_hours ?? 72;
    if (threshold === 0) return;

    const projectTimezone = project?.timezone || 'America/Chicago';
    const apptTime = localDatetimeToUTC(appointment.date_of_appointment, appointment.requested_time, projectTimezone);
    const createdTime = new Date(appointment.created_at || appointment.date_appointment_created);
    const hoursDiff = calculateBusinessHours(createdTime, apptTime);

    if (hoursDiff <= threshold && hoursDiff > 0) {
      console.log(`⚡ Short-notice alert: ${appointment.lead_name} (${Math.round(hoursDiff)} business hrs notice)`);
      supabase.functions.invoke('notify-slack-short-notice', {
        body: {
          appointmentId: appointment.id,
          projectName: appointment.project_name,
          leadName: appointment.lead_name,
          ghlId: appointment.ghl_id || null,
          ghlLocationId: project?.ghl_location_id || null,
          appointmentDatetime: apptTime.toISOString(),
          createdDatetime: createdTime.toISOString(),
          hoursDifference: hoursDiff,
          status: appointment.status || 'Unconfirmed',
          calendarName: appointment.calendar_name || null,
          phone: appointment.lead_phone_number || null,
          timezone: projectTimezone,
        }
      });
    }
  } catch (err) {
    console.error('Short-notice check error:', err);
  }
}

// Calculate hours between two UTC dates, excluding Saturday and Sunday hours
function calculateBusinessHours(start: Date, end: Date): number {
  if (end.getTime() <= start.getTime()) return 0;
  let hours = 0;
  const cursor = new Date(start.getTime());
  cursor.setMinutes(0, 0, 0);
  cursor.setTime(cursor.getTime() + 3600000);
  
  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      hours++;
    }
    cursor.setTime(cursor.getTime() + 3600000);
  }
  const startDay = start.getUTCDay();
  if (startDay !== 0 && startDay !== 6) {
    hours += (60 - start.getUTCMinutes()) / 60;
  }
  return Math.max(hours, 0);
}
