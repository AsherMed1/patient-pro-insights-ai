// Temporary utility to trigger re-parsing for Test 123 with GHL custom fields
import { supabase } from '@/integrations/supabase/client';

(async () => {
  console.log('🔄 [REPARSE] Resetting parsing status for Test 123...');
  
  const { data: resetData, error: resetError } = await supabase
    .from('all_appointments')
    .update({ 
      parsing_completed_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', '51a698ad-50ed-45be-aa58-ea1fa33e7bf4')
    .select('id, lead_name, ghl_id');

  if (resetError) {
    console.error('❌ [REPARSE] Error:', resetError);
    return;
  }

  console.log('✅ [REPARSE] Reset complete:', resetData);
  console.log('🚀 [REPARSE] Triggering auto-parser with GHL custom field fetching...');

  const { data: parseResult, error: parseError } = await supabase.functions.invoke('auto-parse-intake-notes');

  if (parseError) {
    console.error('❌ [REPARSE] Parser error:', parseError);
    return;
  }

  console.log('✅ [REPARSE] Parser completed:', parseResult);
  
  // Wait a moment then check results
  setTimeout(async () => {
    const { data: appointment } = await supabase
      .from('all_appointments')
      .select('lead_name, parsed_demographics, parsed_insurance_info, parsed_contact_info, insurance_id_link')
      .eq('id', '51a698ad-50ed-45be-aa58-ea1fa33e7bf4')
      .single();
    
    console.log('📊 [REPARSE] Updated appointment data:', appointment);
  }, 2000);
})();
