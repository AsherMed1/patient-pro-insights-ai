
/**
 * Database operations for call records
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { CallRecordData } from './validation.ts';

/**
 * Create a call record in the database
 */
export async function createCallRecord(
  validatedData: CallRecordData,
  callDateTimeObj: Date
) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const dateObj = new Date(validatedData.date);

  console.log('Final UTC datetime to save:', callDateTimeObj.toISOString());

  // Insert new call record into database
  const { data, error } = await supabase
    .from('all_calls')
    .insert([{
      lead_name: validatedData.lead_name,
      lead_phone_number: validatedData.lead_phone_number,
      project_name: validatedData.project_name,
      date: dateObj.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
      call_datetime: callDateTimeObj.toISOString(),
      direction: validatedData.direction.toLowerCase(),
      status: validatedData.status,
      duration_seconds: parseInt(validatedData.duration_seconds?.toString() || '0') || 0,
      agent: validatedData.agent,
      recording_url: validatedData.recording_url,
      call_summary: validatedData.call_summary
    }])
    .select();

  if (error) {
    console.error('Database error:', error);
    throw new Error(`Failed to create call record: ${error.message}`);
  }

  console.log('Successfully saved call record with UTC datetime:', data[0].call_datetime);
  return data[0];
}
