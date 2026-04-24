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
}): Promise<BlockConflictScanResult> {
  const empty: BlockConflictScanResult = { hardConflicts: [], softConflicts: [] };
  const { projectName, dateStr, timeRanges, calendarNames } = params;

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

  const hardConflicts: BlockConflict[] = [];
  const softConflicts: BlockConflict[] = [];

  for (const row of data as any[]) {
    if (row.is_reserved_block === true) continue;

    const apptMinutes = timeToMinutes(row.requested_time);
    if (apptMinutes === null) continue;

    const overlaps = rangeBounds.some((r) => apptMinutes >= r.start && apptMinutes < r.end);
    if (!overlaps) continue;

    const status = (row.status || '').toString().trim().toLowerCase();

    // Skip terminal — those are already "settled"; GHL won't re-cancel a cancelled event.
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
    } else {
      // Confirmed, Welcome Call, Scheduled, or anything else non-terminal
      // → GHL will silently cancel these. Hard block.
      hardConflicts.push(conflict);
    }
  }

  return { hardConflicts, softConflicts };
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
