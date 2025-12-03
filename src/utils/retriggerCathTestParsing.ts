import { supabase } from '@/integrations/supabase/client';

export const retriggerCathTestParsing = async () => {
  console.log('[RETRIGGER] Resetting parsing for Cath Test in Vivid Vascular...');
  
  // Reset parsing_completed_at for Cath Test appointment
  const { data: resetData, error: resetError } = await supabase
    .from('all_appointments')
    .update({ parsing_completed_at: null })
    .eq('project_name', 'Vivid Vascular')
    .ilike('lead_name', '%Cath%Test%')
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
  return { success: true, parseResult };
};

// Auto-run
retriggerCathTestParsing();
