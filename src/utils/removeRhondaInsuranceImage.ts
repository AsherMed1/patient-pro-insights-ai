import { supabase } from '@/integrations/supabase/client';

export const removeRhondaInsuranceImage = async () => {
  console.log('Removing insurance image for Rhonda Nelson...');
  
  const appointmentId = '6fd20501-38cd-4286-a7f7-67200e6cc81e';
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update({ 
      insurance_id_link: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error removing insurance image for Rhonda Nelson:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully removed insurance image for Rhonda Nelson:', data);
  return { success: true, data };
};
