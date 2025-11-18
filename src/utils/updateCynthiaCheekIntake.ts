import { supabase } from '@/integrations/supabase/client';

export const updateCynthiaCheekIntake = async () => {
  console.log('Updating Cynthia Cheek appointment...');
  
  const appointmentId = '32f98df2-ed2a-43be-a9c0-c8c658fc53a4';
  
  const updates = {
    parsed_contact_info: {
      name: "Cynthia Cheek",
      phone: "(478) 262-7840",
      email: "cheekcyn@gmail.com",
      address: "Chickamauga Dr, Macon Georgia 31220"
    },
    parsed_demographics: {
      dob: "1958-04-29",
      age: 67,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "United Healthcare",
      plan: "United Healthcare",
      group_number: "00477 H5322-030-000",
      alternate_selection: "United",
      notes: "Both knees, right worse. Pain and stiffness. Stepped on knee 2 years ago then pain started. Iodine treatment made it worse. Imaging: not sure of dr name or if they had images for her knees, OrthoGeorgia."
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "YES",
      pain_level: 5,
      symptoms: "Swelling, Grinding sensation, Stiffness",
      treatments_tried: "Medications/pain pills",
      imaging_done: "YES",
      notes: "Both knees, right worse. Stepped on knee 2 years ago then pain started. Iodine treatment made it worse."
    },
    parsed_medical_info: {
      pcp: "Dr. Melisa Bellflower",
      clinic: "North Macon Family Healthcare",
      pcp_phone: "478-471-0089",
      imaging_location: "OrthoGeorgia | Orthopaedic Specialists - Macon",
      imaging_phone: "478-745-4206"
    },
    ghl_id: "VOFm4hoHMttOAdJO5FW1",
    detected_insurance_provider: "United Healthcare",
    detected_insurance_plan: "United Healthcare",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Cynthia Cheek appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Cynthia Cheek appointment:', data);
  return { success: true, data };
};
