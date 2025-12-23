import { supabase } from '@/integrations/supabase/client';

export const deleteOzarkIncompleteRecords = async () => {
  console.log('Deleting incomplete patient records from Ozark Regional Vein and Artery Center...');
  
  const patientsToDelete = [
    'Mohsin Test Lead', 'Candace Mahar', 'Judy Crittenden',
    'Darla Gray-Winter', 'Sandra David', 'Donna Smith', 'Bonnie Baty', 'Royal Bowhay',
    'Sherry Suarez', 'Marsha Robinson', 'Pamela Cobbs', 'Benjamin D Newton', 'Toni Walton',
    'Sondra Kizer', 'Shannon Floyd', 'Jackie Davis', 'Paula Garcia-Rawlins', 'calvin stover',
    'Margaret Medina', 'Geary Lowery', 'Draxie Rogers', 'Roger Perry',
    'Sherry Hufford', 'Arlena Baker', 'Evelyn Flynn', 'robert cancemi', 'Peggy Bates',
    'Shirley Baker', 'Lambert Lawler'
  ];
  
  const projectName = 'Ozark Regional Vein and Artery Center';
  
  // Delete from all_appointments
  const { data: deletedAppointments, error: appointmentsError } = await supabase
    .from('all_appointments')
    .delete()
    .eq('project_name', projectName)
    .in('lead_name', patientsToDelete)
    .select('id, lead_name');
  
  if (appointmentsError) {
    console.error('Error deleting appointments:', appointmentsError);
    return { success: false, error: appointmentsError };
  }
  
  console.log(`✅ Deleted ${deletedAppointments?.length || 0} appointments:`, deletedAppointments);
  
  // Delete from new_leads
  const { data: deletedLeads, error: leadsError } = await supabase
    .from('new_leads')
    .delete()
    .eq('project_name', projectName)
    .in('lead_name', patientsToDelete)
    .select('id, lead_name');
  
  if (leadsError) {
    console.error('Error deleting leads:', leadsError);
    return { success: false, error: leadsError };
  }
  
  console.log(`✅ Deleted ${deletedLeads?.length || 0} leads:`, deletedLeads);
  
  return { 
    success: true, 
    deletedAppointments: deletedAppointments?.length || 0,
    deletedLeads: deletedLeads?.length || 0
  };
};
