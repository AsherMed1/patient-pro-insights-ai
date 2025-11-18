import { supabase } from '@/integrations/supabase/client';

export const updateValerieHardenIntake = async () => {
  console.log('Updating Valerie Harden appointment...');
  
  const appointmentId = '1584b258-7b6f-49b7-a379-cd135016be58';
  
  const updates = {
    parsed_contact_info: {
      name: "Valerie Harden",
      phone: "(478) 714-0452",
      email: "valerieharden08@yahoo.com",
      address: "3188 Somerset Drive, Macon Georgia 31206"
    },
    parsed_demographics: {
      dob: "1959-08-14",
      age: 65,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Humana",
      plan: "Humana",
      group_number: "6A546",
      alternate_selection: "Humana"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "1-6 months",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "YES",
      pain_level: 8,
      symptoms: "Sharp Pain, Swelling, Stiffness",
      treatments_tried: "Injections, Medications/pain pills",
      imaging_done: "YES"
    },
    ghl_id: "8G2GsM0HxRhdDG1BZlq1",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/m8G9MBPZWmImUnpcDGvD",
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
    console.error('Error updating Valerie Harden appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Valerie Harden appointment:', data);
  return { success: true, data };
};
