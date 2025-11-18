import { supabase } from '@/integrations/supabase/client';

export const updateRoyGrimesIntake = async () => {
  console.log('Updating Roy Grimes appointment...');
  
  const appointmentId = '0f9f7145-8d40-463b-8d87-43064284bed3';
  
  const updates = {
    parsed_contact_info: {
      name: "Roy Grimes",
      phone: "(478) 993-6411",
      email: "quarryman1973@gmail.com",
      address: "990 Abercrombie Rd, Culloden Georgia 31016"
    },
    parsed_demographics: {
      dob: "1973-03-09",
      age: 52,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Blue Cross",
      plan: "04336",
      group_number: "Pe8352",
      alternate_selection: "Blue Cross"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      trauma_related_onset: "YES",
      age_range: "46 to 55",
      pain_level: 6,
      symptoms: "Sharp Pain, Swelling, Grinding sensation",
      treatments_tried: "Tylenol arthritis"
    },
    ghl_id: "NOsKGnPcDJT06pQvuA20",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/hlKccXYScqCQHlRFaUqd",
    detected_insurance_provider: "Blue Cross",
    detected_insurance_plan: "04336",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Roy Grimes appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Roy Grimes appointment:', data);
  return { success: true, data };
};
