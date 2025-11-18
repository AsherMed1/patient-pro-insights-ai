import { supabase } from '@/integrations/supabase/client';

export const updateLindaGirtmanIntake = async () => {
  console.log('Updating Linda Girtman appointment...');
  
  const appointmentId = '07a474a1-c335-4304-9cb8-6268b85124ad';
  
  const updates = {
    parsed_contact_info: {
      name: "Linda Girtman",
      phone: "(478) 227-1784",
      email: "lindagirtman63@gmail.com",
      address: "3529 McKenzie Drive, Macon Georgia 31204"
    },
    parsed_demographics: {
      dob: "1965-01-13",
      age: 60,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Cash option",
      plan: "Cash option",
      group_number: "Cash option",
      alternate_selection: "Other"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "6 months - 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 8,
      symptoms: "Sharp Pain, Stiffness, Dull Ache, Instability or weakness",
      treatments_tried: "Medications/pain pills, Injections, Other",
      imaging_done: "YES",
      primary_complaint: "Both knees - Right knee is worse",
      notes: "The pain has gotten worse this year. X-ray done at Piedmont"
    },
    parsed_medical_info: {
      pcp: "Dr. Peter Allotey, MD",
      pcp_phone: "478-743-8316",
      pcp_address: "2660 Montpelier Ave, Macon, GA 31204",
      imaging_location: "Piedmont"
    },
    ghl_id: "CeZJwblBdQuIGJ7ZmQMs",
    detected_insurance_provider: "Cash option",
    detected_insurance_plan: "Cash option",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Linda Girtman appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Linda Girtman appointment:', data);
  return { success: true, data };
};
