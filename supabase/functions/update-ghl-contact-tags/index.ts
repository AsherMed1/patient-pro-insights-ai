import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APPROVED_TAG = 'approved';

// Adds or removes tags on a GHL contact.
// Body: { ghl_contact_id, ghl_api_key?, tags: string[], action: 'add' | 'remove', source?: string }
//
// Guard: the 'approved' tag is what releases a GHL workflow to notify the clinic.
// It must never be pushed while the appointment is still sitting in the Review
// Queue. Every approved-tag push (allowed or blocked) is written to
// appointment_notes so the origin is provable after the fact.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ghl_contact_id, ghl_api_key, tags, action, source } = await req.json();

    if (!ghl_contact_id) {
      return new Response(
        JSON.stringify({ error: 'Missing ghl_contact_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return new Response(
        JSON.stringify({ error: 'tags must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const op = action === 'remove' ? 'remove' : 'add';
    const origin = typeof source === 'string' && source.trim() ? source.trim() : 'unspecified caller';
    const pushesApproved =
      op === 'add' && tags.some((t: unknown) => String(t).toLowerCase().trim() === APPROVED_TAG);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const logToAppointment = async (appointmentId: string | null, text: string) => {
      if (!appointmentId) return;
      try {
        await supabase.from('appointment_notes').insert({
          appointment_id: appointmentId,
          note_text: text,
          created_by: 'System',
        });
      } catch (e) {
        console.error('failed to write tag audit note:', e);
      }
    };

    // ---- approved-tag guard -------------------------------------------------
    let auditAppointmentId: string | null = null;
    if (pushesApproved) {
      const { data: rows, error: lookupErr } = await supabase
        .from('all_appointments')
        .select('id, review_status, lead_name, created_at')
        .eq('ghl_id', ghl_contact_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (lookupErr) {
        console.error('approved-tag guard lookup failed:', lookupErr);
      } else if (rows && rows.length > 0) {
        const approvedRow = rows.find(
          (r) => String(r.review_status || '').toLowerCase().trim() === 'approved',
        );
        auditAppointmentId = (approvedRow || rows[0]).id;

        if (!approvedRow) {
          const statuses = rows.map((r) => r.review_status || 'null').join(', ');
          const msg =
            `Blocked "approved" GHL tag push from ${origin}: no approved appointment ` +
            `exists for this contact (review statuses: ${statuses}). The clinic must not ` +
            `be alerted while the appointment is still in the Review Queue.`;
          console.error(`[tag-guard] ${msg}`);
          await logToAppointment(auditAppointmentId, msg);
          return new Response(
            JSON.stringify({ error: 'approved tag blocked: appointment is not approved', blocked: true }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const apiKey = ghl_api_key || Deno.env.get('GHL_LOCATION_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GHL API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = `https://services.leadconnectorhq.com/contacts/${ghl_contact_id}/tags`;
    const method = op === 'add' ? 'POST' : 'DELETE';

    console.log(`GHL contact tags ${op} (source=${origin}):`, { ghl_contact_id, tags });

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL tags API error:', response.status, errorText);
      if (pushesApproved) {
        await logToAppointment(
          auditAppointmentId,
          `"approved" GHL tag push from ${origin} FAILED (${response.status}). It will be retried by the hourly sweep.`,
        );
      }
      return new Response(
        JSON.stringify({ error: 'Failed to update GHL contact tags', details: errorText, status: response.status }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json().catch(() => ({}));
    console.log('GHL tags update success:', result);

    if (pushesApproved) {
      await logToAppointment(
        auditAppointmentId,
        `"approved" tag added to the GHL contact by ${origin}. This releases the clinic notification workflow in GHL.`,
      );
    }

    return new Response(
      JSON.stringify({ success: true, contact_id: ghl_contact_id, action: op, tags }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-ghl-contact-tags:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
