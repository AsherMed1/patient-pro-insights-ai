import { supabase } from '@/integrations/supabase/client';

export const retriggerVividVascularParsing = async () => {
  console.log('[RETRIGGER] Resetting parsing for Vivid Vascular appointments...');
  
  // Reset parsing_completed_at for Vivid Vascular appointments
  const { data: resetData, error: resetError } = await supabase
    .from('all_appointments')
    .update({ parsing_completed_at: null })
    .eq('project_name', 'Vivid Vascular')
    .not('patient_intake_notes', 'is', null)
    .select('id, lead_name');
  
  if (resetError) {
    console.error('[RETRIGGER] Failed to reset:', resetError);
    return { success: false, error: resetError };
  }
  
  console.log(`[RETRIGGER] Reset ${resetData?.length || 0} appointments:`, resetData);
  
  // Invoke the auto-parser
  console.log('[RETRIGGER] Invoking auto-parser...');
  const { data: parseResult, error: parseError } = await supabase.functions.invoke('auto-parse-intake-notes');
  
  if (parseError) {
    console.error('[RETRIGGER] Parser error:', parseError);
    return { success: false, error: parseError };
  }
  
  console.log('[RETRIGGER] Parser result:', parseResult);
  
  // Wait and check results
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const { data: verifyData } = await supabase
    .from('all_appointments')
    .select('id, lead_name, parsed_insurance_info, parsed_demographics, ghl_id, ghl_appointment_id')
    .eq('project_name', 'Vivid Vascular')
    .limit(10);
  
  console.log('[RETRIGGER] Verification - Vivid Vascular appointments:', verifyData);
  
  return { success: true, parseResult, verifyData };
};

// Auto-run
retriggerVividVascularParsing();
