import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  loadBlockRules,
  evaluateRules,
  extractInsuranceValues,
  evaluateAllowlist,
  loadSupportedInsurances,
  loadOonMode,
} from '../_shared/oon-matcher.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Evaluates one appointment (or a batch) against the Potential-OON block rules.
 * - Flags the appointment (potential_oon + matches).
 * - Setter-submitted / already-approved rows are pulled back to a QA hold, a QA
 *   Operations case is opened and Slack is alerted.
 * - Patient-submitted rows simply carry the flag; the Review Queue blocks approval.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = body.appointment_id ? [body.appointment_id] : (body.appointment_ids || []);
    if (!ids.length) {
      return new Response(JSON.stringify({ error: 'appointment_id or appointment_ids required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rules = await loadBlockRules(supabase);
    const { data: appts, error } = await supabase
      .from('all_appointments')
      .select('*')
      .in('id', ids);
    if (error) throw error;

    const results: any[] = [];

    for (const appt of appts || []) {
      const { plans, groupNumbers } = extractInsuranceValues(appt);
      const matches = evaluateRules(rules, {
        projectName: appt.project_name,
        location: appt.calendar_name,
        calendarName: appt.calendar_name,
        plans,
        groupNumbers,
      });

      if (!matches.length) {
        results.push({ id: appt.id, flagged: false });
        continue;
      }

      // Already flagged and unresolved — nothing new to do.
      if (appt.potential_oon && !appt.potential_oon_resolved_at) {
        results.push({ id: appt.id, flagged: true, alreadyFlagged: true });
        continue;
      }
      // Previously resolved by a human — do not re-flag on the same rules.
      if (appt.potential_oon_resolved_at) {
        results.push({ id: appt.id, flagged: false, previouslyResolved: true });
        continue;
      }

      const wasClientFacing = appt.review_status === 'approved';
      const update: Record<string, unknown> = {
        potential_oon: true,
        potential_oon_matches: matches,
        potential_oon_flagged_at: new Date().toISOString(),
      };
      if (wasClientFacing) {
        // Hold it back from the client portal until QA verifies.
        update.review_status = 'pending';
        update.review_stage = 'qa_hold';
      }

      await supabase.from('all_appointments').update(update).eq('id', appt.id);

      const summary = matches
        .map((m) => `${m.matched_on === 'group' ? 'Group #' : 'Plan'} "${m.matched_value}"${m.plan_name ? ` → ${m.plan_name}` : ''}`)
        .join('; ');

      await supabase.from('appointment_notes').insert({
        appointment_id: appt.id,
        note_text: `Potential OON insurance detected — ${summary}. Held for QA insurance verification.`,
      }).then(({ error: nErr }) => { if (nErr) console.error('note insert failed:', nErr); });

      if (wasClientFacing) {
        // Setter-booked route: open a QA Operations case + Slack alert.
        try {
          await supabase.rpc('qa_upsert_case', {
            _appointment_id: appt.id,
            _ghl_contact_id: appt.ghl_id,
            _project_name: appt.project_name,
            _patient_name: appt.lead_name,
            _service_line: appt.calendar_name,
            _appointment_date: appt.date_of_appointment
              ? new Date(`${appt.date_of_appointment}T${appt.requested_time || '09:00'}`).toISOString()
              : null,
            _appointment_status: appt.status,
            _alert_type: 'potential_oon',
            _alert_source_id: null,
            _activity_description: `Potential OON insurance flagged — ${summary}`,
          });
        } catch (e) {
          console.error('qa_upsert_case failed:', e);
        }

        supabase.functions.invoke('notify-slack-potential-oon', {
          body: {
            appointmentId: appt.id,
            projectName: appt.project_name,
            leadName: appt.lead_name,
            phone: appt.lead_phone_number,
            calendarName: appt.calendar_name,
            appointmentDate: appt.date_of_appointment,
            route: 'setter',
            matches,
          },
        }).catch((e) => console.error('potential-oon Slack invoke failed:', e));
      }

      results.push({ id: appt.id, flagged: true, heldForQA: wasClientFacing, matches });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[evaluate-potential-oon] error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
