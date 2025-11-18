import { supabase } from '@/integrations/supabase/client';

export const updateCynthiaWilsonIntake = async () => {
  console.log('Updating Cynthia Wilson appointment...');
  
  const appointmentId = '0a63af46-d7e1-4111-9b47-c0ce1f0d037b';
  
  const updates = {
    parsed_contact_info: {
      name: "Cynthia Wilson",
      phone: "(478) 320-3597",
      email: "wilsondenise1968@gmail.com",
      address: "3401 Houston Ave apt a11, Macon Georgia 31206"
    },
    parsed_demographics: {
      dob: "1968-09-30",
      age: 57,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "United Healthcare",
      plan: "United Healthcare",
      group_number: "00477H5322-030-000",
      alternate_selection: "United Healthcare",
      notes: "Right knee, Bone on bone, Swelling, Scope surgery, didn't help, Due for a replacement, Diabetic type 2, 6 years, Imaging: no."
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      notes: "Right knee. Bone on bone. Swelling. Scope surgery didn't help. Due for a replacement. Diabetic type 2 for 6 years."
    },
    parsed_medical_info: {
      pcp: "Dr. John H Henderson",
      pcp_phone: "478-301-2696",
      pcp_address: "Mercer University Campus Health"
    },
    ghl_id: "GTpH7rhGHezb9MBxD2lf",
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
    console.error('Error updating Cynthia Wilson appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Cynthia Wilson appointment:', data);
  return { success: true, data };
};
