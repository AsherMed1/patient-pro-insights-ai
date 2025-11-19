import { supabase } from '@/integrations/supabase/client';

const updateShawnBurnettIntake = async () => {
  console.log('Updating Shawn Burnett appointment...');
  
  const formattedNotes = `Contact: Name: Shawn Burnett | Phone: (478) 258-7229 | Email: shawnburnett896@gmail.com | DOB: Aug 17th 1970 | Address: 330 Willow Cove, Lizella Georgia 31052 | Patient ID: VwFeHZFsyTICOEnsmVHD /n Insurance: Plan: Base plan | Group #: 00494 | Alt Selection: Other | Upload: https://services.leadconnectorhq.com/documents/download/fsC1Euz9dIi8ijnl9No5 /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: NO | Pain Level: 7 | Symptoms: Swelling, Stiffness, Instability or weakness, Sharp Pain | Treatments Tried: Injections | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'VwFeHZFsyTICOEnsmVHD',
    lead_email: 'shawnburnett896@gmail.com',
    lead_phone_number: '(478) 258-7229',
    dob: '1970-08-17',
    insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/fsC1Euz9dIi8ijnl9No5',
    detected_insurance_provider: 'Other',
    detected_insurance_plan: 'Base plan',
    parsed_contact_info: {
      name: 'Shawn Burnett',
      phone: '(478) 258-7229',
      email: 'shawnburnett896@gmail.com',
      address: '330 Willow Cove, Lizella Georgia 31052',
      patient_id: 'VwFeHZFsyTICOEnsmVHD'
    },
    parsed_demographics: {
      dob: '1970-08-17',
      age: 55,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'Other',
      plan: 'Base plan',
      group_number: '00494',
      alternate_selection: 'Other',
      insurance_card_url: 'https://services.leadconnectorhq.com/documents/download/fsC1Euz9dIi8ijnl9No5'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55',
      trauma_related_onset: 'NO',
      pain_level: 7,
      symptoms: 'Swelling, Stiffness, Instability or weakness, Sharp Pain',
      treatments_tried: 'Injections',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Shawn Burnett')
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Shawn Burnett appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Shawn Burnett appointment:', data);
  return { success: true, data };
};

// Execute the update
updateShawnBurnettIntake();

export { updateShawnBurnettIntake };
