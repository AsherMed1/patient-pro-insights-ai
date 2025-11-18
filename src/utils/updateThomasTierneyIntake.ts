import { supabase } from '@/integrations/supabase/client';

export const updateThomasTierneyIntake = async () => {
  console.log('Updating Thomas Tierney appointment...');
  
  const appointmentId = '67fc3fee-9b49-4c99-91bf-780304f95378';
  
  const updates = {
    parsed_contact_info: {
      name: "Thomas Tierney",
      phone: "(478) 228-1572",
      email: "tierneyt087@gmail.com",
      address: "117 Glacier Trail, Warner Robins Georgia 31088"
    },
    parsed_demographics: {
      dob: "1960-12-07",
      age: 65,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Tricare select",
      plan: "Tricare select",
      alternate_selection: "Other"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "NO",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 5,
      symptoms: "Instability or weakness, Dull Ache, Sharp Pain",
      treatments_tried: "Medications/pain pills, Braces and wraps",
      imaging_done: "NO"
    },
    ghl_id: "4167DoUoeSe9LDeYcqpu",
    detected_insurance_provider: "Tricare select",
    detected_insurance_plan: "Tricare select",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Thomas Tierney appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Thomas Tierney appointment:', data);
  return { success: true, data };
};
