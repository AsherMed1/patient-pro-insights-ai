import { supabase } from '@/integrations/supabase/client';

export const updateSandraWestmorelandIntake = async () => {
  console.log('Updating Sandra Westmoreland appointment...');
  
  const formattedNotes = `Contact: Name: Sandra Westmoreland | Phone: (248) 727-8216 | Email: mzflame50@gmail.com | DOB: Oct 22nd 1960 | Address: 223 Quincy Ave apt 1, Griffin Georgia 30223 | Patient ID: SN6jHMmtjDFv3yIAQTx5 /n Insurance: Plan: United healthcare | Group #: 01191 H5323045-000 | Alt Selection: United Healthcare | Upload: https://services.leadconnectorhq.com/documents/download/hj2NyNULV7Zq93roDtxd /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 9 | Symptoms: Sharp Pain, Swelling, Stiffness, Grinding sensation, Dull Ache, Instability or weakness | Treatments Tried: Injections, Physical therapy, Medications/pain pills | Imaging Done: YES | Other: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'SN6jHMmtjDFv3yIAQTx5',
    lead_email: 'mzflame50@gmail.com',
    lead_phone_number: '(248) 727-8216',
    dob: '1960-10-22',
    detected_insurance_provider: 'United Healthcare',
    detected_insurance_plan: 'United healthcare',
    insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/hj2NyNULV7Zq93roDtxd',
    parsed_contact_info: {
      name: 'Sandra Westmoreland',
      phone: '(248) 727-8216',
      email: 'mzflame50@gmail.com',
      address: '223 Quincy Ave apt 1, Griffin Georgia 30223',
      patient_id: 'SN6jHMmtjDFv3yIAQTx5'
    },
    parsed_demographics: {
      dob: '1960-10-22',
      age: 65,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'United Healthcare',
      plan: 'United healthcare',
      group_number: '01191 H5323045-000',
      alternate_selection: 'United Healthcare',
      insurance_card_url: 'https://services.leadconnectorhq.com/documents/download/hj2NyNULV7Zq93roDtxd'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 9,
      symptoms: 'Sharp Pain, Swelling, Stiffness, Grinding sensation, Dull Ache, Instability or weakness',
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Sandra Westmoreland')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Sandra Westmoreland appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Sandra Westmoreland appointment:', data);
  return { success: true, data };
};
