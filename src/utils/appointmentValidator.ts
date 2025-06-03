
export const validateAndTransformAppointmentRow = (row: any): any => {
  // Required fields validation
  if (!row.date_appointment_created || !row.project_name || !row.lead_name) {
    throw new Error('Missing required fields: date_appointment_created, project_name, or lead_name');
  }

  // Helper function to validate and format time
  const validateTime = (timeValue: any): string | null => {
    if (!timeValue || timeValue === null || timeValue === undefined) {
      return null;
    }
    
    const timeStr = String(timeValue).trim();
    
    // If it's empty or just whitespace, return null
    if (!timeStr) {
      return null;
    }
    
    // Check if it looks like location data (contains letters, spaces, or #)
    if (/[a-zA-Z#]/.test(timeStr) || timeStr.length > 8) {
      console.warn(`Invalid time value detected (looks like location/address): "${timeStr}"`);
      return null;
    }
    
    // Try to match HH:MM or HH:MM:SS format
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
      
      // Validate time ranges
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    
    // Try to match just HH format
    const hourMatch = timeStr.match(/^(\d{1,2})$/);
    if (hourMatch) {
      const hours = parseInt(hourMatch[1]);
      if (hours >= 0 && hours <= 23) {
        return `${hours.toString().padStart(2, '0')}:00:00`;
      }
    }
    
    console.warn(`Invalid time format: "${timeStr}"`);
    return null;
  };

  // Transform and validate data types
  const transformedRow: any = {
    date_appointment_created: row.date_appointment_created,
    date_of_appointment: row.date_of_appointment || null,
    project_name: row.project_name,
    lead_name: row.lead_name,
    lead_email: row.lead_email || null,
    lead_phone_number: row.lead_phone_number || null,
    calendar_name: row.calendar_name || null,
    requested_time: validateTime(row.requested_time),
    stage_booked: row.stage_booked || null,
    showed: row.showed === 'true' || row.showed === '1' ? true : row.showed === 'false' || row.showed === '0' ? false : null,
    confirmed: row.confirmed === 'true' || row.confirmed === '1' ? true : row.confirmed === 'false' || row.confirmed === '0' ? false : null,
    agent: row.agent || null,
    agent_number: row.agent_number || null,
    ghl_id: row.ghl_id || null,
    confirmed_number: row.confirmed_number || null,
    status: row.status || null,
    procedure_ordered: row.procedure_ordered === 'true' || row.procedure_ordered === '1' ? true : row.procedure_ordered === 'false' || row.procedure_ordered === '0' ? false : null
  };

  return transformedRow;
};
