import { supabase } from '@/integrations/supabase/client';

export const updateDorylinColdwellIntake = async () => {
  console.log('Updating Dorylin Coldwell appointment...');
  
  const appointmentId = '2d556780-46a3-44b0-bb96-125466054826';
  
  const updates = {
    parsed_contact_info: {
      name: "Dorylin Coldwell",
      phone: "(404) 488-5480",
      email: "dbcoldwell@gmail.com",
      address: "109 Whistle Way, Locust Grove Georgia 30248"
    },
    parsed_demographics: {
      dob: "1952-07-29",
      age: 72,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Blue Cross",
      plan: "Blue Cross",
      group_number: "GASUPWPO",
      alternate_selection: "Blue Cross"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "1-6 months",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "YES",
      pain_level: 5,
      symptoms: "Swelling, Grinding sensation, Dull Ache",
      treatments_tried: "Physical therapy, Medications/pain pills, Injections",
      imaging_done: "YES",
      notes: "Due to an injury, the patient tore the meniscus 3 months ago. The right side has bone-on-bone, and the back of the right has a cyst."
    },
    parsed_medical_info: {
      pcp: "Dr Steven Ryanappa, Regenerative Orthopedic, 770-892-0300",
      imaging_location: "Regenerative Orthopedic"
    },
    ghl_id: "yZRLaGmdfLH6I9cE5ewS",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Dorylin Coldwell appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Dorylin Coldwell appointment:', data);
  return { success: true, data };
};
