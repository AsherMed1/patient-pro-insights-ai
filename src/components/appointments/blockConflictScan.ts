import { supabase } from '@/integrations/supabase/client';

export interface BlockTimeRange {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface BlockConflict {
  id: string;
  lead_name: string;
  lead_phone_number: string | null;
  requested_time: string | null;
  status: string | null;
  calendar_name: string | null;
  ghl_appointment_id: string | null;
  ghl_id: string | null;
  date_of_appointment: string | null;
  was_ever_confirmed?: boolean;
}

export interface BlockConflictScanResult {
  hardConflicts: BlockConflict[];
  softConflicts: BlockConflict[];
  /**
   * Confirmed-tier appointments that overlap the block window but sit on a
   * calendar with `appointmentPerSlot > 1` (double-booking) AND still have
   * spare slot capacity after adding the block. GHL will NOT cancel these —
   * they safely coexist with the reserved block. Shown to the user as an
   * FYI but do NOT block submission and are never auto-cancelled.
   */
  coexistConflicts: BlockConflict[];
}

/**
 * Terminal statuses — these appointments are "done" and won't be silently cancelled by GHL
 * because the GHL event is already in a terminal state too. Safe to ignore for block conflicts.
 * Source: mem://data-integrity/terminal-status-definition
 */
const TERMINAL_STATUSES = new Set([
  'cancelled',
  'canceled',
  'no show',
  'noshow',
  'no-show',
  'showed',
  'won',
  'oon',
  'do not call',
  'donotcall',
  'rescheduled',
]);

/**
 * Soft-conflict statuses — truly unconfirmed. Existing UX (auto-cancel + SMS) handles these.
 */
const SOFT_STATUSES = new Set(['', 'pending']);

/**
 * Convert "HH:mm" or "HH:mm:ss" to total minutes.
 * Returns null on parse failure.
 */
function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (isNaN(h) || isNaN(mm)) return null;
  return h * 60 + mm;
}

/**
 * Find appointments that overlap with the proposed block.
 * - Same project
 * - Same calendar (matched by calendar_name)
 * - Same date (date_of_appointment YYYY-MM-DD)
 * - requested_time falls inside any of the time ranges
 * - is_reserved_block is not true (don't recursively cancel other blocks)
 *
 * Returns two arrays:
 * - hardConflicts: confirmed-tier appointments (Welcome Call, Confirmed, Scheduled, was_ever_confirmed=true).
 *   These would be SILENTLY CANCELLED by GHL's block-slots endpoint — must be resolved before block creation.
 * - softConflicts: unconfirmed appointments (status '' or 'pending'). Existing auto-cancel flow.
 */
