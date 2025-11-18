import { supabase } from '@/integrations/supabase/client';

export const updateMargaretSirIntake = async () => {
  console.log('Updating Margaret Sir appointment...');
  
  const appointmentId = '0c1abaa2-4279-4599-bd09-5c6094e0a32c';
  
  const updates = {
    parsed_contact_info: {
      name: "Margaret Sir",
      phone: "(678) 323-6088",
      email: "info@sirfloors.com",
      address: "6491 State Highway 339, Young Harris Georgia 30582"
    },
    parsed_demographics: {
      dob: "1957-11-11",
      age: 68,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Medicare Part A & B",
      plan: "Medicare Part A & B",
      alternate_selection: "Medicare",
      secondary_insurance: "Mutual of Omaha Supplemental - 333104-96",
      notes: "Right knee, X-rays taken at Piedmont a month ago. PCP: Dr. Parisa Biazar, 6783428660, Piedmont Primary Care at Eastside Crossing."
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      notes: "Right knee"
    },
    parsed_medical_info: {
      pcp: "Dr. Parisa Biazar",
      clinic: "Piedmont Primary Care at Eastside Crossing",
      pcp_phone: "678-342-8660",
      imaging_location: "Piedmont",
      imaging_done: "X-rays taken a month ago"
    },
    ghl_id: "A5UBJiLKKuZqXqRcApcw",
    detected_insurance_provider: "Medicare Part A & B",
    detected_insurance_plan: "Medicare Part A & B",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Margaret Sir appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Margaret Sir appointment:', data);
  return { success: true, data };
};
