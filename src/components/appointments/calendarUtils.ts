export interface EventTypeInfo {
  type: string;
  shortName: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  dotColor: string;
}

// Reserved block styling
export const RESERVED_EVENT_TYPE: EventTypeInfo = {
  type: 'Reserved',
  shortName: 'RSV',
  borderColor: 'border-l-slate-500',
  bgColor: 'bg-slate-100 dark:bg-slate-800/50',
  textColor: 'text-slate-600 dark:text-slate-400',
  dotColor: 'bg-slate-500'
};

// Define event type color scheme based on procedure types
export const EVENT_TYPES: EventTypeInfo[] = [
  { 
    type: 'GAE', 
    shortName: 'GAE',
    borderColor: 'border-l-orange-500', 
    bgColor: 'bg-orange-50 dark:bg-orange-950/30', 
    textColor: 'text-orange-700 dark:text-orange-300',
    dotColor: 'bg-orange-500'
  },
  { 
    type: 'PFE', 
    shortName: 'PFE',
    borderColor: 'border-l-blue-500', 
    bgColor: 'bg-blue-50 dark:bg-blue-950/30', 
    textColor: 'text-blue-700 dark:text-blue-300',
    dotColor: 'bg-blue-500'
  },
  { 
    type: 'UFE', 
    shortName: 'UFE',
    borderColor: 'border-l-teal-500', 
    bgColor: 'bg-teal-50 dark:bg-teal-950/30', 
    textColor: 'text-teal-700 dark:text-teal-300',
    dotColor: 'bg-teal-500'
  },
  { 
    type: 'PAE', 
    shortName: 'PAE',
    borderColor: 'border-l-purple-500', 
    bgColor: 'bg-purple-50 dark:bg-purple-950/30', 
    textColor: 'text-purple-700 dark:text-purple-300',
    dotColor: 'bg-purple-500'
  },
  { 
    type: 'HAE', 
    shortName: 'HAE',
    borderColor: 'border-l-pink-500', 
    bgColor: 'bg-pink-50 dark:bg-pink-950/30', 
    textColor: 'text-pink-700 dark:text-pink-300',
    dotColor: 'bg-pink-500'
  },
  { 
    type: 'Neuropathy', 
    shortName: 'Neuro',
    borderColor: 'border-l-emerald-500', 
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', 
    textColor: 'text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-500'
  },
  { 
    type: 'Vein', 
    shortName: 'Vein',
    borderColor: 'border-l-indigo-500', 
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30', 
    textColor: 'text-indigo-700 dark:text-indigo-300',
    dotColor: 'bg-indigo-500'
  },
  { 
    type: 'Other', 
    shortName: 'Other',
    borderColor: 'border-l-gray-400', 
    bgColor: 'bg-gray-50 dark:bg-gray-800/30', 
    textColor: 'text-gray-700 dark:text-gray-300',
    dotColor: 'bg-gray-400'
  },
];

// Extract event type from calendar name (with reserved block check)
export function getEventTypeFromCalendar(calendarName: string | null, isReservedBlock?: boolean): EventTypeInfo {
  // Return reserved styling if this is a reserved block
  if (isReservedBlock) {
    return RESERVED_EVENT_TYPE;
  }

  if (!calendarName) {
    return EVENT_TYPES[EVENT_TYPES.length - 1]; // Return "Other"
  }
  
  const upperName = calendarName.toUpperCase();
  
  // Check for specific procedure types
  if (upperName.includes('GAE')) {
    return EVENT_TYPES.find(e => e.type === 'GAE')!;
  }
  if (upperName.includes('PFE')) {
    return EVENT_TYPES.find(e => e.type === 'PFE')!;
  }
  if (upperName.includes('UFE')) {
    return EVENT_TYPES.find(e => e.type === 'UFE')!;
  }
  if (upperName.includes('PAE')) {
    return EVENT_TYPES.find(e => e.type === 'PAE')!;
  }
  if (upperName.includes('HAE')) {
    return EVENT_TYPES.find(e => e.type === 'HAE')!;
  }
  if (upperName.includes('NEUROPATHY') || upperName.includes('NEURO')) {
    return EVENT_TYPES.find(e => e.type === 'Neuropathy')!;
  }
  if (upperName.includes('VEIN') || upperName.includes('VARICOSE')) {
    return EVENT_TYPES.find(e => e.type === 'Vein')!;
  }
  
  // Default to "Other"
  return EVENT_TYPES[EVENT_TYPES.length - 1];
}

// Get status badge info
export function getStatusInfo(status: string | null): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  const normalizedStatus = (status ?? '').toLowerCase().trim();
  
  switch (normalizedStatus) {
    case 'showed':
      return { label: 'Showed', variant: 'default' };
    case 'confirmed':
      return { label: 'Confirmed', variant: 'secondary' };
    case 'cancelled':
    case 'no show':
    case 'noshow':
      return { label: normalizedStatus === 'cancelled' ? 'Cancelled' : 'No Show', variant: 'destructive' };
    case 'rescheduled':
      return { label: 'Rescheduled', variant: 'outline' };
    default:
      return { label: status || 'Scheduled', variant: 'outline' };
  }
}
