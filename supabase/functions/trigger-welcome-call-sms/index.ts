import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TAG = 'welcome-call-no-answer';
const COOLDOWN_MS = 12 * 60 * 60 * 1000;

// Triggers the GHL Welcome Call SMS workflow by tagging the contact.
// Body: { appointment_id }
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Caller must be a signed-in portal user.
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const appointmentId = typeof body?.appointment_id === 'string' ? body.appointment_id.trim() : '';
    if (!appointmentId) return json({ error: 'appointment_id is required' }, 400);

    const { data: appt, error: apptErr } = await supabase
      .from('all_appointments')
      .select('id, ghl_id, lead_name, welcome_call_last_sms_at')
      .eq('id', appointmentId)
      .maybeSingle();

    if (apptErr) return json({ error: apptErr.message }, 500);
    if (!appt) return json({ error: 'Appointment not found' }, 404);

    // Server-side 12h cooldown re-check.
    const last = appt.welcome_call_last_sms_at ? new Date(appt.welcome_call_last_sms_at).getTime() : 0;
    if (last && Date.now() - last < COOLDOWN_MS) {
      await supabase.from('appointment_notes').insert({
        appointment_id: appointmentId,
        note_text: 'Welcome Call SMS was not sent: a Welcome Call text was already sent to this patient within the last 12 hours.',
        created_by: 'System',
        visibility: 'internal',
      });
      return json({ success: true, suppressed: true, reason: 'cooldown' });
    }

    if (!appt.ghl_id) {
      return json({ success: false, error: 'No GHL contact linked to this appointment' }, 409);
    }

    const apiKey = Deno.env.get('GHL_LOCATION_API_KEY');
    if (!apiKey) return json({ error: 'GHL API key not configured' }, 500);

    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts/${appt.ghl_id}/tags`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags: [TAG] }),
      },
    );

    if (!response.ok) {
      const details = await response.text();
      console.error('GHL tag push failed', response.status, details);
      return json({ success: false, error: 'Failed to trigger SMS', details }, response.status);
    }

    await supabase
      .from('all_appointments')
      .update({ welcome_call_last_sms_at: new Date().toISOString() })
      .eq('id', appointmentId);

    await supabase.from('appointment_notes').insert({
      appointment_id: appointmentId,
      note_text: 'Welcome Call SMS triggered (patient did not answer).',
      created_by: 'System',
      visibility: 'internal',
    });

    return json({ success: true, suppressed: false });
  } catch (error) {
    console.error('trigger-welcome-call-sms error:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
