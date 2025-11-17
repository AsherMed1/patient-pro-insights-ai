import { supabase } from '@/integrations/supabase/client';

export const updateTyroneBillingsIntake = async () => {
  console.log('Updating Tyrone Billings appointment...');
  
  const appointmentId = '401a217f-a0f4-4905-9594-8481dde66e9e';
  
  const updates = {
    parsed_contact_info: {
      name: "Tyrone Billings",
      phone: "(478) 283-9112",
      address: "243 Mill Road, McDonough Georgia 30253"
    },
    parsed_demographics: {
      dob: "1970-08-07",
      age: 54,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Other",
      plan: "829072",
      group_number: "829072"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      primary_complaint: "knee pain"
    },
    ghl_id: "Lvb07T0cx4rOTaib7DDz",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/JyWRKnE25gpvy1BLLgxJ",
    detected_insurance_provider: "Other",
    detected_insurance_plan: "829072",
    detected_insurance_id: "ATV827947637",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Tyrone Billings appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Tyrone Billings appointment:', data);
  return { success: true, data };
};
