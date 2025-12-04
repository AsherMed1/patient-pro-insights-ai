import { supabase } from '@/integrations/supabase/client';

export const retriggerCathTestParsing = async () => {
  console.log('[RETRIGGER] Setting insurance_id_link for Luis De Leon...');
  
  // Directly update the insurance_id_link with the URL from intake notes
  const { data, error } = await supabase
    .from('all_appointments')
    .update({ 
      insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/7HJ1drfTAosPrFiGtdHl'
    })
    .eq('project_name', 'Richmond Vascular Center')
    .ilike('lead_name', '%Luis%De%Leon%')
    .select('id, lead_name, insurance_id_link');
  
  if (error) {
    console.error('[RETRIGGER] Failed:', error);
    return { success: false, error };
  }
  
  console.log('[RETRIGGER] Updated:', data);
  return { success: true, data };
};

// Auto-run
retriggerCathTestParsing();
