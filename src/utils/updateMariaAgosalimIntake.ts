import { supabase } from '@/integrations/supabase/client';

export const updateMariaAgosalimIntake = async () => {
  console.log('Updating Maria Agosalim McNair appointment...');
  
  const appointmentId = 'e4d621ed-7dea-40be-805e-823068f635a0';
  
  const updates = {
    parsed_contact_info: {
      name: "Maria Agosalim McNair",
      phone: "(478) 396-1187",
      email: "gaworkout@yahoo.com",
      address: "307 Lakeshore Dr, Warner Robins Georgia 31088"
    },
    parsed_demographics: {
      dob: "1963-07-11",
      age: 62,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Ambetter Healthcare",
      plan: "Ambetter Healthcare",
      group_number: "2CVA",
      alternate_selection: "Other"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "YES",
      pain_level: 7,
      symptoms: "Swelling, Stiffness, Instability or weakness",
      treatments_tried: "Injections",
      imaging_done: "YES",
      primary_complaint: "Right knee pain",
      notes: "Injection didn't work, 1 year, no injury, imaging done - will bring"
    },
    parsed_medical_info: {
      pcp: "Dr. Rommer Tayag",
      pcp_phone: "478-929-2909"
    },
    ghl_id: "m1hpW1eHkGQiNx3RCyGU",
    detected_insurance_provider: "Ambetter Healthcare",
    detected_insurance_plan: "Ambetter Healthcare",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Maria Agosalim McNair appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Maria Agosalim McNair appointment:', data);
  return { success: true, data };
};
