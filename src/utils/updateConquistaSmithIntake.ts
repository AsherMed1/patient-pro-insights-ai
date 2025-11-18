import { supabase } from '@/integrations/supabase/client';

export const updateConquistaSmithIntake = async () => {
  console.log('Updating Conquista Smith appointment...');
  
  const appointmentId = '16b73fbe-a963-4b10-ae05-a4f60356b591';
  
  const updates = {
    parsed_contact_info: {
      name: "Conquista Smith",
      phone: "(478) 775-6268",
      email: "conquistas403@gmail.com",
      address: "3165 Somerset Drive, Macon Georgia 31206"
    },
    parsed_demographics: {
      dob: "1975-04-25",
      age: 50,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Anthem BCBS",
      plan: "Anthem BCBS",
      group_number: "GA8288M053",
      alternate_selection: "Blue Cross",
      notes: "X-rays taken a week ago at Piedmont Hospital. PCP: Dr Muhammad Rehan, MD, 4787457696, Central Georgia Internal Medicine."
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      trauma_related_onset: "NO",
      pain_level: 8,
      symptoms: "Sharp Pain, Stiffness, Dull Ache, Instability or weakness",
      treatments_tried: "Injections, Medications/pain pills, Physical therapy",
      imaging_done: "YES"
    },
    parsed_medical_info: {
      pcp: "Dr Muhammad Rehan, MD",
      clinic: "Central Georgia Internal Medicine",
      pcp_phone: "478-745-7696",
      imaging_location: "Piedmont Hospital",
      imaging_done: "X-rays taken a week ago"
    },
    ghl_id: "6fKTVo8RPL8uX1Z5VSIc",
    detected_insurance_provider: "Anthem BCBS",
    detected_insurance_plan: "Anthem BCBS",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Conquista Smith appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Conquista Smith appointment:', data);
  return { success: true, data };
};
