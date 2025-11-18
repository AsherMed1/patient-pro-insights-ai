import { supabase } from '@/integrations/supabase/client';

export const updateErikaNaylorIntake = async () => {
  console.log('Updating Erika Naylor appointment...');
  
  const appointmentId = '7a13053f-35b9-4ca5-a3b6-8c4ebb29cba7';
  
  const updates = {
    parsed_contact_info: {
      name: "Erika Naylor",
      phone: "(478) 388-0938",
      email: "eedgerton1979@yahoo.com",
      address: "100 Hampshire Ln, Warner Robins Georgia 31093"
    },
    parsed_demographics: {
      dob: "1979-11-05",
      age: 46,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Ambetter",
      plan: "Ambetter",
      group_number: "2CVA",
      alternate_selection: "Other"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "NO",
      age_range: "46 to 55",
      trauma_related_onset: "NO",
      pain_level: 9,
      symptoms: "Instability or weakness, Grinding sensation, Dull Ache, Sharp Pain",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills",
      imaging_done: "YES",
      notes: "Right knee with pain. Several years with pain. Patient tried injections. Patient will try to bring imaging results."
    },
    parsed_medical_info: {
      pcp: "First Choice Primary",
      clinic: "478-225-9449"
    },
    ghl_id: "utaX4Kuna1xDgyOegSDt",
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
    console.error('Error updating Erika Naylor appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Erika Naylor appointment:', data);
  return { success: true, data };
};
