import { supabase } from '@/integrations/supabase/client';

export const updateGarySmithIntake = async () => {
  console.log('Updating Gary Smith appointment...');
  
  const appointmentId = '73e1dd64-b454-417a-9186-2750d6823e06';
  
  const updates = {
    parsed_contact_info: {
      name: "Gary Smith",
      phone: "(678) 429-9157",
      email: "gksmith2@yahoo.com",
      address: "187 Dean Patrick Road, Jackson Georgia 30233"
    },
    parsed_demographics: {
      dob: "1951-09-29",
      age: 74,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Medicare",
      plan: "(80840)9140461101",
      group_number: "6A536",
      alternate_selection: "Medicare"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 9,
      symptoms: "Sharp Pain, Grinding sensation, Instability or weakness",
      treatments_tried: "Medications/pain pills",
      imaging_done: "NO"
    },
    ghl_id: "mcCC4c3Wwj49NBoJxmzp",
    detected_insurance_provider: "Medicare",
    detected_insurance_plan: "(80840)9140461101",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Gary Smith appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Gary Smith appointment:', data);
  return { success: true, data };
};
