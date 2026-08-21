
import { format } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

const CENTRAL_TIME_ZONE = 'America/Chicago';

/**
 * Utility: detect YYYY-MM-DD (no time/zone)
 */
const isDateOnlyString = (input: unknown): input is string => {
  return typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input);
};

/**
 * Utility: build a UTC Date from a Central Time calendar date string
 * Uses midday by default to avoid DST edge cases when only formatting.
 */
const makeUTCFromCTCalendar = (dateString: string, time: 'start' | 'mid' | 'end' = 'mid'): Date => {
  const t = time === 'start' ? '00:00:00' : time === 'end' ? '23:59:59' : '12:00:00';
  return fromZonedTime(`${dateString}T${t}`, CENTRAL_TIME_ZONE);
};

/**
 * Convert any date to Central Time Zone and format it
 */
export const formatInCentralTime = (date: string | Date, formatString: string = 'MMM dd, yyyy h:mm:ss a') => {
  if (!date) return 'N/A';
  try {
    const baseUTC =
      isDateOnlyString(date) ? makeUTCFromCTCalendar(date, 'mid') : new Date(date);
    return formatInTimeZone(baseUTC, CENTRAL_TIME_ZONE, formatString);
  } catch {
    return typeof date === 'string' ? date : date.toString();
  }
};

/**
 * Get Central Time start-of-day as a UTC Date for comparisons
 */
export const getCTStartOfDayUTC = (date: string | Date) => {
  if (!date) return null;
  try {
    if (date instanceof Date) {
      const yyyy = format(date, 'yyyy');
      const mm = format(date, 'MM');
      const dd = format(date, 'dd');
      return fromZonedTime(`${yyyy}-${mm}-${dd}T00:00:00`, CENTRAL_TIME_ZONE);
    }
    if (isDateOnlyString(date)) {
      return makeUTCFromCTCalendar(date, 'start');
    }
    // For full ISO strings (with or without offset), rely on native parsing
    return new Date(date);
  } catch {
    return null;
  }
};

/**
 * Get Central Time end-of-day (23:59:59.999 CT) as a UTC Date for comparisons
 */
export const getCTEndOfDayUTC = (date: string | Date) => {
  if (!date) return null;
  try {
    const dateString =
      date instanceof Date ? format(date, 'yyyy-MM-dd') : isDateOnlyString(date) ? date : null;
    if (dateString) {
      const d = fromZonedTime(`${dateString}T23:59:59`, CENTRAL_TIME_ZONE);
      return new Date(d.getTime() + 999);
    }
    return new Date(date);
  } catch {
    return null;
  }
};

/** Today's calendar date in Central Time, as a local Date at midnight (for pickers). */
export const ctToday = (): Date => {
  const [y, m, d] = formatInTimeZone(new Date(), CENTRAL_TIME_ZONE, 'yyyy-MM-dd')
    .split('-')
    .map(Number);
  return new Date(y, m - 1, d);
};

export type CTPreset = 'today' | 'week' | 'month';

/**
 * Quick date range presets anchored to the current Central Time calendar date.
 * Week = Monday–Sunday of the current CT week. Month = first–last day of CT month.
 * Returned as local Dates at midnight so the calendar pickers display them correctly;
 * convert with getCTStartOfDayUTC / getCTEndOfDayUTC when comparing timestamps.
 */
export const ctPresetRange = (preset: CTPreset): { from: Date; to: Date } => {
  const today = ctToday();
  if (preset === 'today') return { from: today, to: today };
  if (preset === 'week') {
    const dow = today.getDay(); // 0 = Sunday
    const diffToMonday = dow === 0 ? 6 : dow - 1;
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday);
    const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6);
    return { from, to };
  }
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from, to };
};

/**
 * Format date only in Central Time Zone
 */
export const formatDateInCentralTime = (date: string | Date) => {
  return formatInCentralTime(date, 'MMM dd, yyyy');
};

/**
 * Format time only in Central Time Zone
 */
export const formatTimeInCentralTime = (date: string | Date) => {
  return formatInCentralTime(date, 'h:mm:ss a');
};

/**
 * Format date and time for tables in Central Time Zone
 */
export const formatDateTimeForTable = (date: string | Date) => {
  return formatInCentralTime(date, 'MMM dd, yyyy h:mm a');
};

/**
 * Format a date/time in a specific IANA timezone (e.g. project timezone).
 * Mirrors the existing "MMM dd, yyyy h:mm a" presentation used elsewhere.
 */
export const formatDateTimeInTimezone = (
  date: string | Date | null | undefined,
  timezone: string,
  formatString: string = 'MMM dd, yyyy h:mm a',
) => {
  if (!date) return 'Not set';
  try {
    const baseUTC =
      isDateOnlyString(date) ? makeUTCFromCTCalendar(date, 'mid') : new Date(date as any);
    return formatInTimeZone(baseUTC, timezone, formatString);
  } catch {
    return typeof date === 'string' ? date : String(date);
  }
};

/**
 * Get current time in Central Time Zone
 */
export const getCurrentCentralTime = () => {
  return formatInCentralTime(new Date());
};

/**
 * Convert date to Central Time Zone for display
 */
export const toCentralTime = (date: string | Date) => {
  if (!date) return null;
  try {
    const baseUTC =
      isDateOnlyString(date) ? makeUTCFromCTCalendar(date, 'mid') : new Date(date);
    return toZonedTime(baseUTC, CENTRAL_TIME_ZONE);
  } catch {
    return null;
  }
};

/**
 * Replace [[timestamp:ISO]] markers with formatted local time for the viewer.
 * This allows notes to store UTC timestamps but display them in each user's local timezone.
 */
export const formatEmbeddedTimestamps = (text: string): string => {
  if (!text) return text;
  
  // Pattern matches [[timestamp:2026-02-04T22:01:00.000Z]]
  const pattern = /\[\[timestamp:([^\]]+)\]\]/g;
  
  return text.replace(pattern, (match, isoString) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return match;
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return match; // Return original if parsing fails
    }
  });
};
