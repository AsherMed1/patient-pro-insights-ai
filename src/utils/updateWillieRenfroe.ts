import { supabase } from '@/integrations/supabase/client';

export const updateWillieRenfroeAppointment = async () => {
  try {
    const { data, error } = await supabase
      .from('all_appointments')
      .update({ 
        status: 'Showed',
        procedure_ordered: true,
        updated_at: new Date().toISOString()
      })
      .eq('lead_phone_number', '+14783574367')
      .eq('project_name', 'Premier Vascular')
      .select();

    if (error) {
      console.error('Error updating Willie Renfroe appointment:', error);
      return { success: false, error };
    }

    console.log('Successfully updated Willie Renfroe appointment:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('Error in updateWillieRenfroeAppointment:', error);
    return { success: false, error };
  }
};
