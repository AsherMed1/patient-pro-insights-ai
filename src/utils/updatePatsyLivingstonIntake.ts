import { supabase } from '@/integrations/supabase/client';

export const updatePatsyLivingstonIntake = async () => {
  console.log('Updating Patsy Livingston appointment...');
  
  const appointmentId = '3bcfb1f2-4ef7-4872-ac5d-7cc479ae6ea3';
  
  const updates = {
    parsed_contact_info: {
      name: "Patsy Livingston",
      phone: "(678) 876-6379",
      email: "djel66@hotmail.com",
      address: "902 Ambeau Circle, McDonough Georgia 30253"
    },
    parsed_demographics: {
      dob: "1945-11-26",
      age: 80,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Humana Medicare Advantage",
      plan: "Humana Medicare Advantage PPO",
      group_number: "Y9443",
      alternate_selection: "Medicare Advantage",
      notes: "Both knees, pain for 5y. Tried cortizone injections, not working and it is painful. Uses knee brace, to keep knee steady and to be able to walk, up and down stairs, knee is going inwards. X rays done 1y ago both knees at Piedmont Orthopedics OrthoAtlantawith Dr. Todd A. Schmidt MD"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 10,
      symptoms: "Instability or weakness, Stiffness, Swelling, Sharp Pain",
      treatments_tried: "Injections, Medications/pain pills",
      imaging_done: "YES"
    },
    parsed_medical_info: {
      pcp: "Dr. Anglyn",
      clinic: "(770) 957 3922",
      location: "Piedmont Physician Anglyn Internal Medicine",
      imaging_location: "Piedmont Orthopedics OrthoAtlanta with Dr. Todd A. Schmidt MD"
    },
    ghl_id: "CdGnaIT6Sn72pKfgvJD9",
    detected_insurance_provider: "Humana Medicare Advantage",
    detected_insurance_plan: "Humana Medicare Advantage PPO",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Patsy Livingston appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Patsy Livingston appointment:', data);
  return { success: true, data };
};
