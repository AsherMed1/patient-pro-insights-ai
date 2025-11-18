import { supabase } from '@/integrations/supabase/client';

export const updateRobinStanfordIntake = async () => {
  console.log('Updating Robin K Stanford Sr appointment...');
  
  const appointmentId = '4ac13883-a1c2-4dcd-931b-0894c34bf4c4';
  
  const updates = {
    parsed_contact_info: {
      name: "Robin K Stanford Sr",
      phone: "(478) 225-8150",
      email: "rkstanford@att.net",
      address: "418 Alan A Dale Court, Warner Robins Georgia 31088"
    },
    parsed_demographics: {
      dob: "1957-08-21",
      age: 68,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Anthem BCBS",
      plan: "Anthem BCBS",
      group_number: "GAMCRWPO",
      alternate_selection: "Medicare Advantage"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 8,
      symptoms: "Sharp Pain, Dull Ache, Instability or weakness",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills",
      imaging_done: "YES",
      primary_complaint: "Both knees",
      notes: "Both knees, No recent imaging done 5 years torn meniscus on left knee"
    },
    parsed_medical_info: {
      pcp: "Dr. Walter Steven Wilson, W. STEVEN WILSON, M.D. Family Practice, (478) 322-3800"
    },
    ghl_id: "Yuuki5lvxhNPrOIWAGlh",
    detected_insurance_provider: "Anthem BCBS",
    detected_insurance_plan: "Anthem BCBS",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Robin K Stanford Sr appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Robin K Stanford Sr appointment:', data);
  return { success: true, data };
};
