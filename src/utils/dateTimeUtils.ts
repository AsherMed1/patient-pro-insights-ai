
import { format } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const CENTRAL_TIME_ZONE = 'America/Chicago';

/**
 * Convert any date to Central Time Zone and format it
 */
export const formatInCentralTime = (date: string | Date, formatString: string = 'MMM dd, yyyy HH:mm:ss') => {
  if (!date) return 'N/A';
  try {
    return formatInTimeZone(new Date(date), CENTRAL_TIME_ZONE, formatString);
  } catch {
    return typeof date === 'string' ? date : date.toString();
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
  return formatInCentralTime(date, 'HH:mm:ss');
};

/**
 * Format date and time for tables in Central Time Zone
 */
export const formatDateTimeForTable = (date: string | Date) => {
  return formatInCentralTime(date, 'MMM dd, yyyy HH:mm');
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
    return toZonedTime(new Date(date), CENTRAL_TIME_ZONE);
  } catch {
    return null;
  }
};
