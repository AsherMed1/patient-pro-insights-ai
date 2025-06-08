
import { subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import type { DateRange } from '../types';

export const getQuickDateRange = (type: string): DateRange => {
  const now = new Date();
  
  switch (type) {
    case 'wtd':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
    case 'mtd':
      return { from: startOfMonth(now), to: now };
    case 'ytd':
      return { from: startOfYear(now), to: now };
    case 'last7':
      return { from: subDays(now, 7), to: now };
    default:
      return { from: undefined, to: undefined };
  }
};
