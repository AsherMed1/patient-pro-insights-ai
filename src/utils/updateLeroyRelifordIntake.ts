import { supabase } from '@/integrations/supabase/client';

export const updateLeroyRelifordIntake = async () => {
  console.log('Updating Leroy Reliford Jr. appointment...');
  
  const appointmentId = '23e881f0-e773-448d-9e4f-cdd556173110';
  
  const updates = {
    parsed_contact_info: {
      name: "Leroy Reliford Jr.",
      phone: "(478) 973-3315",
      email: "leroyrelifordjr@yahoo.com",
      address: "1134 Lite-N-Tie Rd, Macon Georgia 31211"
    },
    parsed_demographics: {
      dob: "1965-02-06",
      age: 59,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Blue Cross Blue Shield",
      plan: "Blue Cross Blue Shield",
      group_number: "100325104",
      alternate_selection: "Blue Cross"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      trauma_related_onset: "YES",
      pain_level: 7,
      symptoms: "Sharp Pain, Swelling, Stiffness, Dull Ache, Instability or weakness",
      treatments_tried: "Injections, Medications/pain pills",
      imaging_done: "YES"
    },
    ghl_id: "eehg1ddbe45DLZDbUEdU",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/GyOoIpP1DlZ9GTSqAaq8",
    detected_insurance_provider: "Blue Cross Blue Shield",
    detected_insurance_plan: "Blue Cross Blue Shield",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Leroy Reliford Jr. appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Leroy Reliford Jr. appointment:', data);
  return { success: true, data };
};
