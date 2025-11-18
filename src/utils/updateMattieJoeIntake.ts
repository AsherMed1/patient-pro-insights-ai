import { supabase } from '@/integrations/supabase/client';

export const updateMattieJoeIntake = async () => {
  console.log('Updating Mattie Joe appointment...');
  
  const appointmentId = '3bbe24be-e95f-4419-86fc-b839dc772422';
  
  const updates = {
    parsed_contact_info: {
      name: "Mattie Joe",
      phone: "(478) 420-1894",
      email: "joemattie4@gmail.com",
      address: "200 Ashley Nicole Ave, Bonaire Georgia 31005"
    },
    parsed_demographics: {
      dob: "1961-01-17",
      age: 64,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Medicare Dual",
      plan: "Medicare Dual",
      group_number: "H5302-0112",
      alternate_selection: "Medicare"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 10,
      symptoms: "Stiffness, Sharp Pain, Instability or weakness",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills",
      imaging_done: "YES"
    },
    ghl_id: "7RutlyNYa64sIv1eNzwL",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/QUKi7VWhcBnsA7rjzVn4",
    detected_insurance_provider: "Medicare Dual",
    detected_insurance_plan: "Medicare Dual",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Mattie Joe appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Mattie Joe appointment:', data);
  return { success: true, data };
};
