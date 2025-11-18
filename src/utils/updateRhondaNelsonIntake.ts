import { supabase } from '@/integrations/supabase/client';

export const updateRhondaNelsonIntake = async () => {
  console.log('Updating Rhonda Nelson appointment...');
  
  const appointmentId = '497f3578-89f6-471c-a4b9-bc75dfeb46c4';
  
  const updates = {
    parsed_contact_info: {
      name: "Rhonda Nelson",
      phone: "(478) 443-4472",
      email: "danica062@gmail.com",
      address: "135 Meriweather Circle, Milledgeville Georgia 31061"
    },
    parsed_demographics: {
      dob: "1977-10-24",
      age: 47,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Ambetter",
      plan: "Ambetter",
      group_number: "2CVA",
      alternate_selection: "Other",
      notes: "Both knees, more left than right, injured left knee, Has had shots"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "6 months - 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      primary_complaint: "knee pain",
      notes: "Both knees, more left than right, injured left knee, Has had shots"
    },
    ghl_id: "I7kVW8zOKLAwGvZm8A2a",
    detected_insurance_provider: "Ambetter",
    detected_insurance_plan: "Ambetter",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Rhonda Nelson appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Rhonda Nelson appointment:', data);
  return { success: true, data };
};
