import { supabase } from '@/integrations/supabase/client';

export const updateTwilaRobinsonStatus = async () => {
  console.log('Updating Twila Robinson status to Cancelled...');
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
    .eq('id', 'efef0daa-9133-4c97-8699-99c7cf1c8f6d')
    .select('id, lead_name, status, project_name')
    .single();
  
  if (error) {
    console.error('Error updating Twila Robinson:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Twila Robinson status:', data);
  return { success: true, data };
};
