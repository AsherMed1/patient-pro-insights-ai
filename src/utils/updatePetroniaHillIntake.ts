import { supabase } from '@/integrations/supabase/client';

export const updatePetroniaHillIntake = async () => {
  console.log('Updating Petronia Hill appointment...');
  
  const appointmentId = '3a6365df-70d8-45b2-a4fa-a32912c46ad3';
  
  const updates = {
    parsed_contact_info: {
      name: "Petronia Hill",
      phone: "(478) 256-4754",
      email: "petron521@gmail.com",
      address: "3579 Plymouth Dr, Macon Georgia 31204"
    },
    parsed_demographics: {
      dob: "1967-02-07",
      age: 58,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Ambetter",
      plan: "Ambetter",
      alternate_selection: "Other"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "6 months - 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "YES",
      pain_level: 9,
      symptoms: "Sharp Pain, Swelling, Stiffness, Instability or weakness",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills",
      imaging_done: "YES",
      primary_complaint: "Both knees",
      notes: "Both knee is in pain for almost a 3-4 yrs now. Bad fall happened last February 2025 and started worst pain. Patient is a nurse and due to the pain she had to change to pediatric home care since she do less mobility. Can still walk but very painful and with cane but stairs patient cannot take the stairs. Wakes up in the middle of the night feeling pain in both knees."
    },
    parsed_medical_info: {
      pcp: "No PCP assigned",
      clinic: "WP Anderson Clinic",
      imaging_location: "Recent imaging (bone scan and x-ray) recently, patient will bring the result"
    },
    ghl_id: "AMZbGSLrt0CqyLcIHsou",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Petronia Hill appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Petronia Hill appointment:', data);
  return { success: true, data };
};
