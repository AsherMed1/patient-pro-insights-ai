import { supabase } from '@/integrations/supabase/client';

export const updateVeronicaDyousIntake = async () => {
  console.log('Updating Veronica Dyous appointment...');
  
  const appointmentId = '52232f95-c96d-4fcd-8bd1-383d579e8a25';
  
  const updates = {
    parsed_contact_info: {
      name: "Veronica Dyous",
      phone: "(478) 234-6502",
      email: "dyousv@yahoo.com",
      address: "118 Vanogden Dr NE, Milledgeville Georgia 31061"
    },
    parsed_demographics: {
      dob: "1976-06-24",
      age: 49,
      gender: "Female"
    },
    parsed_insurance_info: {
      provider: "Cigna",
      plan: "Cigna",
      group_number: "2499294",
      alternate_selection: "Other",
      notes: "Has pain on right knee"
    },
    parsed_pathology_info: {
      procedure: "GAE",
      duration: "Over 1 year",
      oa_tkr_diagnosed: "YES",
      age_range: "46 to 55",
      trauma_related_onset: "NO",
      pain_level: 10,
      symptoms: "Instability or weakness, Grinding sensation, Stiffness, Swelling, Sharp Pain",
      treatments_tried: "Injections, Physical therapy, Medications/pain pills, BioFreeze, Voltren",
      imaging_done: "YES",
      notes: "Right knee pain"
    },
    parsed_medical_info: {
      pcp: "Dr. Patrice Darcelle Boddie",
      clinic: "Boddie Medical",
      pcp_phone: "478-452-6999",
      imaging_location: "Patient will try to bring X-rays",
      imaging_done: "X-rays done in the last 2 years"
    },
    ghl_id: "lhxC7Q0OcttvwpQPf6CD",
    detected_insurance_provider: "Cigna",
    detected_insurance_plan: "Cigna",
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Veronica Dyous appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Veronica Dyous appointment:', data);
  return { success: true, data };
};
