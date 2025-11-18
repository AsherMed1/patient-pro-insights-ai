import { supabase } from '@/integrations/supabase/client';

export const updateThomasCurtisBergerIntake = async () => {
  console.log('Updating Thomas A Curtis-Berger appointment...');
  
  const appointmentId = '3a4fdd27-0b34-4b5c-801a-7319b2f77fd7';
  
  const updates = {
    parsed_contact_info: {
      name: "Thomas A Curtis-Berger",
      phone: "(870) 331-1850",
      email: "tomcurtis58@gmail.com",
      address: "4421 Elkan Ave, Macon Georgia 31206"
    },
    parsed_demographics: {
      dob: "1958-06-12",
      age: 67,
      gender: "Male"
    },
    parsed_insurance_info: {
      provider: "United Healthcare",
      plan: "United Healthcare",
      group_number: "74159H1889-020-000",
      alternate_selection: "Medicare Advantage"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "NO",
      age_range: "56 and above",
      trauma_related_onset: "NO",
      pain_level: 9,
      symptoms: "Sharp Pain, Grinding sensation",
      treatments_tried: "Injections",
      imaging_done: "YES",
      primary_complaint: "Both knees pain",
      notes: "Patient experiencing pain in both knees, treatment tried is only injection, been experiencing for years, Imaging is available from Dr. Jorgensen at Ortho Georgia"
    },
    parsed_medical_info: {
      pcp: "Dr. Mary Evelyn Mckinley, MD, IM-Peds Primary Care, 360 Hospital Drive, Suite 110, Macon, GA 31217, 478-841-2707",
      imaging_location: "Dr. Jorgensen at Ortho Georgia"
    },
    ghl_id: "P1vDTEcdvY4vxa4ElqhX",
    lead_name: "Thomas A Curtis-Berger",
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
    console.error('Error updating Thomas A Curtis-Berger appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Thomas A Curtis-Berger appointment:', data);
  return { success: true, data };
};
