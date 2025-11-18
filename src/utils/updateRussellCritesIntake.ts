import { supabase } from '@/integrations/supabase/client';

export const updateRussellCritesIntake = async () => {
  console.log('Updating Russell Crites appointment...');
  
  const appointmentId = '71e6e573-f0b9-42bd-8853-40ae10407483';
  
  const updates = {
    parsed_contact_info: {
      name: "Russell Crites",
      phone: "(478) 747-3851",
      email: "critesruss@gmail.com",
      address: "319 Felton Wood Rd, Byron Georgia 31008"
    },
    parsed_demographics: {
      dob: "1954-09-30",
      age: 71,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Humana",
      plan: "Humana",
      group_number: "0B575",
      alternate_selection: "Humana"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "NO",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 8,
      symptoms: "Sharp Pain, Grinding sensation, Instability or weakness",
      treatments_tried: "Injections",
      imaging_done: "NO",
      primary_complaint: "Left knee pain",
      notes: "Left knee Injections, helped for while 6 years No injury"
    },
    parsed_medical_info: {
      pcp: "Dr. Kirk, Byron Healthcare, 770-422-5516"
    },
    ghl_id: "AvRwmg3pOP5xYkG1PR8O",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Russell Crites appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Russell Crites appointment:', data);
  return { success: true, data };
};
