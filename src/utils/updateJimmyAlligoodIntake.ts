import { supabase } from '@/integrations/supabase/client';

export const updateJimmyAlligoodIntake = async () => {
  console.log('Updating Jimmy Alligood appointment...');
  
  const formattedNotes = `Contact: Name: Jimmy Alligood | Phone: (478) 954-6111 | Email: jimmy.alligood@gmail.com | DOB: Mar 21st 1959 | Address: 700 North Chamlee Drive, Fort Valley Georgia 31030 | Patient ID: KGvdudn1gYV3BU2gNQ19 /n Insurance: Plan: STHA202W1272 | Group #: GA809H1CS | Alt Selection: Blue Cross /n Pathology (GAE): Duration: Over 1 year | Age Range: 56 and above`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'KGvdudn1gYV3BU2gNQ19',
    lead_email: 'jimmy.alligood@gmail.com',
    lead_phone_number: '(478) 954-6111',
    dob: '1959-03-21',
    detected_insurance_provider: 'Blue Cross',
    detected_insurance_plan: 'STHA202W1272',
    parsed_contact_info: {
      name: 'Jimmy Alligood',
      phone: '(478) 954-6111',
      email: 'jimmy.alligood@gmail.com',
      address: '700 North Chamlee Drive, Fort Valley Georgia 31030',
      patient_id: 'KGvdudn1gYV3BU2gNQ19'
    },
    parsed_demographics: {
      dob: '1959-03-21',
      age: 66,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'Blue Cross',
      plan: 'STHA202W1272',
      group_number: 'GA809H1CS',
      alternate_selection: 'Blue Cross'
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
    .eq('lead_name', 'Jimmy Alligood')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Jimmy Alligood appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Jimmy Alligood appointment:', data);
  return { success: true, data };
};
