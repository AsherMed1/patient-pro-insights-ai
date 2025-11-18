import { supabase } from '@/integrations/supabase/client';

export const updateGregHowardIntake = async () => {
  console.log('Updating Greg Howard appointment...');
  
  const appointmentId = '020841ce-504c-427b-bc63-136113218ae0';
  
  const updates = {
    parsed_contact_info: {
      name: "Greg Howard",
      phone: "(478) 787-3068",
      email: "greghoward360@yahoo.com",
      address: "1781 Arlington Park, Macon Georgia 31204"
    },
    parsed_demographics: {
      dob: "1969-08-02",
      age: 56,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "Ambetter",
      plan: "Ambetter",
      alternate_selection: "Other"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 9,
      symptoms: "Stiffness, Swelling, Sharp Pain, Dull Ache, Instability or weakness",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills",
      imaging_done: "YES",
      notes: "Both knees injections, didn't last 1 year, No injury, Imaging: yes, will bring to appt."
    },
    parsed_medical_info: {
      pcp: "Dr. Walter Hoods, Hutchings Health Care, 478-405-2222",
      imaging_location: "Will bring to appointment"
    },
    ghl_id: "eBoKgXdig5dhXc0NqsBr",
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
    console.error('Error updating Greg Howard appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Greg Howard appointment:', data);
  return { success: true, data };
};
