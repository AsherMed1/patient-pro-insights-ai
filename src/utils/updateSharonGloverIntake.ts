import { supabase } from '@/integrations/supabase/client';

export const updateSharonGloverIntake = async () => {
  console.log('Updating Sharon Glover appointment...');
  
  const appointmentId = '1863c007-d80a-4e8c-9b12-36487db9825f';
  
  const updates = {
    parsed_contact_info: {
      name: "Sharon Glover",
      phone: "(478) 957-9926",
      email: "glover.sharon@yahoo.com",
      address: "1455 Helon Street, Macon Georgia 31204"
    },
    parsed_demographics: {
      dob: "1972-01-31",
      age: 53,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Standard Silver",
      plan: "Standard Silver",
      alternate_selection: "Other"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      trauma_related_onset: "NO",
      pain_level: 10,
      symptoms: "Sharp Pain, Stiffness, Grinding sensation, Instability or weakness, Swelling, Dull Ache",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills",
      imaging_done: "YES"
    },
    ghl_id: "wRY9CIClcKvE0HX0LUUT",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/x54DggnGl0HkJDk5Zh3Q",
    detected_insurance_provider: "Standard Silver",
    detected_insurance_plan: "Standard Silver",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Sharon Glover appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Sharon Glover appointment:', data);
  return { success: true, data };
};
