import { supabase } from '@/integrations/supabase/client';

/**
 * One-time restore for Vascular Institute of Michigan patients whose GHL appointment
 * events were silently auto-cancelled when a clinic block was placed over their slot
 * on Apr 21. Their PORTAL records still show "Welcome Call" — only the GHL side desynced.
 *
 * Affected:
 *  - Penny Walt   — May 5, 8:00 AM   — Flint, MI
 *  - Richard Morgan — May 18, 11:00 AM — Flint, MI
 *
 * Run from browser console:
 *   import('@/utils/restoreVimMayBlockVictims').then(m => m.restoreVimMayBlockVictims())
 */

const PROJECT_NAME = 'Vascular Institute of Michigan';

const VICTIMS = [
  { name: 'Penny Walt' },
  { name: 'Richard Morgan' },
] as const;

const INTERNAL_NOTE =
  'GHL event auto-cancelled by clinic block on Apr 21 — restored by support. ' +
  'Underlying bug fixed in block conflict scanner (hard-conflict pre-flight check now blocks overlapping confirmed appointments).';

export async function restoreVimMayBlockVictims() {
  console.group('[restoreVimMayBlockVictims] Starting GHL restore');
  const results: Array<{
    name: string;
    status: 'success' | 'skipped' | 'error';
    detail: string;
    ghlResponse?: unknown;
  }> = [];

  for (const victim of VICTIMS) {
    console.group(`[restoreVimMayBlockVictims] ${victim.name}`);

    try {
      // Pull the appointment record
      const { data: rows, error: fetchErr } = await supabase
        .from('all_appointments')
        .select(
          'id, lead_name, status, date_of_appointment, requested_time, ghl_appointment_id, calendar_name'
        )
        .eq('project_name', PROJECT_NAME)
        .ilike('lead_name', victim.name)
        .order('date_of_appointment', { ascending: true });

      if (fetchErr) {
        console.error('Fetch failed:', fetchErr);
        results.push({ name: victim.name, status: 'error', detail: fetchErr.message });
        console.groupEnd();
        continue;
      }

      if (!rows || rows.length === 0) {
        console.warn('No appointment found in portal');
        results.push({ name: victim.name, status: 'skipped', detail: 'No portal record found' });
        console.groupEnd();
        continue;
      }

      // Take the most relevant non-terminal record (Welcome Call / Confirmed)
      const record =
        rows.find(
          (r) =>
            !['cancelled', 'canceled', 'no show', 'noshow', 'showed', 'oon', 'rescheduled'].includes(
              (r.status || '').toString().trim().toLowerCase()
            )
        ) || rows[0];

      console.log('Target portal record:', {
        id: record.id,
        status: record.status,
        date: record.date_of_appointment,
        time: record.requested_time,
        ghl_appointment_id: record.ghl_appointment_id,
        calendar: record.calendar_name,
      });

      if (!record.ghl_appointment_id) {
        const detail = `No ghl_appointment_id on record ${record.id} — clinic must recreate event manually in GHL.`;
        console.warn(detail);
        results.push({ name: victim.name, status: 'skipped', detail });
        console.groupEnd();
        continue;
      }

      // Push status = Confirmed back to GHL. update-ghl-appointment will resolve
      // the project's API key + location automatically.
      const { data: ghlResp, error: ghlErr } = await supabase.functions.invoke(
        'update-ghl-appointment',
        {
          body: {
            ghl_appointment_id: record.ghl_appointment_id,
            project_name: PROJECT_NAME,
            status: 'Confirmed',
          },
        }
      );

      if (ghlErr) {
        console.error('GHL update failed:', ghlErr);
        results.push({
          name: victim.name,
          status: 'error',
          detail: ghlErr.message || 'GHL function invoke failed',
          ghlResponse: ghlResp,
        });
        console.groupEnd();
        continue;
      }

      console.log('GHL response:', ghlResp);

      // Append internal note for the audit trail
      const { error: noteErr } = await supabase.from('appointment_notes').insert({
        appointment_id: record.id,
        note_text: INTERNAL_NOTE,
      });

      if (noteErr) {
        console.warn('Failed to insert internal note (restore still succeeded):', noteErr);
      }

      results.push({
        name: victim.name,
        status: 'success',
        detail: `GHL event ${record.ghl_appointment_id} re-confirmed`,
        ghlResponse: ghlResp,
      });
    } catch (err) {
      console.error('Unexpected error:', err);
      results.push({
        name: victim.name,
        status: 'error',
        detail: err instanceof Error ? err.message : String(err),
      });
    }

    console.groupEnd();
  }

  console.table(results.map((r) => ({ name: r.name, status: r.status, detail: r.detail })));
  console.groupEnd();
  return results;
}
