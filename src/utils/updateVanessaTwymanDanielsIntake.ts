import { supabase } from '@/integrations/supabase/client';

export const updateVanessaTwymanDanielsIntake = async () => {
  console.log('Updating Vanessa Twyman-Daniels appointment...');
  
  const formattedNotes = `Contact: Name: Vanessa Twyman-Daniels | Phone: (703) 431-1580 | Email: vbafss@gmail.com | DOB: May 17th 1960 | Address: 8205 Santa Maria Cove, McDonough Georgia 30252 | Patient ID: DFfLLB2A90W9bwevzArZ /n Insurance: Plan: Medicare | Alt Selection: Medicare | Notes: She is also covered under Blue Cross, Member Number: R50215064, Group Number: 65006500 /n Pathology: GAE - Duration: Over 1 year | Age Range: 56 and above | Pain Level: 4 | Symptoms: Swelling, Dull Ache | Treatments Tried: Injections, Meniscus tear surgery | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'DFfLLB2A90W9bwevzArZ',
    lead_email: 'vbafss@gmail.com',
    lead_phone_number: '(703) 431-1580',
    dob: '1960-05-17',
    detected_insurance_provider: 'Medicare',
    detected_insurance_plan: 'Medicare',
    parsed_contact_info: {
      name: 'Vanessa Twyman-Daniels',
      phone: '(703) 431-1580',
      email: 'vbafss@gmail.com',
      address: '8205 Santa Maria Cove, McDonough Georgia 30252',
      patient_id: 'DFfLLB2A90W9bwevzArZ'
    },
    parsed_demographics: {
      dob: '1960-05-17',
      age: 64,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Medicare',
      plan: 'Medicare',
      alternate_selection: 'Medicare',
      secondary_insurance: 'Blue Cross Blue Shield',
      secondary_id: 'R50215064',
      secondary_group_number: '65006500',
      notes: 'She is also covered under Blue Cross, Member Number: R50215064, Group Number: 65006500'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      age_range: '56 and above',
      pain_level: 4,
      symptoms: 'Swelling, Dull Ache',
      treatments_tried: 'Injections, Meniscus tear surgery',
      imaging_done: 'YES',
      notes: 'Patient has history of meniscus tear surgery and injections for knee pain management.'
    },
    parsed_medical_info: {
      treatments_tried: 'Injections, Meniscus tear surgery',
      imaging_status: 'Completed',
      surgical_history: 'Meniscus tear surgery',
      notes: 'Patient has undergone meniscus tear surgery and has received injections for knee pain. Currently experiencing swelling and dull ache.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Vanessa Twyman-Daniels')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Vanessa Twyman-Daniels appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Vanessa Twyman-Daniels appointment:', data);
  return { success: true, data };
};
