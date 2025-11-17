import { supabase } from '@/integrations/supabase/client';

export const updateBrigitteWilliamsIntake = async () => {
  console.log('Updating Brigitte Williams appointment...');
  
  const appointmentId = '216dc163-d8d5-46f1-a006-61b4e8170bbc';
  
  const updates = {
    parsed_contact_info: {
      name: "Brigitte Williams",
      phone: "(478) 367-5392",
      email: "williamslilianb@gmail.com",
      address: "2360 Crissey Dr, Macon Georgia 31211"
    },
    parsed_demographics: {
      dob: "1959-02-15",
      age: 65,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Humana PPO",
      plan: "80840 9140461101",
      alternate_selection: "Humana"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 10,
      symptoms: "Dull Ache, Stiffness, Instability or weakness",
      treatments_tried: "Injections, Medications/pain pills",
      imaging_done: "YES",
      notes: "Both knees in excruciating pain. Diagnosed with OA & bone on bone. Tried shots which helped somewhat but looking for better relief. Can barely walk. Experiences dull, aching pain with flashes of pain. Pain keeps her up at night and constantly bothers her. Had X-ray done about 2 weeks ago at Georgia Orthopedics. Uses middle initial 'P' (Brigette P Williams) as there are two ladies in Georgia with the same name."
    },
    ghl_id: "EA36aHBLhsLuiDtZVdbW",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Brigitte Williams appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Brigitte Williams appointment:', data);
  return { success: true, data };
};
