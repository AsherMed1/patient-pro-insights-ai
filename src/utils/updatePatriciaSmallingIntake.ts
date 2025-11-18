import { supabase } from '@/integrations/supabase/client';

export const updatePatriciaSmallingIntake = async () => {
  console.log('Updating Patricia Smalling appointment...');
  
  const appointmentId = 'af214a8d-636e-4f3f-a3ad-51ba013d343d';
  
  const updates = {
    parsed_contact_info: {
      name: "Patricia Smalling",
      phone: "(478) 319-0409",
      email: "trishsmalling@gmail.com",
      address: "131 Holly Way, Macon Georgia 31216"
    },
    parsed_demographics: {
      dob: "1964-08-01",
      age: 61,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "BCBS FEDERAL",
      plan: "BCBS FEDERAL",
      alternate_selection: "Blue Cross",
      notes: "Both knees but left is worse. Steroid shots for 7 years in the left knee. July 31st cortisone shot in the left knee."
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 7,
      symptoms: "Grinding sensation, Stiffness, Dull Ache, Swelling",
      treatments_tried: "Injections, Medications/pain pills",
      imaging_done: "YES",
      notes: "Both knees but left is worse. Has been receiving steroid shots for 7 years in left knee. Most recent cortisone shot on July 31st."
    },
    parsed_medical_info: {
      pcp: "Dr Cameka Scarborough",
      clinic: "Scarborough Family Medicine",
      pcp_phone: "478-788-8599",
      imaging_location: "Ortho Georgia",
      imaging_done: "X-rays taken in January 2025"
    },
    ghl_id: "7RGq8uCTOcT6JNNYdyhX",
    detected_insurance_provider: "BCBS FEDERAL",
    detected_insurance_plan: "BCBS FEDERAL",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Patricia Smalling appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Patricia Smalling appointment:', data);
  return { success: true, data };
};
