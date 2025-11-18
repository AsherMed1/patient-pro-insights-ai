import { supabase } from '@/integrations/supabase/client';

export const updateValerieBrownIntake = async () => {
  console.log('Updating Valerie Brown appointment...');
  
  const appointmentId = '04772ce6-10b0-4874-97e7-1dfe73cf5340';
  
  const updates = {
    parsed_contact_info: {
      name: "Valerie Brown",
      phone: "(404) 454-0691",
      email: "valbrown1762@yahoo.com",
      address: "825 Monticello Road, Eatonton Georgia 31024"
    },
    parsed_demographics: {
      dob: "1959-05-09",
      age: 66,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "UHC",
      plan: "UHC",
      group_number: "902786",
      alternate_selection: "United Healthcare"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 10,
      symptoms: "Swelling, Sharp Pain, Stiffness, Dull Ache",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills",
      imaging_done: "YES"
    },
    ghl_id: "ZTHISiPZKPx9gNWrxbVh",
    detected_insurance_provider: "UHC",
    detected_insurance_plan: "UHC",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Valerie Brown appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Valerie Brown appointment:', data);
  return { success: true, data };
};
