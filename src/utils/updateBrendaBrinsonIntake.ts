import { supabase } from '@/integrations/supabase/client';

export const updateBrendaBrinsonIntake = async () => {
  console.log('Updating Brenda Brinson appointment...');
  
  const appointmentId = '0ccb4b1b-e9d3-4e70-9850-cd11ba8b4414';
  
  const updates = {
    parsed_contact_info: {
      name: "Brenda Brinson",
      phone: "(404) 731-0855",
      email: "brendabrinson4@gmail.com",
      address: "608 Crabapple Place, Macon Georgia 31217"
    },
    parsed_demographics: {
      dob: "1962-04-06",
      age: 63,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Blue Cross",
      plan: "Blue Cross",
      alternate_selection: "Blue Cross"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 10,
      symptoms: "Sharp Pain",
      treatments_tried: "Medications/pain pills",
      imaging_done: "YES",
      primary_complaint: "Pain on both knees",
      notes: "Diagnosed with arthritis, bone-on-bone. Has tried pain medication and cortisone injections. Sometimes she feels the knees are going to give out. Had imaging done around a year ago."
    },
    parsed_medical_info: {
      pcp: "Dr. Peter Allotey, MD",
      pcp_phone: "478-743-8316",
      pcp_address: "2660 Montpelier Ave, Macon, GA 31204",
      imaging_location: "Around a year ago"
    },
    ghl_id: "8yd15VNNfReqEjdbxa9g",
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
    console.error('Error updating Brenda Brinson appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Brenda Brinson appointment:', data);
  return { success: true, data };
};
