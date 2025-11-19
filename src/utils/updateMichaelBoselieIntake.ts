import { supabase } from '@/integrations/supabase/client';

export const updateMichaelBoselieIntake = async () => {
  console.log('Updating Michael Boselie appointment...');
  
  const formattedNotes = `Contact: Name: Michael Boselie | Phone: (478) 225-7600 | Email: maboselie@gmail.com | DOB: Mar 21st 1977 | Address: 104 Shamrock Ct, Bonaire Georgia 31005 | Patient ID: 6cda2Ybqte8wEOGIflFJ /n Insurance: Plan: Anthem Blue cross Blue shield | Group #: 27016931PA | Alt Selection: Blue Cross /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: NO | Pain Level: 8 | Symptoms: Stiffness, Grinding sensation, Dull Ache, Instability or weakness | Treatments Tried: Injections, Physical therapy, Medications/pain pills | Imaging Done: YES | Other: NO`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: '6cda2Ybqte8wEOGIflFJ',
    lead_email: 'maboselie@gmail.com',
    lead_phone_number: '(478) 225-7600',
    dob: '1977-03-21',
    detected_insurance_provider: 'Blue Cross',
    detected_insurance_plan: 'Anthem Blue cross Blue shield',
    parsed_contact_info: {
      name: 'Michael Boselie',
      phone: '(478) 225-7600',
      email: 'maboselie@gmail.com',
      address: '104 Shamrock Ct, Bonaire Georgia 31005',
      patient_id: '6cda2Ybqte8wEOGIflFJ'
    },
    parsed_demographics: {
      dob: '1977-03-21',
      age: 48,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'Blue Cross',
      plan: 'Anthem Blue cross Blue shield',
      group_number: '27016931PA',
      alternate_selection: 'Blue Cross'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55',
      trauma_related_onset: 'NO',
      pain_level: 8,
      symptoms: 'Stiffness, Grinding sensation, Dull Ache, Instability or weakness',
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Michael Boselie')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Michael Boselie appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Michael Boselie appointment:', data);
  return { success: true, data };
};
