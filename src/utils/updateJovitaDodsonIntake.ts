import { supabase } from '@/integrations/supabase/client';

export const updateJovitaDodsonIntake = async () => {
  console.log('Updating Jovita Dodson appointment...');
  
  const appointmentId = '314b4a50-c6d3-4ff2-91fa-b79d16808322';
  
  const updates = {
    parsed_contact_info: {
      name: "Jovita Dodson",
      phone: "(478) 998-9712",
      email: "rositatab.mom@gmail.com",
      address: "93 Carol Lynn Drive, Dry Branch Georgia 31020"
    },
    parsed_demographics: {
      dob: "1956-08-26",
      age: 69,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "United Health care",
      plan: "United Health care",
      alternate_selection: "United Healthcare"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "6 months - 1 year",
      oa_tkr_diagnosed: "NO",
      age_range: "56 and above",
      notes: "The patient has been suffering with knee pain for over a year and has been taking pain medication which numbs the pain for a few hours. The patient mentions that they have had a few X-rays and MRI's and was advised to bring this with to the consultation."
    },
    parsed_medical_info: {
      pcp: "Dr Sherri Graham",
      pcp_address: "109 S 3rd Street Cochran, GA 31014",
      pcp_phone: "478 934 4988"
    },
    ghl_id: "yNJTqJskqlgRb8XmoblS",
    detected_insurance_provider: "United Health care",
    detected_insurance_plan: "United Health care",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Jovita Dodson appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Jovita Dodson appointment:', data);
  return { success: true, data };
};
