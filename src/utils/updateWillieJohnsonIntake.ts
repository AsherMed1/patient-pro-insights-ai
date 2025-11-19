import { supabase } from '@/integrations/supabase/client';

export const updateWillieJohnsonIntake = async () => {
  console.log('Updating Willie Johnson appointment...');
  
  const formattedNotes = `Contact: Name: Willie Johnson | Phone: (478) 361-0058 | Email: willie_johnson@bellsouth.net | DOB: Nov 21st 1962 | Address: 125 Stonefield Cir, Macon Georgia 31216 | Patient ID: 0iXabvClue6zoeDFIRPQ /n Insurance: Plan: Blue cross blue shield | Group #: 65006500 | Alt Selection: Blue Cross | Notes: Has pain on left knee for over a year, tried medications. PCP Scarborough Family Medicine, Dr. Cameka N. Scarborough at (478) 788-8599, No Imaging taken 2 years ago /n Pathology: GAE - Duration: Over 1 year | Age Range: 56 and above`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: '0iXabvClue6zoeDFIRPQ',
    lead_email: 'willie_johnson@bellsouth.net',
    lead_phone_number: '(478) 361-0058',
    dob: '1962-11-21',
    detected_insurance_provider: 'Blue Cross Blue Shield',
    detected_insurance_plan: 'Blue cross blue shield',
    detected_insurance_id: '65006500',
    parsed_contact_info: {
      name: 'Willie Johnson',
      phone: '(478) 361-0058',
      email: 'willie_johnson@bellsouth.net',
      address: '125 Stonefield Cir, Macon Georgia 31216',
      patient_id: '0iXabvClue6zoeDFIRPQ'
    },
    parsed_demographics: {
      dob: '1962-11-21',
      age: 62,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'Blue Cross Blue Shield',
      plan: 'Blue cross blue shield',
      group_number: '65006500',
      alternate_selection: 'Blue Cross'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      age_range: '56 and above'
    },
    parsed_medical_info: {
      pcp: 'Dr. Cameka N. Scarborough',
      pcp_practice: 'Scarborough Family Medicine',
      pcp_phone: '(478) 788-8599',
      notes: 'Has pain on left knee for over a year, tried medications. No Imaging taken 2 years ago'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Willie Johnson')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Willie Johnson appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Willie Johnson appointment:', data);
  return { success: true, data };
};
