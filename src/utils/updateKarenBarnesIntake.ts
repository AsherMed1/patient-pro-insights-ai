import { supabase } from '@/integrations/supabase/client';

export const updateKarenBarnesIntake = async () => {
  console.log('Updating Karen Barnes appointment...');
  
  const appointmentId = '29a41ad0-1a50-4d0f-b78e-8ceeda0df7e0';
  
  const updates = {
    parsed_contact_info: {
      name: "Karen Barnes",
      phone: "(478) 201-8239",
      email: "karenbarnes0414@gmail.com",
      address: "1212 Gray Highway apartment 1716, Macon Georgia 31211"
    },
    parsed_demographics: {
      dob: "1963-04-14",
      age: 62,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "United Healthcare",
      plan: "United Healthcare",
      group_number: "01191",
      alternate_selection: "United Healthcare"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      trauma_related_onset: "NO",
      pain_level: 10,
      symptoms: "Sharp Pain, Stiffness",
      treatments_tried: "Injections, Physical therapy",
      imaging_done: "YES",
      notes: "Both knees, Has had shots"
    },
    parsed_medical_info: {
      pcp: "Dr. Hall",
      imaging_location: "No imaging"
    },
    ghl_id: "z9q3tSltrerW3SaowbC9",
    detected_insurance_provider: "United Healthcare",
    detected_insurance_plan: "United Healthcare",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Karen Barnes appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Karen Barnes appointment:', data);
  return { success: true, data };
};
