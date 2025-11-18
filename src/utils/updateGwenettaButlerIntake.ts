import { supabase } from '@/integrations/supabase/client';

export const updateGwenettaButlerIntake = async () => {
  console.log('Updating Gwenetta Butler appointment...');
  
  const appointmentId = 'a4e76713-7fd1-49c1-98d9-8708cb831374';
  
  const updates = {
    parsed_contact_info: {
      name: "Gwenetta Butler",
      phone: "(205) 587-1270",
      email: "ggarfield1970@gmail.com",
      address: "913 27th Ave NE, Center Point Alabama 35215"
    },
    parsed_demographics: {
      dob: "1970-05-03",
      age: 55,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "BCBS",
      plan: "BCBS",
      group_number: "91017",
      alternate_selection: "Blue Cross"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      age_range: "46 to 55",
      trauma_related_onset: "NO",
      pain_level: 8,
      symptoms: "Sharp Pain, Instability or weakness, Dull Ache",
      treatments_tried: "Injections, Medications/pain pills",
      imaging_done: "YES"
    },
    ghl_id: "spiVjhsL0lmzRtF40xVJ",
    insurance_id_link: "https://services.leadconnectorhq.com/documents/download/uJPciHhMtsGqpU2tsxhX",
    detected_insurance_provider: "BCBS",
    detected_insurance_plan: "BCBS",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Gwenetta Butler appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Gwenetta Butler appointment:', data);
  return { success: true, data };
};
