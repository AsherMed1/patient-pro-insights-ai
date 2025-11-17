import { supabase } from '@/integrations/supabase/client';

export const updateDebraDuncanIntake = async () => {
  console.log('Updating Debra Duncan appointment...');
  
  const appointmentId = 'c3581543-0063-4835-a553-14b373de36bd';
  
  const updates = {
    parsed_contact_info: {
      name: "Debra Duncan",
      phone: "(478) 841-1084",
      email: "debduncan1962@yahoo.com",
      address: "Warner Robins Georgia 31093"
    },
    parsed_demographics: {
      dob: "1962-11-14",
      age: 63,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Ambetter",
      plan: "Ambetter Peach State",
      group_number: "2CVA"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      trauma_related_onset: "YES",
      pain_level: 9,
      symptoms: "Dull Ache, Sharp Pain, Swelling, Stiffness, Instability or weakness, Grinding sensation",
      treatments_tried: "Injections, Physical therapy",
      imaging_done: "YES",
      notes: "Patient reported pain in both knees for over a year. Pain occurs when she first gets up and later in the afternoon, around 5 PM, after working. Works as a caregiver for people who need sitters. Had injections and imaging done 3 months ago at Atrium."
    },
    ghl_id: "PE7iSjUWoE3SZMC95YNM",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Debra Duncan appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Debra Duncan appointment:', data);
  return { success: true, data };
};
