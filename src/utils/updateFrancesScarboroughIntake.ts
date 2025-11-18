import { supabase } from '@/integrations/supabase/client';

export const updateFrancesScarboroughIntake = async () => {
  console.log('Updating Frances Scarborough appointment...');
  
  const appointmentId = '1725e3d5-dc04-4e88-95b3-655b1b8c6a7f';
  
  const updates = {
    parsed_contact_info: {
      name: "Frances Scarborough",
      phone: "(478) 973-0659",
      email: "boots1949@cox.net",
      address: "4780 Dixon Road, Lizella Georgia 31052"
    },
    parsed_demographics: {
      dob: "1949-11-06",
      age: 76,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Medicare",
      plan: "Medicare",
      alternate_selection: "Medicare"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      pain_level: 8,
      symptoms: "Sharp Pain, Swelling, Instability or weakness",
      treatments_tried: "Injections, Medications/pain pills",
      imaging_done: "YES"
    },
    ghl_id: "AUx9ME9bRSnO5Tz4nv8e",
    detected_insurance_provider: "Medicare",
    detected_insurance_plan: "Medicare",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Frances Scarborough appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Frances Scarborough appointment:', data);
  return { success: true, data };
};
