import { supabase } from '@/integrations/supabase/client';

export const updateEdwardWilloughbyIntake = async () => {
  console.log('Updating Edward Willoughby appointment...');
  
  const appointmentId = '08b4c012-9e99-4494-89da-be02eeec177f';
  
  const updates = {
    parsed_contact_info: {
      name: "Edward Willoughby",
      phone: "(478) 718-5588",
      email: "andyac1157@yahoo.com",
      address: "124 Joe Chambers Rd, Forsyth Georgia 31029"
    },
    parsed_demographics: {
      dob: "1965-04-27",
      age: 59,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Complete Silver",
      plan: "Complete Silver",
      alternate_selection: "Other"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "1-6 months",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "YES",
      pain_level: 7,
      symptoms: "Swelling, Stiffness, Sharp Pain, Instability or weakness, Grinding sensation",
      treatments_tried: "Injections",
      imaging_done: "YES"
    },
    ghl_id: "MDsbZN6PjHhrloJJ73yr",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/i5md4hIPPVOu4rDbvC8Z",
    detected_insurance_provider: "Complete Silver",
    detected_insurance_plan: "Complete Silver",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Edward Willoughby appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Edward Willoughby appointment:', data);
  return { success: true, data };
};
