/**
 * Shared short-notice math for the portal.
 *
 * Mirrors `calculateBusinessHours` / `localDatetimeToUTC` in the
 * ghl-webhook-handler edge function so the countdown shown in the Review Queue
 * and the alert fired by the backend always agree.
 */

const STD_OFFSETS: Record<string, [number, number]> = {
  'America/New_York': [-5, -4],
  'America/Chicago': [-6, -5],
  'America/Denver': [-7, -6],
  'America/Phoenix': [-7, -7],
  'America/Los_Angeles': [-8, -7],
  'America/Anchorage': [-9, -8],
  'Pacific/Honolulu': [-10, -10],
};

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): number {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (weekday - first + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}

function isUSDST(year: number, month: number, day: number): boolean {
  const marStart = nthWeekdayOfMonth(year, 3, 0, 2); // 2nd Sunday of March
  const novEnd = nthWeekdayOfMonth(year, 11, 0, 1); // 1st Sunday of November
  if (month < 3 || month > 11) return false;
  if (month > 3 && month < 11) return true;
  if (month === 3) return day >= marStart;
  return day < novEnd;
}

function getTimezoneOffset(timezone: string, year: number, month: number, day: number): number {
  const offsets = STD_OFFSETS[timezone];
  if (!offsets) return -6;
  return isUSDST(year, month, day) ? offsets[1] : offsets[0];
}

/** Convert a naive clinic-local date/time into a real UTC instant. */
export function localDatetimeToUTC(dateStr: string, timeStr: string | null, timezone: string): Date {
  const naive = `${dateStr}T${timeStr || '09:00:00'}`;
  const [y, m, d] = dateStr.split('-').map(n => parseInt(n, 10));
  const offsetHours = getTimezoneOffset(timezone, y, m, d);
  return new Date(new Date(naive + 'Z').getTime() - offsetHours * 3600000);
}

/** Hours between two instants, excluding Saturday and Sunday. */
export function calculateBusinessHours(start: Date, end: Date): number {
  if (end.getTime() <= start.getTime()) return 0;
  let total = 0;
  const cursor = new Date(start.getTime());
  const HOUR = 3600000;
  while (cursor.getTime() < end.getTime()) {
    const nextHour = Math.min(cursor.getTime() + HOUR, end.getTime());
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      total += (nextHour - cursor.getTime()) / HOUR;
    }
    cursor.setTime(nextHour);
  }
  return total;
}

export interface ShortNoticeStatus {
  /** Business hours of notice remaining between now and the appointment. */
  hoursOfNotice: number;
  /** Business hours left before the appointment crosses the clinic threshold. */
  hoursUntilThreshold: number;
  /** Already inside the clinic's short-notice window. */
  isShortNotice: boolean;
  /** Close to the threshold (under 8 business hours) but not yet inside it. */
  isApproaching: boolean;
}

/**
 * Compute where an appointment sits relative to a clinic's short-notice window,
 * measured from `now` (not from the booking time).
 */
export function getShortNoticeStatus(
  dateOfAppointment: string | null,
  requestedTime: string | null,
  thresholdHours: number,
  timezone: string,
  now: Date = new Date()
): ShortNoticeStatus | null {
  if (!dateOfAppointment || !thresholdHours || thresholdHours <= 0) return null;
  const apptUtc = localDatetimeToUTC(dateOfAppointment.slice(0, 10), requestedTime, timezone || 'America/Chicago');
  if (isNaN(apptUtc.getTime())) return null;
  const hoursOfNotice = calculateBusinessHours(now, apptUtc);
  const hoursUntilThreshold = hoursOfNotice - thresholdHours;
  return {
    hoursOfNotice,
    hoursUntilThreshold,
    isShortNotice: hoursUntilThreshold <= 0,
    isApproaching: hoursUntilThreshold > 0 && hoursUntilThreshold <= 8,
  };
}

/** Format a business-hour amount as `1d 6h` / `6h 30m` / `45m`. */
export function formatBusinessHours(hours: number): string {
  const total = Math.max(0, hours);
  if (total < 1) return `${Math.max(1, Math.round(total * 60))}m`;
  const days = Math.floor(total / 24);
  const rem = total - days * 24;
  const h = Math.floor(rem);
  if (days > 0) return `${days}d ${h}h`;
  const mins = Math.round((rem - h) * 60);
  return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
}

