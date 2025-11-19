import { supabase } from '@/integrations/supabase/client';

export const updateEmmaLeeIntake = async () => {
  console.log('Updating Emma J Lee appointment...');
  
  const formattedNotes = `Contact: Name: Emma J Lee | Phone: (334) 344-8358 | Email: dirty24redd@gmail.com | DOB: Jul 2nd 1973 | Address: 1305 S Brundidge St, Troy Alabama 36081 | Patient ID: EbVlzYk2F6g8DbUNV3vZ /n Insurance: Plan: UHC | Group #: 76-416933 | Alt Selection: United Healthcare | Notes: Both Knee pain. Patient tried injection, physical therapy, and pain medication. /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'EbVlzYk2F6g8DbUNV3vZ',
    lead_email: 'dirty24redd@gmail.com',
    lead_phone_number: '(334) 344-8358',
    dob: '1973-07-02',
    detected_insurance_provider: 'United Healthcare',
    detected_insurance_plan: 'UHC',
    detected_insurance_id: '76-416933',
    parsed_contact_info: {
      name: 'Emma J Lee',
      phone: '(334) 344-8358',
      email: 'dirty24redd@gmail.com',
      address: '1305 S Brundidge St, Troy Alabama 36081',
      patient_id: 'EbVlzYk2F6g8DbUNV3vZ'
    },
    parsed_demographics: {
      dob: '1973-07-02',
      age: 51,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'United Healthcare',
      plan: 'UHC',
      group_number: '76-416933',
      alternate_selection: 'United Healthcare'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55',
      primary_complaint: 'Both knee pain',
      treatments_tried: 'Injections, Physical therapy, Pain medication',
      notes: 'Both knee pain. Patient tried injection, physical therapy, and pain medication.'
    },
    parsed_medical_info: {
      treatments_tried: 'Injections, Physical therapy, Pain medication',
      notes: 'Bilateral knee pain with history of conservative treatment including injections, physical therapy, and pain medications.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Emma J Lee')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Emma J Lee appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Emma J Lee appointment:', data);
  return { success: true, data };
};
