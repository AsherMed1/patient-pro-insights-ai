import { supabase } from '@/integrations/supabase/client';

export const updateHoraceJonesIntake = async () => {
  console.log('Updating Horace Jones Jr appointment...');
  
  const appointmentId = '98cb83fa-cda2-4aaa-8c02-84582d7fe646';
  
  const updates = {
    parsed_contact_info: {
      name: "Horace Jones Jr",
      phone: "(706) 818-0204",
      email: "horacejonesjr573@gmail.com",
      address: "1180 Turner Road, Madison Georgia 30650"
    },
    parsed_demographics: {
      dob: "1979-05-03",
      age: 46,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Ambetter Healthcare",
      plan: "Ambetter Healthcare",
      alternate_selection: "Other",
      notes: "Left knee pain, weakness, pain meds for 3 years"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      trauma_related_onset: "YES",
      pain_level: 9,
      symptoms: "Swelling, Stiffness, Instability or weakness, Sharp Pain",
      treatments_tried: "Medications/pain pills, Other",
      imaging_done: "YES",
      notes: "Left knee pain with weakness. Has been on pain medications for 3 years."
    },
    ghl_id: "OrjCO2AX1MBtGBJDaItt",
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
    console.error('Error updating Horace Jones Jr appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Horace Jones Jr appointment:', data);
  return { success: true, data };
};
