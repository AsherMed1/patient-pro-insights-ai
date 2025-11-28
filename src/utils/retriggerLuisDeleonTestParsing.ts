import { supabase } from '@/integrations/supabase/client';

export const retriggerLuisDeleonTestParsing = async () => {
  console.log('Re-triggering parsing for Luis De Leon Test...');
  
  const appointmentId = '1c94e9aa-0f34-475d-8556-c0d90b14832d';
  
  // Step 1: Reset parsing_completed_at to null to queue for re-parsing
  const { error: resetError } = await supabase
    .from('all_appointments')
    .update({ 
      parsing_completed_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId);
  
  if (resetError) {
    console.error('Error resetting parsing status:', resetError);
    return { success: false, error: resetError };
  }
  
  console.log('✅ Reset parsing_completed_at to null');
  
  // Step 2: Trigger the auto-parse edge function
  const { data, error: parseError } = await supabase.functions.invoke('auto-parse-intake-notes');
  
  if (parseError) {
    console.error('Error triggering auto-parse:', parseError);
    return { success: false, error: parseError };
  }
  
  console.log('✅ Auto-parse triggered:', data);
  
  // Step 3: Verify the results
  const { data: updatedAppt, error: fetchError } = await supabase
    .from('all_appointments')
    .select('id, lead_name, dob, parsed_demographics, parsed_contact_info, parsing_completed_at')
    .eq('id', appointmentId)
    .single();
  
  if (fetchError) {
    console.error('Error fetching updated appointment:', fetchError);
    return { success: false, error: fetchError };
  }
  
  console.log('✅ Updated appointment data:', updatedAppt);
  console.log('   - DOB column:', updatedAppt.dob);
  console.log('   - parsed_demographics:', updatedAppt.parsed_demographics);
  
  return { 
    success: true, 
    data: updatedAppt,
    message: 'Re-parsing completed! Check parsed_demographics for DOB and age.'
  };
};
