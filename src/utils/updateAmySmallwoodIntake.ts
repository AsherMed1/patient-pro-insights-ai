import { supabase } from '@/integrations/supabase/client';

export const updateAmySmallwoodIntake = async () => {
  console.log('Updating Amy Smallwood appointment...');
  
  const appointmentId = '3004115e-c597-4309-9133-afaa9f666a3c';
  
  const updates = {
    parsed_contact_info: {
      name: "Amy Smallwood",
      phone: "(478) 672-7694",
      email: "whitetigerfire1978@gmail.com",
      address: "12 Owl Drive, Tillsonburg Ontario N4G 4M7"
    },
    parsed_demographics: {
      dob: "1978-03-31",
      age: 47,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Ambetter",
      plan: "Ambetter",
      group_number: "9728132",
      alternate_selection: "Other",
      notes: "Both knee but right one is worst for pain for almost 3 yrs already. Treatment medication, injections and physical therapy but never really help much. Suggested already needed knee replacement. Bone on bone situation and diagnosed with arthritis. Imaging done XRAY. Will bring during consultation. No PCP at the moment."
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      trauma_related_onset: "NO",
      pain_level: 10,
      symptoms: "Dull Ache, Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness",
      treatments_tried: "Injections, Medications/pain pills",
      other_treatments: "Hot compress, cold. Elevation, loosing weight",
      imaging_done: "YES",
      notes: "Both knee but right one is worst for pain for almost 3 yrs already. Bone on bone situation. No PCP at the moment."
    },
    ghl_id: "KNlbPKi48rU7gR07ESqR",
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
    console.error('Error updating Amy Smallwood appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Amy Smallwood appointment:', data);
  return { success: true, data };
};
