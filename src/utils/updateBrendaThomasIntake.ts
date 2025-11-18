import { supabase } from '@/integrations/supabase/client';

export const updateBrendaThomasIntake = async () => {
  console.log('Updating Brenda S. Thomas appointment...');
  
  const appointmentId = '18aaa6b5-94f4-40a5-946e-93f1db3f7da7';
  
  const updates = {
    parsed_contact_info: {
      name: "Brenda S. Thomas",
      phone: "(478) 284-9875",
      email: "niktaw@hotmail.com",
      address: "115 Janice Pl, Macon Georgia 31211"
    },
    parsed_demographics: {
      dob: "1952-05-26",
      age: 73,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Humana",
      plan: "Humana",
      group_number: "5A531",
      alternate_selection: "Humana"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      treatments_tried: "Injections (cortisone and gel)",
      imaging_done: "YES",
      notes: "Both knees cortisone and gel injections, didn't last long. More than 1 year. No injury."
    },
    parsed_medical_info: {
      pcp: "Dr. Marcus Simmons",
      clinic: "478-781-5065",
      imaging_location: "orthogeorgia - 478-745-4206"
    },
    ghl_id: "ejOIGNLWTWtu3CSU2UdG",
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
    console.error('Error updating Brenda S. Thomas appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Brenda S. Thomas appointment:', data);
  return { success: true, data };
};
