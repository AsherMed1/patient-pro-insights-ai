
/**
 * Validation utilities for call record data
 */

export interface CallRecordData {
  lead_name: string;
  lead_phone_number: string;
  project_name: string;
  date: string;
  call_datetime: string;
  direction: string;
  status: string;
  duration_seconds?: number;
  agent?: string | null;
  recording_url?: string | null;
  call_summary?: string | null;
  ghl_id?: string | null;
}

export interface ValidationError {
  error: string;
  status: number;
}

/**
 * Validate required fields for call record creation
 */
export function validateRequiredFields(body: any): CallRecordData | ValidationError {
  const { 
    lead_name, 
    lead_phone_number, 
    project_name, 
    date, 
    call_datetime, 
    direction, 
    status,
    duration_seconds = 0,
    agent = null,
    recording_url = null,
    call_summary = null,
    ghl_id = null
  } = body;

  if (!lead_name || !lead_phone_number || !project_name || !date || !call_datetime || !direction || !status) {
    return {
      error: 'Missing required fields. Required: lead_name, lead_phone_number, project_name, date, call_datetime, direction, status',
      status: 400
    };
  }

  return {
    lead_name,
    lead_phone_number,
    project_name,
    date,
    call_datetime,
    direction,
    status,
    duration_seconds,
    agent,
    recording_url,
    call_summary,
    ghl_id
  };
}

/**
 * Validate date format
 */
export function validateDate(date: string): ValidationError | null {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return {
      error: 'Invalid date format. Use YYYY-MM-DD or ISO 8601 format',
      status: 400
    };
  }
  return null;
}

/**
 * Validate direction field
 */
export function validateDirection(direction: string): ValidationError | null {
  const validDirections = ['inbound', 'outbound'];

  if (!validDirections.includes(direction.toLowerCase())) {
    return {
      error: `Invalid direction. Must be one of: ${validDirections.join(', ')}`,
      status: 400
    };
  }
  return null;
}
