import { supabase } from '@/integrations/supabase/client';

export const updateTimmyAkinsIntake = async () => {
  console.log('Updating Timmy Akins appointment...');
  
  const appointmentId = '0cc78621-9d1a-42fd-bd79-700290e6bb5a';
  
  const updates = {
    parsed_contact_info: {
      name: "Timmy Akins",
      phone: "(478) 365-9055",
      email: "napower41@gmail.com",
      address: "210 Byrd Road, Culloden Georgia 31016"
    },
    parsed_demographics: {
      dob: "1970-11-28",
      age: 54,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Anthem Blue Cross Blue Shield",
      plan: "Anthem Blue Cross Blue Shield",
      alternate_selection: "Blue Cross",
      notes: "Right knee in pain for almost 1 yr. Treatment tried is physical therapy. It helps still with pain relief, but only temporary pain relief. Diagnosed with Orthoarthritis and bone on bone patient. Really stiff in right knee every time he wakes up. Imaging done in Griffin Orthopedics in Griffin Georgia"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      trauma_related_onset: "YES",
      pain_level: 7,
      symptoms: "Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness",
      treatments_tried: "Physical therapy",
      imaging_done: "YES"
    },
    parsed_medical_info: {
      pcp: "Fred Gaton",
      clinic: "478 836 2819",
      location: "North Macon Family Healthcare, 420 Lamar Rd, Macon, GA 31210",
      imaging_location: "Griffin Orthopedics in Griffin Georgia"
    },
    ghl_id: "lRrit2ygnF8jCoJmxu5O",
    detected_insurance_provider: "Anthem Blue Cross Blue Shield",
    detected_insurance_plan: "Anthem Blue Cross Blue Shield",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Timmy Akins appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Timmy Akins appointment:', data);
  return { success: true, data };
};
