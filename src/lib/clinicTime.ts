import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

export const DEFAULT_CLINIC_TZ = 'America/Chicago';

/** Compact label shown next to clinic-local times (e.g. "CT", "ET"). */
export function timezoneAbbrev(tz: string, at: Date = new Date()): string {
  try {
    return formatInTimeZone(at, tz, 'zzz');
  } catch {
    return tz;
  }
}

/** Friendly clinic timezone description, e.g. "Central Time (CDT)". */
export function timezoneLabel(tz: string, at: Date = new Date()): string {
  const city = (tz.split('/')[1] || tz).replace(/_/g, ' ');
  return `${city} — ${timezoneAbbrev(tz, at)}`;
}

/** Current wall-clock time in the clinic's timezone. */
export function clinicNow(tz: string): Date {
  try {
    return toZonedTime(new Date(), tz);
  } catch {
    return new Date();
  }
}

/** "yyyy-MM-dd" / "HH:mm" pieces of a clinic-local Date, for date/time inputs. */
export function toInputParts(localDate: Date): { date: string; time: string } {
  return { date: format(localDate, 'yyyy-MM-dd'), time: format(localDate, 'HH:mm') };
}

/** Clinic-local date + time strings → the exact UTC instant (DST-aware). */
export function clinicLocalToUtc(dateStr: string, timeStr: string, tz: string): Date | null {
  if (!dateStr || !timeStr) return null;
  try {
    const d = fromZonedTime(`${dateStr}T${timeStr}:00`, tz);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** Render a UTC instant in the clinic's local time. */
export function formatClinicTime(
  iso: string | Date | null,
  tz: string,
  fmt = 'MMM d, yyyy h:mm a',
): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '—';
  try {
    return `${formatInTimeZone(d, tz, fmt)} ${timezoneAbbrev(tz, d)}`;
  } catch {
    return format(d, fmt);
  }
}

/** Quick follow-up intervals offered in the Schedule Follow-Up modal. */
export const FOLLOW_UP_INTERVALS: { label: string; minutes: number }[] = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '3 hours', minutes: 180 },
  { label: '24 hours', minutes: 1440 },
];
