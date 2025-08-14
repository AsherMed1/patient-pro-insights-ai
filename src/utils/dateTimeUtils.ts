
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
