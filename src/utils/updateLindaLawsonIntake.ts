import { supabase } from '@/integrations/supabase/client';

export const updateLindaLawsonIntake = async () => {
  console.log('Updating Linda L Lawson appointment...');
  
  const appointmentId = '12f39449-bf3e-4e7c-b4cf-a75354eff5ce';
  
  const updates = {
    parsed_contact_info: {
      name: "Linda L Lawson",
      phone: "(229) 313-0468",
      email: "llawson27@myyahoo.com",
      address: "209 Airport Road, Abbeville Georgia 31001"
    },
    parsed_demographics: {
      dob: "1952-01-27",
      age: 73,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Uhc dual complete",
      plan: "Uhc dual complete",
      group_number: "72872 h3256002000",
      alternate_selection: "United Healthcare"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 9,
      symptoms: "Stiffness, Swelling, Sharp Pain, Instability or weakness",
      treatments_tried: "Injections, Medications/pain pills",
      imaging_done: "YES"
    },
    ghl_id: "SybDVY9Wovo8V7Tqshgp",
    detected_insurance_provider: "Uhc dual complete",
    detected_insurance_plan: "Uhc dual complete",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Linda L Lawson appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Linda L Lawson appointment:', data);
  return { success: true, data };
};
