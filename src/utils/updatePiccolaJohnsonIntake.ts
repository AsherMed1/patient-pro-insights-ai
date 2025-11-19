import { supabase } from '@/integrations/supabase/client';

export const updatePiccolaJohnsonIntake = async () => {
  console.log('Updating Piccola Johnson appointment...');
  
  const formattedNotes = `Contact: Name: Piccola Johnson | Phone: (478) 320-7979 | Email: piccolajohnson@gmail.com | DOB: May 7th 1980 | Address: 3223 Kingston Court, Macon Georgia 31217 | Patient ID: 1aA0dUBoixTpiU4btadM /n Insurance: Plan: BlueCross BlueShield | Group #: 080472 | Alt Selection: Blue Cross | Upload: https://services.leadconnectorhq.com/documents/download/JK1Uu8DOBl3tT0zBO1CH /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 36 to 45 | Pain Level: 6 | Symptoms: Sharp Pain, Stiffness, Dull Ache, Instability or weakness, Swelling | Treatments Tried: Medications/pain pills, Injections | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: '1aA0dUBoixTpiU4btadM',
    lead_email: 'piccolajohnson@gmail.com',
    lead_phone_number: '(478) 320-7979',
    dob: '1980-05-07',
    detected_insurance_provider: 'Blue Cross Blue Shield',
    detected_insurance_plan: 'BlueCross BlueShield',
    detected_insurance_id: '080472',
    insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/JK1Uu8DOBl3tT0zBO1CH',
    parsed_contact_info: {
      name: 'Piccola Johnson',
      phone: '(478) 320-7979',
      email: 'piccolajohnson@gmail.com',
      address: '3223 Kingston Court, Macon Georgia 31217',
      patient_id: '1aA0dUBoixTpiU4btadM'
    },
    parsed_demographics: {
      dob: '1980-05-07',
      age: 44,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Blue Cross Blue Shield',
      plan: 'BlueCross BlueShield',
      group_number: '080472',
      alternate_selection: 'Blue Cross'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '36 to 45',
      pain_level: 6,
      symptoms: 'Sharp Pain, Stiffness, Dull Ache, Instability or weakness, Swelling',
      treatments_tried: 'Medications/pain pills, Injections',
      imaging_done: 'YES'
    },
    parsed_medical_info: {
      treatments_tried: 'Medications/pain pills, Injections',
      imaging_status: 'Completed'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Piccola Johnson')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Piccola Johnson appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Piccola Johnson appointment:', data);
  return { success: true, data };
};
