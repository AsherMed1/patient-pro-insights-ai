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

  // Pull candidates: same project, same date, matching calendar names, not a reserved block.
  const { data, error } = await supabase
    .from('all_appointments')
    .select('id, lead_name, lead_phone_number, requested_time, status, calendar_name, ghl_appointment_id, ghl_id, date_of_appointment, is_reserved_block, was_ever_confirmed')
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

  // First pass: collect every non-terminal, non-block appt that overlaps the window,
  // grouped by (calendar_name, requested_time) so we can measure per-slot occupancy.
  interface Candidate {
    row: any;
    conflict: BlockConflict;
    status: string;
    slotKey: string;
  }
  const candidates: Candidate[] = [];
  const slotOccupancy: Map<string, number> = new Map();

  for (const row of data as any[]) {
    if (row.is_reserved_block === true) continue;

    const apptMinutes = timeToMinutes(row.requested_time);
    if (apptMinutes === null) continue;

    const overlaps = rangeBounds.some((r) => apptMinutes >= r.start && apptMinutes < r.end);
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

    const slotKey = `${row.calendar_name || ''}::${row.requested_time || ''}`;
    slotOccupancy.set(slotKey, (slotOccupancy.get(slotKey) || 0) + 1);
    candidates.push({ row, conflict, status, slotKey });
  }

  const hardConflicts: BlockConflict[] = [];
  const softConflicts: BlockConflict[] = [];
  const coexistConflicts: BlockConflict[] = [];

  for (const { conflict, status, slotKey, row } of candidates) {
    if (SOFT_STATUSES.has(status)) {
      // Truly unconfirmed → existing auto-cancel flow is fine.
      // EXCEPT: if this row was ever confirmed before being moved back to pending,
      // it represents a real patient that GHL would silently cancel. Promote to hard.
      // (See incident: VIM time-block cancellations 2026-04-21.)
      if (conflict.was_ever_confirmed) {
        hardConflicts.push(conflict);
      } else {
        softConflicts.push(conflict);
      }
      continue;
    }

    // Confirmed-tier overlap. Check per-slot capacity on this calendar.
    const capacity =
      (calendarCapacityByName && row.calendar_name && calendarCapacityByName[row.calendar_name]) ||
      1;
    const existingInSlot = slotOccupancy.get(slotKey) || 1;
    // +1 for the new block itself occupying that slot.
    if (capacity > 1 && existingInSlot + 1 <= capacity) {
      coexistConflicts.push(conflict);
    } else {
      hardConflicts.push(conflict);
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
