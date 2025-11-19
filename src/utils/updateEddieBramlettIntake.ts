import { supabase } from '@/integrations/supabase/client';

export const updateEddieBramlettIntake = async () => {
  console.log('Updating Eddie Bramlett appointment...');
  
  const formattedNotes = `Contact: Name: Eddie Bramlett | Phone: (478) 973-0055 | Email: eddiebramlett@gmail.com | DOB: Feb 7th 1968 | Address: 89 Lillian Drive, Byron Georgia 31008 | Patient ID: Sm5QWbsknmxqtNNGibT9 /n Insurance: Plan: United Healthcare | Group #: 936173 | Alt Selection: United Healthcare | Notes: Right knee has been bugging him for 3 years. The pain comes and goes, one day he is perfectly fine and from one moment to another he starts feeling a severe spike of pain. There isn't a clear consistency other than the angle of the knee for when the pain comes because patient has mentioned he can do squats for example with a bit of pain but no severe pain. When the pain comes it makes walking really difficult. Has tried cortisone injection once but without success. Has tried medication for pain relief but it's so strong he does not take it. /n Pathology (GAE): Duration: Less than 1 month | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 5 | Symptoms: Dull Ache | Treatments Tried: Injections, Physical therapy, Medications/pain pills | Imaging Done: YES | Other: NO`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'Sm5QWbsknmxqtNNGibT9',
    lead_email: 'eddiebramlett@gmail.com',
    lead_phone_number: '(478) 973-0055',
    dob: '1968-02-07',
    detected_insurance_provider: 'United Healthcare',
    detected_insurance_plan: 'United Healthcare',
    parsed_contact_info: {
      name: 'Eddie Bramlett',
      phone: '(478) 973-0055',
      email: 'eddiebramlett@gmail.com',
      address: '89 Lillian Drive, Byron Georgia 31008',
      patient_id: 'Sm5QWbsknmxqtNNGibT9'
    },
    parsed_demographics: {
      dob: '1968-02-07',
      age: 57,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'United Healthcare',
      plan: 'United Healthcare',
      group_number: '936173',
      alternate_selection: 'United Healthcare'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Less than 1 month',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 5,
      symptoms: 'Dull Ache',
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Eddie Bramlett')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Eddie Bramlett appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Eddie Bramlett appointment:', data);
  return { success: true, data };
};
