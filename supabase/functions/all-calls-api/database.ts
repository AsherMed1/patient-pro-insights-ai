
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

  // Check if agent exists and create if needed
  if (validatedData.agent) {
    await ensureAgentExists(supabase, validatedData.agent);
  }

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

/**
 * Ensure agent exists in the database, create if not found
 */
async function ensureAgentExists(supabase: any, agentName: string) {
  try {
    // Check if agent already exists
    const { data: existingAgent, error: searchError } = await supabase
      .from('agents')
      .select('id, agent_name')
      .eq('agent_name', agentName)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('Error searching for agent:', searchError);
      return;
    }

    if (existingAgent) {
      console.log(`Agent ${agentName} already exists`);
      return;
    }

    // Get next available agent number
    const { data: lastAgent, error: lastAgentError } = await supabase
      .from('agents')
      .select('agent_number')
      .order('agent_number', { ascending: false })
      .limit(1)
      .single();

    let nextAgentNumber = '001';
    if (!lastAgentError && lastAgent) {
      const lastNumber = parseInt(lastAgent.agent_number);
      nextAgentNumber = String(lastNumber + 1).padStart(3, '0');
    }

    // Create new agent
    const { data: newAgent, error: createError } = await supabase
      .from('agents')
      .insert([{
        agent_name: agentName,
        agent_number: nextAgentNumber,
        active: true
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating agent:', createError);
      return;
    }

    console.log(`Created new agent: ${agentName} with number ${nextAgentNumber}`);
  } catch (error) {
    console.error('Error in ensureAgentExists:', error);
  }
}