/** Elapsed wall-clock age, e.g. `3d 4h` / `5h` / `20m`. */
export function formatAge(fromIso: string | null | undefined, now: Date = new Date()): string {
  if (!fromIso) return '—';
  const from = new Date(fromIso);
  if (isNaN(from.getTime())) return '—';
  const mins = Math.max(0, Math.round((now.getTime() - from.getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/** Business hours elapsed since an ISO timestamp. */
export function businessHoursSince(fromIso: string | null | undefined, now: Date = new Date()): number | null {
  if (!fromIso) return null;
  const from = new Date(fromIso);
  if (isNaN(from.getTime())) return null;
  return calculateBusinessHours(from, now);
}

/** Follow-up interval (business hours) after which a Pending record is stale. */
export const PENDING_FOLLOWUP_BUSINESS_HOURS = 24;

/**
 * Sibling-derived contact older than this is ignored — outreach on a closed
 * record months ago is not "last contact" on today's booking.
 */
export const MAX_CONTACT_AGE_DAYS = 45;

const SYSTEM_AUTHORS = new Set([
  'system', 'review queue', 'support', 'gohighlevel', 'ghl', 'highlevel',
  'bot', 'workflow', 'webhook', 'unknown',
]);

/** Notes written by the system rather than a person contacting the patient. */
export function isSystemNote(note: { note_text?: string | null; created_by?: string | null }): boolean {
  const author = (note.created_by || '').trim().toLowerCase();
  const text = (note.note_text || '').trim().toLowerCase();
  if (!author || SYSTEM_AUTHORS.has(author)) return true;
  if (author.includes('automation') || author.includes('gohighlevel') || author.includes('highlevel')) return true;
  return (
    text.startsWith('review queue:') ||
    text.startsWith('status changed') ||
    text.startsWith('system:') ||
    text.startsWith('auto') ||
    text.startsWith('rescheduled |') ||
    text.startsWith('superseded') ||
    text.startsWith('cancellation reason:') ||
    text.startsWith('"approved" tag')
  );
}


/* ------------------------------------------------------------------ *
 * Per-clinic notice rules (service line / location overrides)
 * Mirrored in supabase/functions/_shared/short-notice-rules.ts
 * ------------------------------------------------------------------ */

export interface ShortNoticeRule {
  id?: string;
  project_name?: string | null;
  service_line?: string | null;
  location?: string | null;
  threshold_hours: number;
  is_active?: boolean | null;
  note?: string | null;
}

export interface ShortNoticeRuleInput {
  serviceLine?: string | null;
  location?: string | null;
  calendarName?: string | null;
}

export interface ResolvedShortNotice {
  thresholdHours: number;
  rule: ShortNoticeRule | null;
  serviceLine: string | null;
  location: string | null;
}

const normalizeToken = (value: unknown): string =>
  typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : '';

/**
 * Pick the notice threshold that applies to one appointment.
 * Most specific wins: service line + location > service line > location > account default.
 */
export function resolveShortNoticeThreshold(
  rules: ShortNoticeRule[] | null | undefined,
  input: ShortNoticeRuleInput,
  accountDefault: number,
): ResolvedShortNotice {
  const service = normalizeToken(input.serviceLine);
  const calendar = normalizeToken(input.calendarName);
  const location = normalizeToken(input.location) || calendar;

  let best: { rule: ShortNoticeRule; score: number } | null = null;

  for (const rule of rules || []) {
    if (rule.is_active === false) continue;
    if (!rule.threshold_hours || rule.threshold_hours <= 0) continue;

    let score = 0;
    if (rule.service_line) {
      const term = normalizeToken(rule.service_line);
      const hit = (service && (service === term || service.includes(term))) || (calendar && calendar.includes(term));
      if (!hit) continue;
      score += 2;
    }
    if (rule.location) {
      const term = normalizeToken(rule.location);
      if (!term) continue;
      if (!location.includes(term) && !calendar.includes(term)) continue;
      score += 1;
    }
    if (score === 0) continue; // a rule with neither scope is meaningless

    if (!best || score > best.score || (score === best.score && rule.threshold_hours < best.rule.threshold_hours)) {
      best = { rule, score };
    }
  }

  return {
    thresholdHours: best ? best.rule.threshold_hours : accountDefault,
    rule: best?.rule ?? null,
    serviceLine: input.serviceLine || null,
    location: input.location || input.calendarName || null,
  };
}
