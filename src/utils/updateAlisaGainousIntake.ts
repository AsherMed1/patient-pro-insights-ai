import { supabase } from '@/integrations/supabase/client';

export const updateAlisaGainousIntake = async () => {
  console.log('Updating Alisa Gainous appointment...');
  
  const appointmentId = '97bf0028-3395-4a19-99dc-b106a588769c';
  
  const updates = {
    parsed_contact_info: {
      name: "Alisa Gainous",
      phone: "(478) 951-9288",
      email: "delilahmorgan@yahoo.com",
      address: "205 Somerset Dr, Warner Robins Georgia 31088"
    },
    parsed_demographics: {
      dob: "1968-11-20",
      age: 56,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Ambetter",
      plan: "Ambetter",
      group_number: "2CVA",
      alternate_selection: "Other"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Less than 1 month",
      age_range: "56 and above",
      pain_level: 8,
      symptoms: "Dull Ache, Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness",
      treatments_tried: "Medications/pain pills, Prednisone pills",
      imaging_done: "YES",
      notes: "Patient reports bilateral knee pain, primarily affecting the left knee. Some days, she is unable to walk well and requires the use of a walker or cane. Pain medications provide only temporary relief. X-ray was done a week ago at Halston Healthcare Pavilion."
    },
    parsed_medical_info: {
      medical_history: "History of DVT/PE",
      pcp: "No PCP"
    },
    ghl_id: "hJMkdOqSNSDNCLTfN8sr",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Alisa Gainous appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Alisa Gainous appointment:', data);
  return { success: true, data };
};
