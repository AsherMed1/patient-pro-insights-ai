import { supabase } from '@/integrations/supabase/client';

export const updateSidneyKeadleIntake = async () => {
  console.log('Updating Sidney Adam Keadle appointment...');
  
  const formattedNotes = `Contact: Name: Sidney Adam Keadle | Phone: (706) 975-0814 | DOB: Apr 30th 1968 | Address: 219 Irvin Road, Thomaston Georgia 30286 | Patient ID: nQGCIbbSkQMQcXDgn7oS /n Insurance: Plan: STHA203W2109 | Group #: GA8039H1CG | Alt Selection: United Healthcare | Notes: Left knee, 4 years, Pain meds, helps a little bit, No injury, Imaging: no. /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: NO | Age Range: 56 and above`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'nQGCIbbSkQMQcXDgn7oS',
    lead_phone_number: '(706) 975-0814',
    dob: '1968-04-30',
    detected_insurance_provider: 'United Healthcare',
    detected_insurance_plan: 'STHA203W2109',
    detected_insurance_id: 'GA8039H1CG',
    parsed_contact_info: {
      name: 'Sidney Adam Keadle',
      phone: '(706) 975-0814',
      address: '219 Irvin Road, Thomaston Georgia 30286',
      patient_id: 'nQGCIbbSkQMQcXDgn7oS'
    },
    parsed_demographics: {
      dob: '1968-04-30',
      age: 56,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'United Healthcare',
      plan: 'STHA203W2109',
      group_number: 'GA8039H1CG',
      alternate_selection: 'United Healthcare'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'NO',
      age_range: '56 and above',
      primary_complaint: 'Left knee pain',
      duration_years: 4,
      treatments_tried: 'Pain medications (helps a little bit)',
      imaging_done: 'NO',
      notes: 'Left knee pain for 4 years. Currently on pain medications which help a little. No injury history. No imaging done yet.'
    },
    parsed_medical_info: {
      notes: 'Patient reports 4 years of left knee pain with no injury history. Currently managing with pain medications with limited relief. No imaging performed to date.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Sidney Adam Keadle')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Sidney Adam Keadle appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Sidney Adam Keadle appointment:', data);
  return { success: true, data };
};
