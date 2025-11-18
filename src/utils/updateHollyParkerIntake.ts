import { supabase } from '@/integrations/supabase/client';

export const updateHollyParkerIntake = async () => {
  console.log('Updating Holly Elizabeth Parker appointment...');
  
  const appointmentId = '69314a54-822c-4988-859d-4af09b2f41f1';
  
  const updates = {
    parsed_contact_info: {
      name: "Holly Elizabeth Parker",
      phone: "(478) 234-4359",
      email: "parker.hollybeth18@gmail.com",
      address: "130 Bot-Net Road Northwest, Milledgeville Georgia 31061"
    },
    parsed_demographics: {
      dob: "1973-11-04",
      age: 51,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Blue Cross Blue Shield",
      plan: "Blue Cross Blue Shield",
      group_number: "10455874",
      alternate_selection: "Blue Cross"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Less than 1 month",
      oa_or_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      trauma_related_onset: "YES",
      pain_level: 9,
      symptoms: "Grinding sensation, Stiffness, Swelling, Sharp Pain, Dull Ache, Instability or weakness",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills",
      imaging_done: "YES",
      notes: "Patient has been dealing with pain on both knees since she was 18 years old. The right knee is worse. A horse fell on her years ago and she had both knees scoped and torn meniscus. Diagnosed with osteoarthritis, had x-rays done. The orthopedic doctor said she needs total knee replacement but she is obese. Tried cortizone injections and used to take Gabapentin. Uses a walker."
    },
    parsed_medical_info: {
      medications: "Blood thinners, Blood pressure medication, Prozac",
      pcp: "Family Care of Middle Georgia - Dr. Benjamin Ho, MD (3203 Vineville Ave A, Macon, GA 31204 Phone: 478-471-0273)",
      medical_history: "History of knee trauma (horse fell on her), torn meniscus, osteoarthritis, obesity"
    },
    ghl_id: "bIUIQSHMQrcEGEkWKLZm",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Holly Parker appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Holly Parker appointment:', data);
  return { success: true, data };
};
