import { supabase } from '@/integrations/supabase/client';

export const clearVividVascular = async () => {
  console.log('Clearing Vivid Vascular leads and appointments...');
  
  // Delete 5 test leads
  const leadIds = [
    'ea6b82e3-d2e6-4b4c-92e8-7c1855720c4a', // Ari TEST
    '97ee621e-38cf-4656-8fa0-569c85f6961f', // Cathtest Test
    'dfb72bbd-4664-477d-a8b8-580bb697b5dd', // Mohsin Khan
    '17b53aea-e2b0-4f3e-9dab-f2c57ac0ae7c', // Clayton Boquet
    '8d8ec01c-3c74-46dd-a668-8dba906a7197', // Luis De Leon
  ];

  const { error: leadsError } = await supabase
    .from('new_leads')
    .delete()
    .in('id', leadIds);

  if (leadsError) {
    console.error('Error deleting leads:', leadsError);
    return { success: false, error: leadsError };
  }

  console.log('✅ Successfully deleted 5 Vivid Vascular leads');

  // Delete 1 appointment
  const appointmentId = '2eb3a099-cc6a-4b02-83c1-29aa8dcd7a85'; // Luis De Leon

  const { error: appointmentError } = await supabase
    .from('all_appointments')
    .delete()
    .eq('id', appointmentId);

  if (appointmentError) {
    console.error('Error deleting appointment:', appointmentError);
    return { success: false, error: appointmentError };
  }

  console.log('✅ Successfully deleted 1 Vivid Vascular appointment');
  console.log('🎉 Vivid Vascular completely cleared!');
  
  return { success: true, deletedLeads: 5, deletedAppointments: 1 };
};
