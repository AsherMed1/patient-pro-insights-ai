import { supabase } from '@/integrations/supabase/client';

export const updateMamieOwensIntake = async () => {
  console.log('Updating Mamie Owens appointment...');
  
  const appointmentId = '75901417-20ca-43ea-a834-7e6c84dd5286';
  
  const updates = {
    parsed_contact_info: {
      name: "Mamie Owens",
      phone: "(706) 703-3385",
      email: "mamiethebirdlover@gmail.com",
      address: "1136 Inez Street, Augusta Georgia 30909"
    },
    parsed_demographics: {
      dob: "1956-01-19",
      age: 69,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Humana",
      plan: "Humana",
      group_number: "9140461101",
      alternate_selection: "Humana",
      notes: "MRI in July"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "YES",
      pain_level: 9,
      symptoms: "Dull Ache",
      treatments_tried: "Injections",
      imaging_done: "YES"
    },
    parsed_medical_info: {
      pcp: "Dr. Wange",
      clinic: "+706 792 5079",
      imaging_location: "MRI in July"
    },
    ghl_id: "ZirgTf3F14jEhYllvpoV",
    detected_insurance_provider: "Humana",
    detected_insurance_plan: "Humana",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Mamie Owens appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Mamie Owens appointment:', data);
  return { success: true, data };
};
