import { supabase } from '@/integrations/supabase/client';

export const retriggerTest123Parsing = async () => {
  console.log('[REPARSE] Resetting parsing for Test 123...');
  
  // Reset parsing_completed_at for Test 123
  const { data: resetData, error: resetError } = await supabase
    .from('all_appointments')
    .update({ 
      parsing_completed_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', '51a698ad-50ed-45be-aa58-ea1fa33e7bf4')
    .select('id, lead_name');

  if (resetError) {
    console.error('[REPARSE] Error resetting parsing:', resetError);
    return { success: false, error: resetError };
  }

  console.log('[REPARSE] ✓ Reset parsing status for:', resetData);

  // Trigger auto-parser
  console.log('[REPARSE] Triggering auto-parser...');
  const { data: parseData, error: parseError } = await supabase.functions.invoke('auto-parse-intake-notes');

  if (parseError) {
    console.error('[REPARSE] Error invoking auto-parser:', parseError);
    return { success: false, error: parseError };
  }

  console.log('[REPARSE] ✓ Auto-parser result:', parseData);
  
  return { success: true, data: parseData };
};
