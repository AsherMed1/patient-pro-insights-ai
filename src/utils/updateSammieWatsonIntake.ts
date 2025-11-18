import { supabase } from '@/integrations/supabase/client';

export const updateSammieWatsonIntake = async () => {
  console.log('Updating Sammie Watson appointment...');
  
  const appointmentId = '0c1d8412-4615-4b88-8cba-471841990ccf';
  
  const updates = {
    parsed_contact_info: {
      name: "Sammie Watson",
      phone: "(404) 960-0112",
      email: "sammiewatson47@gmail.com",
      address: "1 6th Street, Jackson Georgia 30233"
    },
    parsed_demographics: {
      dob: "1954-04-07",
      age: 71,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Blue Cross",
      plan: "Blue Cross",
      group_number: "no",
      alternate_selection: "Blue Cross"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 10,
      symptoms: "Sharp Pain, Instability or weakness, Grinding sensation, Stiffness, Swelling, Dull Ache",
      treatments_tried: "Injections, Medications/pain pills, Physical therapy, Knee replacement",
      imaging_done: "YES",
      notes: "Patient has been dealing with pain on both knees for many years. Had a total knee replacement on the left side in 2013. He had tried injections on both knees before getting the surgery done. Has tried physical therapy and pain medication but he doesn't take it anymore. Has had imaging done, diagnosed with osteoarthritis."
    },
    parsed_medical_info: {
      pcp: "Madan Shashi MD",
      pcp_address: "135 N Oak St, Jackson, GA 30233",
      pcp_phone: "770-775-7675"
    },
    ghl_id: "OXIsAK8fEVTsh3xpyuu4",
    detected_insurance_provider: "Blue Cross",
    detected_insurance_plan: "Blue Cross",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Sammie Watson appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Sammie Watson appointment:', data);
  return { success: true, data };
};
