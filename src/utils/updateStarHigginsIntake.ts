import { supabase } from '@/integrations/supabase/client';

export const updateStarHigginsIntake = async () => {
  console.log('Updating Star Shamaine Higgins appointment...');
  
  const appointmentId = 'b5d1b4a7-664e-46e1-b683-a95a09a72e6f';
  
  const updates = {
    parsed_contact_info: {
      name: "Star Shamaine Higgins",
      phone: "(678) 467-7356",
      email: "star.higgins12@myyahoo.com",
      address: "6363 Pine View Terrace, Riverdale Georgia 30296"
    },
    parsed_demographics: {
      dob: "1975-11-11",
      age: 50,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Ambetter",
      plan: "Ambetter Peach state",
      group_number: "U7132296001",
      alternate_selection: "Other"
    },
    parsed_pathology_info: {
      procedure: "UFE",
      period_length: "8 days or more",
      heaviness: "Very heavy (using double protection or experiencing accidents)",
      pelvic_pain: "Frequently",
      fullness_pressure: "Constantly",
      interference: "Constantly",
      urinary: "Frequent urination",
      intercourse_pain: "Occasionally",
      fatigue: "Constantly",
      previous_treatments: "Other - N/A"
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Star Shamaine Higgins appointment:', data);
  return { success: true, data };
};
