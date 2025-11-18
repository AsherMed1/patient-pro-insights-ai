import { supabase } from '@/integrations/supabase/client';

export const updateIvanRedmonIntake = async () => {
  console.log('Updating Ivan Redmon appointment...');
  
  const appointmentId = '3cdc0563-5626-4548-a994-5d672dfa67e5';
  
  const updates = {
    parsed_contact_info: {
      name: "Ivan Redmon",
      phone: "(678) 927-5240",
      email: "redmonivan@gmail.com",
      address: "268 Madison St, Macon Georgia 31201"
    },
    parsed_demographics: {
      dob: "1965-01-10",
      age: 60,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Sonder Heart health plan",
      plan: "Sonder Heart health plan",
      alternate_selection: "Other",
      notes: "Both knees pain. Tried injections."
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "6 months - 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 8,
      symptoms: "Stiffness",
      treatments_tried: "Injections",
      imaging_done: "YES",
      notes: "Both knees pain. Has tried injections."
    },
    parsed_medical_info: {
      pcp: "Dr. Emilio Alejandro Lacayo",
      clinic: "Piedmont Atlanta Hospital",
      pcp_phone: "404-350-3860",
      imaging_done: "No imaging taken 2 years ago"
    },
    ghl_id: "cmPb89sQ6W17nWKgD5kK",
    detected_insurance_provider: "Sonder Heart health plan",
    detected_insurance_plan: "Sonder Heart health plan",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Ivan Redmon appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Ivan Redmon appointment:', data);
  return { success: true, data };
};
