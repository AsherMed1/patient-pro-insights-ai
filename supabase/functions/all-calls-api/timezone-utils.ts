
/**
 * Timezone utility functions for handling Central Time to UTC conversions
 */

export interface TimezoneConversionResult {
  dateTime: Date;
  wasConverted: boolean;
  note: string;
}

/**
 * Convert call datetime to UTC, handling timezone info and Central Time conversion
 */
export function convertCallDateTimeToUTC(call_datetime: string): TimezoneConversionResult {
  console.log('Original call_datetime:', call_datetime);
  
  // Check if the datetime string already has timezone info
  const hasTimezoneInfo = call_datetime.includes('Z') || 
                         call_datetime.includes('+') || 
                         (call_datetime.includes('-') && call_datetime.lastIndexOf('-') > 10);
  
  let callDateTimeObj: Date;
  let wasConverted = false;
  
  if (hasTimezoneInfo) {
    // Already has timezone info, use directly
    callDateTimeObj = new Date(call_datetime);
    console.log('Datetime has timezone info, using as-is:', callDateTimeObj.toISOString());
  } else {
    // No timezone info - treat as Central Time and convert to UTC
    console.log('No timezone info detected, treating as Central Time');
    
    // Create a date object from the string
    const localDateTime = new Date(call_datetime);
    
    if (isNaN(localDateTime.getTime())) {
      throw new Error('Invalid call_datetime format. Use ISO 8601 format (e.g., 2024-01-15T10:30:00 or 2024-01-15T10:30:00Z)');
    }
    
    // Determine DST for Central Time
    const year = localDateTime.getFullYear();
    const dstStart = new Date(year, 2, 8); // March 8th as baseline
    dstStart.setDate(dstStart.getDate() + (7 - dstStart.getDay()) % 7); // Second Sunday
    
    const dstEnd = new Date(year, 10, 1); // November 1st as baseline  
    dstEnd.setDate(dstEnd.getDate() + (7 - dstEnd.getDay()) % 7); // First Sunday
    
    const isDST = localDateTime >= dstStart && localDateTime < dstEnd;
    const offsetHours = isDST ? 5 : 6; // CDT is UTC-5, CST is UTC-6
    
    console.log('Is DST:', isDST, 'Offset hours:', offsetHours);
    
    // Convert Central Time to UTC by adding the offset
    callDateTimeObj = new Date(localDateTime.getTime() + (offsetHours * 60 * 60 * 1000));
    console.log('Converted Central to UTC:', callDateTimeObj.toISOString());
    wasConverted = true;
  }

  if (isNaN(callDateTimeObj.getTime())) {
    throw new Error('Invalid call_datetime format. Use ISO 8601 format (e.g., 2024-01-15T10:30:00Z or 2024-01-15T10:30:00)');
  }

  return {
    dateTime: callDateTimeObj,
    wasConverted,
    note: hasTimezoneInfo 
      ? 'Datetime already had timezone info, used as-is' 
      : 'Datetime converted from Central Time to UTC for storage'
  };
}
