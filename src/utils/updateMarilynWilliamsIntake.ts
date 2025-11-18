import { supabase } from '@/integrations/supabase/client';

export const updateMarilynWilliamsIntake = async () => {
  console.log('Updating Marilyn Williams appointment...');
  
  const appointmentId = '21be1f55-d8ac-40b4-8905-ca61324eafeb';
  
  const updates = {
    parsed_contact_info: {
      name: "Marilyn Williams",
      phone: "(478) 396-5256",
      email: "mbwangel@aol.com",
      address: "532 Grand Ave, Bonaire Georgia 31005"
    },
    parsed_demographics: {
      dob: "1954-11-14",
      age: 71,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Medicare",
      plan: "A and B",
      group_number: "A and B",
      alternate_selection: "Medicare",
      notes: "Secondary with Mutual of Omaha"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above"
    },
    ghl_id: "KdDsdsPohHcy5hL3k6R9",
    detected_insurance_provider: "Medicare",
    detected_insurance_plan: "A and B",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Marilyn Williams appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Marilyn Williams appointment:', data);
  return { success: true, data };
};
