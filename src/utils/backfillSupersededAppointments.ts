import { supabase } from '@/integrations/supabase/client';

/**
 * Backfill the `is_superseded` flag on existing all_appointments rows.
 *
 * Logic mirrors the `mark_superseded_on_change` trigger:
 * For every (project_name + ghl_id [or lead_phone_number+lead_name]) group:
 *   - if there exists a non-terminal record AND older terminal records also exist
 *     for the same patient, the older terminal records get is_superseded = true.
 *   - records with was_ever_confirmed = true are NEVER superseded.
 *   - reserved time blocks are excluded.
 *
 * Run from the browser console while logged in as an admin:
 *   import('@/utils/backfillSupersededAppointments').then(m => m.backfillSupersededAppointments({ dryRun: true }))
 *   // review the report, then:
 *   import('@/utils/backfillSupersededAppointments').then(m => m.backfillSupersededAppointments({ dryRun: false }))
 */

const TERMINAL = new Set([
  'cancelled', 'canceled',
  'no show', 'noshow', 'no-show',
  'rescheduled',
  'do not call', 'donotcall',
  'oon',
]);

interface ApptRow {
  id: string;
  project_name: string;
  ghl_id: string | null;
  lead_name: string | null;
  lead_phone_number: string | null;
  status: string | null;
  created_at: string;
  was_ever_confirmed: boolean | null;
  is_reserved_block: boolean | null;
  is_superseded: boolean | null;
}

const isTerminal = (s: string | null) => {
  if (!s) return false;
  return TERMINAL.has(s.toLowerCase().trim());
};

const groupKey = (r: ApptRow): string | null => {
  if (r.ghl_id) return `${r.project_name}::ghl::${r.ghl_id}`;
  if (r.lead_phone_number && r.lead_name) {
    return `${r.project_name}::np::${r.lead_phone_number.trim()}::${r.lead_name.toLowerCase().trim()}`;
  }
  return null;
};

export async function backfillSupersededAppointments(opts: { dryRun?: boolean } = {}) {
  const dryRun = opts.dryRun !== false; // default true
  console.log(`🔍 Backfill starting — dryRun=${dryRun}`);

  // Page through all_appointments (Supabase 1000-row default limit)
  const all: ApptRow[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('all_appointments')
      .select('id, project_name, ghl_id, lead_name, lead_phone_number, status, created_at, was_ever_confirmed, is_reserved_block, is_superseded')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as ApptRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`📦 Loaded ${all.length} appointment rows`);

  // Bucket by group key
  const buckets = new Map<string, ApptRow[]>();
  for (const r of all) {
    if (r.is_reserved_block) continue;
    const k = groupKey(r);
    if (!k) continue;
    const arr = buckets.get(k) || [];
    arr.push(r);
    buckets.set(k, arr);
  }

  // Find rows to mark superseded
  const toMark: ApptRow[] = [];
  const perProject: Record<string, number> = {};
  for (const [, rows] of buckets) {
    if (rows.length < 2) continue;
    rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const hasActiveNewer = (idx: number) =>
      rows.slice(idx + 1).some(r => !isTerminal(r.status));
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.is_superseded) continue;
      if (r.was_ever_confirmed) continue;
      if (!isTerminal(r.status)) continue;
      if (!hasActiveNewer(i)) continue;
      toMark.push(r);
      perProject[r.project_name] = (perProject[r.project_name] || 0) + 1;
    }
  }

  console.log(`📊 Records to mark superseded: ${toMark.length}`);
  console.table(perProject);

  if (dryRun) {
    console.log('✅ Dry run complete. To execute:');
    console.log("  import('@/utils/backfillSupersededAppointments').then(m => m.backfillSupersededAppointments({ dryRun: false }))");
    return { dryRun: true, count: toMark.length, perProject, sample: toMark.slice(0, 25) };
  }

  // Execute updates in chunks of 100
  let updated = 0;
  for (let i = 0; i < toMark.length; i += 100) {
    const chunk = toMark.slice(i, i + 100);
    const ids = chunk.map(r => r.id);
    const { error } = await supabase
      .from('all_appointments')
      .update({ is_superseded: true, updated_at: new Date().toISOString() })
      .in('id', ids);
    if (error) {
      console.error('Chunk update failed', error);
      throw error;
    }
    updated += chunk.length;
    console.log(`   ...updated ${updated}/${toMark.length}`);
  }

  console.log(`✅ Backfill complete — ${updated} rows marked superseded`);
  return { dryRun: false, count: updated, perProject };
}

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).backfillSupersededAppointments = backfillSupersededAppointments;
}
