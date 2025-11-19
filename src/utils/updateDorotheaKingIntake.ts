import { supabase } from '@/integrations/supabase/client';

export const updateDorotheaKingIntake = async () => {
  console.log('Updating Dorothea King appointment...');
  
  const formattedNotes = `Contact: Name: Dorothea King | Phone: (478) 308-4728 | Email: kingdorothea44@gmail.com | DOB: Dec 7th 1969 | Address: 338 Sapp Road, Dry Branch Georgia 31020 | Patient ID: 2UT9azVJHDr7mErLzElI /n Insurance: Plan: United Healthcare Dual Complete | Group #: 00477 | Alt Selection: United Healthcare /n Pathology: GAE - Duration: 6 months - 1 year | Age Range: 46 to 55 | Trauma-related Onset: NO | Pain Level: 10 | Symptoms: Sharp Pain, Swelling, Stiffness, Grinding sensation, Dull Ache, Instability or weakness | Treatments Tried: Injections, Medications/pain pills, Heat packs, cream | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: '2UT9azVJHDr7mErLzElI',
    lead_email: 'kingdorothea44@gmail.com',
    lead_phone_number: '(478) 308-4728',
    dob: '1969-12-07',
    detected_insurance_provider: 'United Healthcare',
    detected_insurance_plan: 'United Healthcare Dual Complete',
    detected_insurance_id: '00477',
    parsed_contact_info: {
      name: 'Dorothea King',
      phone: '(478) 308-4728',
      email: 'kingdorothea44@gmail.com',
      address: '338 Sapp Road, Dry Branch Georgia 31020',
      patient_id: '2UT9azVJHDr7mErLzElI'
    },
    parsed_demographics: {
      dob: '1969-12-07',
      age: 55,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'United Healthcare',
      plan: 'United Healthcare Dual Complete',
      group_number: '00477',
      alternate_selection: 'United Healthcare'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: '6 months - 1 year',
      age_range: '46 to 55',
      trauma_related_onset: 'NO',
      pain_level: 10,
      symptoms: 'Sharp Pain, Swelling, Stiffness, Grinding sensation, Dull Ache, Instability or weakness',
      treatments_tried: 'Injections, Medications/pain pills, Heat packs, cream',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Dorothea King')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Dorothea King appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Dorothea King appointment:', data);
  return { success: true, data };
};
