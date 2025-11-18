import { supabase } from '@/integrations/supabase/client';

export const updateJohnRobertsIntake = async () => {
  console.log('Updating John Roberts appointment...');
  
  const appointmentId = '5e9e52ce-bda5-4c24-a942-3031c1d13da5';
  
  const updates = {
    parsed_contact_info: {
      name: "John Roberts",
      phone: "(478) 960-7917",
      email: "zippotools307@gmail.com",
      address: "374 Roger Drive, Byron Georgia 31008"
    },
    parsed_demographics: {
      dob: "1958-03-07",
      age: 67,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "United Healthcare",
      plan: "United Healthcare",
      group_number: "74159H1889-020-000",
      alternate_selection: "United Healthcare"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 9,
      symptoms: "Instability or weakness, Dull Ache, Stiffness",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills",
      imaging_done: "YES",
      notes: "Pain on both knees since several years ago, bone on bone. No injuries nor trauma. Dull ache when walking - when relaxing the leg it gets better. Has tried all types of knee shots. Has tried physical therapy but no positive results. Prescription medicine for knee pain. No recent pictures done."
    },
    parsed_medical_info: {
      pcp: "Dr. Husein",
      clinic: "478-971-2130",
      imaging_location: "No recent pictures done"
    },
    ghl_id: "PHuySLD29ENMBz8zFU4Z",
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
    console.error('Error updating John Roberts appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated John Roberts appointment:', data);
  return { success: true, data };
};