export async function scanBlockConflicts(params: {
  projectName: string;
  dateStr: string; // 'YYYY-MM-DD'
  timeRanges: BlockTimeRange[];
  calendarNames: string[];
  /**
   * Optional map of calendar name → `appointmentPerSlot` (GHL double-booking capacity).
   * When capacity > 1 and the resulting slot occupancy (existing appts + the new block)
   * stays within capacity, confirmed overlaps are downgraded from hard → coexist.
   * Missing entries default to 1 (single-booking, current behavior preserved).
   */
  calendarCapacityByName?: Record<string, number>;
}): Promise<BlockConflictScanResult> {
  const empty: BlockConflictScanResult = {
    hardConflicts: [],
    softConflicts: [],
    coexistConflicts: [],
  };
  const { projectName, dateStr, timeRanges, calendarNames, calendarCapacityByName } = params;

  if (!projectName || !dateStr || !calendarNames.length || !timeRanges.length) {
    return empty;
  }

  // Pull candidates: same project, same date, matching calendar names.
  // Include reserved_end_time so full-day blocks are tallied across every
  // slot they cover, not just at their start time.
  const { data, error } = await supabase
    .from('all_appointments')
    .select('id, lead_name, lead_phone_number, requested_time, reserved_end_time, status, calendar_name, ghl_appointment_id, ghl_id, date_of_appointment, is_reserved_block, was_ever_confirmed')
    .eq('project_name', projectName)
    .gte('date_of_appointment', `${dateStr}T00:00:00`)
    .lte('date_of_appointment', `${dateStr}T23:59:59`)
    .in('calendar_name', calendarNames);

  if (error) {
    console.error('[blockConflictScan] Query failed:', error);
    return empty;
  }

  if (!data || data.length === 0) return empty;

  // Pre-compute range bounds in minutes
  const rangeBounds = timeRanges
    .map((r) => ({
      start: timeToMinutes(r.startTime),
      end: timeToMinutes(r.endTime),
    }))
    .filter((r): r is { start: number; end: number } => r.start !== null && r.end !== null);

  // Partition rows by calendar into blocks (with their [start,end) range)
  // and patient candidates. Only include rows that touch the new block window.
  interface BlockRange { startMin: number; endMin: number; row: any }
  interface PatientRow {
    row: any;
    conflict: BlockConflict;
    status: string;
    slotMin: number;
    calName: string;
  }
  const blocksByCal: Map<string, BlockRange[]> = new Map();
  const patients: PatientRow[] = [];

  for (const row of data as any[]) {
    const calName = row.calendar_name || '';
    const startMin = timeToMinutes(row.requested_time);
    if (startMin === null) continue;

    if (row.is_reserved_block === true) {
      // Use reserved_end_time when present; otherwise treat as a single
      // slot occupancy at start (fallback matches legacy behavior).
      const endMinRaw = timeToMinutes(row.reserved_end_time);
      const endMin = endMinRaw !== null && endMinRaw > startMin ? endMinRaw : startMin + 1;
      // Skip blocks that don't overlap ANY of the new-block ranges.
      const touches = rangeBounds.some((r) => startMin < r.end && endMin > r.start);
      if (!touches) continue;
      const list = blocksByCal.get(calName) || [];
      list.push({ startMin, endMin, row });
      blocksByCal.set(calName, list);
      continue;
    }

    // Patient candidate — only overlaps if requested_time falls inside a range.
    const overlaps = rangeBounds.some((r) => startMin >= r.start && startMin < r.end);
    if (!overlaps) continue;

    const status = (row.status || '').toString().trim().toLowerCase();
    if (TERMINAL_STATUSES.has(status)) continue;

    const conflict: BlockConflict = {
      id: row.id,
      lead_name: row.lead_name,
      lead_phone_number: row.lead_phone_number,
      requested_time: row.requested_time,
      status: row.status,
      calendar_name: row.calendar_name,
      ghl_appointment_id: row.ghl_appointment_id,
      ghl_id: row.ghl_id,
      date_of_appointment: row.date_of_appointment,
      was_ever_confirmed: row.was_ever_confirmed === true,
    };

    patients.push({ row, conflict, status, slotMin: startMin, calName });
  }

  // Helpers — occupancy at a specific slot time T on a calendar.
  const patientsAt = (calName: string, T: number): number =>
    patients.filter((p) => p.calName === calName && p.slotMin === T).length;
  const blocksCovering = (calName: string, T: number): number => {
    const list = blocksByCal.get(calName) || [];
    return list.filter((b) => T >= b.startMin && T < b.endMin).length;
  };

  const formatMin = (m: number): string => {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const hardConflicts: BlockConflict[] = [];
  const softConflicts: BlockConflict[] = [];
  const coexistConflicts: BlockConflict[] = [];
  const slotsWithHard = new Set<string>(); // key: cal::T
  const emittedBlockRowIds = new Set<string>();

  // Emit companion informational rows for existing blocks covering slot T,
  // so users can see the full picture (1 appt + 1 reserved block = 2/2 full).
  const emitCoveringBlockCompanions = (calName: string, T: number) => {
    const list = blocksByCal.get(calName) || [];
    for (const b of list) {
      if (!(T >= b.startMin && T < b.endMin)) continue;
      if (emittedBlockRowIds.has(b.row.id)) continue;
      emittedBlockRowIds.add(b.row.id);
      hardConflicts.push({
        id: `block-existing::${b.row.id}`,
        lead_name: b.row.lead_name || 'Reserved block',
        lead_phone_number: null,
        requested_time: b.row.requested_time,
        status: 'Reserved block',
        calendar_name: b.row.calendar_name,
        ghl_appointment_id: null,
        ghl_id: null,
        date_of_appointment: b.row.date_of_appointment,
        was_ever_confirmed: false,
      });
    }
  };

  for (const p of patients) {
    if (SOFT_STATUSES.has(p.status)) {
      if (p.conflict.was_ever_confirmed) {
        hardConflicts.push(p.conflict);
        slotsWithHard.add(`${p.calName}::${p.slotMin}`);
        if (blocksCovering(p.calName, p.slotMin) > 0) {
          emitCoveringBlockCompanions(p.calName, p.slotMin);
        }
      } else {
        softConflicts.push(p.conflict);
      }
      continue;
    }

    const capacity =
      (calendarCapacityByName && p.calName && calendarCapacityByName[p.calName]) || 1;
    const patientsHere = patientsAt(p.calName, p.slotMin);
    const blocksHere = blocksCovering(p.calName, p.slotMin);
    // +1 for the new block itself occupying that slot.
    const projected = patientsHere + blocksHere + 1;
    if (capacity > 1 && projected <= capacity) {
      coexistConflicts.push(p.conflict);
    } else {
      hardConflicts.push(p.conflict);
      slotsWithHard.add(`${p.calName}::${p.slotMin}`);
      if (blocksHere > 0) {
        emitCoveringBlockCompanions(p.calName, p.slotMin);
      }
    }
  }

  // Synthesize saturation rows for every slot inside the new-block window
  // where (patients_at_T + blocks_covering_T + 1) > capacity but no patient
  // hard-conflict has already been recorded for that slot. We check patient
  // slot times AND every existing block's start time as candidate T values
  // — those are the only points where occupancy can change.
  const seenSaturated = new Set<string>();
  for (const [calName, blocks] of blocksByCal.entries()) {
    const capacity =
      (calendarCapacityByName && calName && calendarCapacityByName[calName]) || 1;
    const candidateTs = new Set<number>();
    for (const b of blocks) candidateTs.add(b.startMin);
    for (const p of patients) if (p.calName === calName) candidateTs.add(p.slotMin);

    for (const T of candidateTs) {
      // Only report saturation at slots the new block would actually occupy.
      const insideNewBlock = rangeBounds.some((r) => T >= r.start && T < r.end);
      if (!insideNewBlock) continue;
      const slotKey = `${calName}::${T}`;
      if (slotsWithHard.has(slotKey)) continue;
      if (seenSaturated.has(slotKey)) continue;

      const patientsHere = patientsAt(calName, T);
      const blocksHere = blocksCovering(calName, T);
      const total = patientsHere + blocksHere;
      if (total + 1 <= capacity) continue;

      seenSaturated.add(slotKey);
      const sample = blocks.find((b) => T >= b.startMin && T < b.endMin)?.row || blocks[0].row;
      const blockLabel = `${blocksHere} reserved block${blocksHere === 1 ? '' : 's'} covering ${formatMin(T)}`;
      const patientLabel = patientsHere > 0
        ? `${patientsHere} appointment${patientsHere === 1 ? '' : 's'} + `
        : '';
      hardConflicts.push({
        id: `block-cap::${slotKey}`,
        lead_name: `Slot already full (${total}/${capacity} — ${patientLabel}${blockLabel})`,
        lead_phone_number: null,
        requested_time: formatMin(T),
        status: 'Reserved block',
        calendar_name: calName,
        ghl_appointment_id: null,
        ghl_id: null,
        date_of_appointment: sample.date_of_appointment,
        was_ever_confirmed: false,
      });
    }
  }




  return { hardConflicts, softConflicts, coexistConflicts };
}


/**
 * Format "HH:mm" → "9:30 AM"
 */
export function formatRequestedTime(time: string | null): string {
  if (!time) return '—';
  const m = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!m) return time;
  const h = parseInt(m[1], 10);
  const mm = m[2];
  const ampm = h < 12 ? 'AM' : 'PM';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${mm} ${ampm}`;
}
