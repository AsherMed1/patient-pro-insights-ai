import { supabase } from '@/integrations/supabase/client';

export const updateAngelaTrippeIntake = async () => {
  console.log('Updating Angela Trippe appointment...');
  
  const appointmentId = '9407012a-2c06-442a-8b14-def0a4619e08';
  
  const updates = {
    parsed_contact_info: {
      name: "Angela Trippe",
      phone: "(478) 363-4368",
      email: "angelatrippe71@gmail.com",
      address: "1667 Woodbine Rd, Milledgeville Georgia 31061"
    },
    parsed_demographics: {
      dob: "1971-06-06",
      age: 54,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "United",
      plan: "United",
      group_number: "926044",
      alternate_selection: "United"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      trauma_related_onset: "NO",
      pain_level: 8,
      symptoms: "Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills",
      imaging_done: "YES",
      primary_complaint: "Pain on the right knee",
      notes: "Pain has been ongoing for over a decade. No injuries or trauma before pain started. The pain is very intense all the time unless she gets to rest and keep the knee up for an entire day. She has tried shots, physical therapy and pain medicine. Patient will try to provide pictures done prior to hip replacement that show the knee."
    },
    parsed_medical_info: {
      pcp: "Dr. Nazier",
      pcp_phone: "478-452-3700",
      imaging_location: "Prior to hip replacement"
    },
    ghl_id: "HF0WSHuTRe1YpBzn7HBu",
    detected_insurance_provider: "United",
    detected_insurance_plan: "United",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Angela Trippe appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Angela Trippe appointment:', data);
  return { success: true, data };
};
