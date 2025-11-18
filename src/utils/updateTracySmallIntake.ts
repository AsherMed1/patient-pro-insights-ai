import { supabase } from '@/integrations/supabase/client';

export const updateTracySmallIntake = async () => {
  console.log('Updating Tracy Small appointment...');
  
  const appointmentId = '163a6541-39a1-45fb-8f8f-6e882bae6359';
  
  const updates = {
    parsed_contact_info: {
      name: "Tracy Small",
      phone: "(229) 349-1338",
      email: "tesmall25@gmail.com",
      address: "110 Hidesta Court, Kathleen Georgia 31047"
    },
    parsed_demographics: {
      dob: "1964-07-20",
      age: 61,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Trustmark",
      plan: "Trustmark",
      group_number: "BR0000",
      alternate_selection: "Other",
      notes: "Been experiencing pain for almost 2 years. Treatments tried include medications for pain and injections but nothing really helps. Painful to walk and take stairs. Wearing knee braces. X-ray done with inflammation as per Dr. Little Georgia Orthopedics"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      pain_level: 4,
      symptoms: "Sharp Pain, Grinding sensation, Instability or weakness",
      treatments_tried: "Injections, Medications/pain pills",
      imaging_done: "YES"
    },
    parsed_medical_info: {
      pcp: "Dr. Brown",
      clinic: "9857773085",
      location: "Medical Clinic in Fortvalley",
      imaging_location: "Georgia Orthopedics with Dr. Little"
    },
    ghl_id: "3LJerGRpHU6D7bzNxBwx",
    detected_insurance_provider: "Trustmark",
    detected_insurance_plan: "Trustmark",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Tracy Small appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Tracy Small appointment:', data);
  return { success: true, data };
};
