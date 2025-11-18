import { supabase } from '@/integrations/supabase/client';

export const updateRichardHedgepethIntake = async () => {
  console.log('Updating Richard Hedgepeth appointment...');
  
  const appointmentId = '21e73c7f-b7f7-4319-9c5d-03b659232cc9';
  
  const updates = {
    parsed_contact_info: {
      name: "Richard Hedgepeth",
      phone: "(478) 363-1981",
      email: "hrj1905@hotmail.com",
      address: "Lois Lane Northeast, Milledgeville, Georgia 31061"
    },
    parsed_demographics: {
      dob: "1963-04-26",
      age: 62,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Humana",
      plan: "Humana",
      alternate_selection: "Humana",
      notes: "Had Xray done 3 years ago, PCP Dr. Thomas Jones"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 8,
      symptoms: "Dull Ache, Sharp Pain, Stiffness, Grinding sensation, Instability or weakness",
      treatments_tried: "Physical therapy, Medications/pain pills",
      imaging_done: "YES"
    },
    parsed_medical_info: {
      pcp: "Dr. Thomas Jones",
      imaging_location: "3 years ago"
    },
    ghl_id: "3OdMaWUxUYFGXUaVwyzH",
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
    console.error('Error updating Richard Hedgepeth appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Richard Hedgepeth appointment:', data);
  return { success: true, data };
};
