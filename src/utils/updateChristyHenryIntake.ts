import { supabase } from '@/integrations/supabase/client';

export const updateChristyHenryIntake = async () => {
  console.log('Updating Christy Henry appointment...');
  
  const formattedNotes = `Contact: Name: Christy Henry | Phone: (478) 955-3470 | Email: christyhenryga@gmail.com | DOB: Mar 20th 1974 | Address: 55 Willow Way, Juliette Georgia 31046 | Patient ID: FYOGXFOJ68hkF9fxK5kY /n Insurance: Plan: United Healthcare | Group #: 1646311 | Alt Selection: United Healthcare /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: NO | Pain Level: 10 | Symptoms: Dull Ache, Sharp Pain, Stiffness, Grinding sensation, Instability or weakness | Treatments Tried: Injections | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'FYOGXFOJ68hkF9fxK5kY',
    lead_email: 'christyhenryga@gmail.com',
    lead_phone_number: '(478) 955-3470',
    dob: '1974-03-20',
    detected_insurance_provider: 'United Healthcare',
    detected_insurance_plan: 'United Healthcare',
    detected_insurance_id: '1646311',
    parsed_contact_info: {
      name: 'Christy Henry',
      phone: '(478) 955-3470',
      email: 'christyhenryga@gmail.com',
      address: '55 Willow Way, Juliette Georgia 31046',
      patient_id: 'FYOGXFOJ68hkF9fxK5kY'
    },
    parsed_demographics: {
      dob: '1974-03-20',
      age: 50,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'United Healthcare',
      plan: 'United Healthcare',
      group_number: '1646311',
      alternate_selection: 'United Healthcare'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55',
      trauma_related_onset: 'NO',
      pain_level: 10,
      symptoms: 'Dull Ache, Sharp Pain, Stiffness, Grinding sensation, Instability or weakness',
      treatments_tried: 'Injections',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Christy Henry')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Christy Henry appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Christy Henry appointment:', data);
  return { success: true, data };
};
