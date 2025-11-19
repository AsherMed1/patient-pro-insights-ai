import { supabase } from '@/integrations/supabase/client';

export const updateBrendaTateIntake = async () => {
  console.log('Updating Brenda Tate appointment...');
  
  const formattedNotes = `Contact: Name: Brenda Tate | Phone: (478) 703-2122 | DOB: Sep 21st 1958 | Address: Warner Robins Georgia | Patient ID: 0OuoRaoeL4Dqfq1qpq5f /n Insurance: Plan: United Healthcare | Group #: 00S | Alt Selection: United Healthcare | Notes: Patient reported pain in both knees for a couple of years now. Has tried pain meds and injections, but did not work. She is having trouble going up and down the stairs. She stated that everything is sore /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: '0OuoRaoeL4Dqfq1qpq5f',
    lead_phone_number: '(478) 703-2122',
    dob: '1958-09-21',
    detected_insurance_provider: 'United Healthcare',
    detected_insurance_plan: 'United Healthcare',
    detected_insurance_id: '00S',
    parsed_contact_info: {
      name: 'Brenda Tate',
      phone: '(478) 703-2122',
      address: 'Warner Robins Georgia',
      patient_id: '0OuoRaoeL4Dqfq1qpq5f'
    },
    parsed_demographics: {
      dob: '1958-09-21',
      age: 66,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'United Healthcare',
      plan: 'United Healthcare',
      group_number: '00S',
      alternate_selection: 'United Healthcare'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above'
    },
    parsed_medical_info: {
      notes: 'Patient reported pain in both knees for a couple of years now. Has tried pain meds and injections, but did not work. She is having trouble going up and down the stairs. She stated that everything is sore'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Brenda Tate')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Brenda Tate appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Brenda Tate appointment:', data);
  return { success: true, data };
};
