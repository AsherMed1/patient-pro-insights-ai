import { supabase } from '@/integrations/supabase/client';

export const updateCarmelWoolcockIntake = async () => {
  console.log('Updating Carmel Woolcock appointment...');
  
  const appointmentId = '11113f31-166d-4501-bd68-8557281b84f2';
  
  const updates = {
    parsed_contact_info: {
      name: "Carmel Woolcock",
      phone: "(404) 933-7813",
      address: "432 Harrow Drive, Perry Georgia 31069"
    },
    parsed_demographics: {
      dob: "1966-01-11",
      age: 59,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Humana",
      plan: "A AND B",
      alternate_selection: "Humana",
      notes: "PCP-DR. Shawmell Haire located in locus grove patient is currently taking no medication has no diabetes"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      age_range: "56 and above"
    },
    parsed_medical_info: {
      pcp: "Dr. Shawmell Haire",
      pcp_address: "Locust Grove",
      medications: "None",
      medical_history: "No diabetes"
    },
    ghl_id: "olPCgfXduo9ZZ8zETtd5",
    detected_insurance_provider: "Humana",
    detected_insurance_plan: "A AND B",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Carmel Woolcock appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Carmel Woolcock appointment:', data);
  return { success: true, data };
};
