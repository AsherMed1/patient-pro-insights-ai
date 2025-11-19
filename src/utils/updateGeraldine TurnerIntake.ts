import { supabase } from '@/integrations/supabase/client';

export const updateGeraldine TurnerIntake = async () => {
  console.log('Updating Geraldine Turner appointment...');
  
  const formattedNotes = `Contact: Name: Geraldine Turner | Phone: (478) 461-2476 | DOB: Dec 27th 1965 | Address: 109 Sunnybrook Dr, Perry Georgia 31069 | Patient ID: WnFHzy7HtZx1Jn2yISn8 /n Insurance: Plan: AMBETTER | Group #: 2CVA | Alt Selection: Other | Upload: https://services.leadconnectorhq.com/documents/download/zNuqtcPWTEzanulnySK8 /n Pathology: GAE - Duration: Over 1 year | Age Range: 56 and above`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'WnFHzy7HtZx1Jn2yISn8',
    lead_phone_number: '(478) 461-2476',
    dob: '1965-12-27',
    detected_insurance_provider: 'Ambetter',
    detected_insurance_plan: 'AMBETTER',
    detected_insurance_id: '2CVA',
    insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/zNuqtcPWTEzanulnySK8',
    parsed_contact_info: {
      name: 'Geraldine Turner',
      phone: '(478) 461-2476',
      address: '109 Sunnybrook Dr, Perry Georgia 31069',
      patient_id: 'WnFHzy7HtZx1Jn2yISn8'
    },
    parsed_demographics: {
      dob: '1965-12-27',
      age: 59,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Ambetter',
      plan: 'AMBETTER',
      group_number: '2CVA',
      alternate_selection: 'Other'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      age_range: '56 and above'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Geraldine Turner')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Geraldine Turner appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Geraldine Turner appointment:', data);
  return { success: true, data };
};
