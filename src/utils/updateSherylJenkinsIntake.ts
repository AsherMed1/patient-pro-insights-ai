import { supabase } from '@/integrations/supabase/client';

export const updateSherylJenkinsIntake = async () => {
  console.log('Updating Sheryl Jenkins appointment...');
  
  const appointmentId = '1a2d9cea-6ce9-4681-98c9-f5d11df5897b';
  
  const updates = {
    parsed_contact_info: {
      name: "Sheryl Jenkins",
      phone: "(786) 742-1764",
      email: "sherryberry2u@gmail.com",
      address: "822 Pansy Avenue, Macon Georgia 31204"
    },
    parsed_demographics: {
      dob: "1962-12-22",
      age: 62,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "UHC Dual Complete",
      plan: "UHC Dual.Complete GA S001 PPO D SNP",
      group_number: "72866",
      alternate_selection: "United Healthcare",
      notes: "Medicaid"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 9,
      symptoms: "Instability or weakness, Stiffness, Swelling, Sharp Pain, Dull Ache",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills, Gel injections",
      imaging_done: "YES"
    },
    ghl_id: "vetTOWSM9vNgLDlL7eZA",
    detected_insurance_provider: "UHC Dual Complete",
    detected_insurance_plan: "UHC Dual.Complete GA S001 PPO D SNP",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Sheryl Jenkins appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Sheryl Jenkins appointment:', data);
  return { success: true, data };
};
