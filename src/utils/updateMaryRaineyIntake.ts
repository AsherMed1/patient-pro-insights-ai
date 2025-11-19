import { supabase } from '@/integrations/supabase/client';

export const updateMaryRaineyIntake = async () => {
  console.log('Updating Mary Rainey appointment...');
  
  const formattedNotes = `Contact: Name: Mary Rainey | Phone: (478) 461-7641 | Email: tinagoodin67@yahoo.com | DOB: Jun 11th 1946 | Address: 3196 Mt Zion Rd, Stockbridge Georgia 30281 | Patient ID: VjMOzq8r5LxJMCWOMsyR /n Insurance: Plan: 97443017200 | Alt Selection: United Healthcare | Notes: Both knees in pain. Dealing w/ knee pain for 15 years or more. Hard to walk or stand. Diagnosed with OA & bone on bone. Had imaging more than 2 years ago, about 3 years she thinks. Had injections. /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 10 | Symptoms: Sharp Pain, Dull Ache, Stiffness | Treatments Tried: Injections, Medications/pain pills | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'VjMOzq8r5LxJMCWOMsyR',
    lead_email: 'tinagoodin67@yahoo.com',
    lead_phone_number: '(478) 461-7641',
    dob: '1946-06-11',
    detected_insurance_provider: 'United Healthcare',
    detected_insurance_plan: '97443017200',
    parsed_contact_info: {
      name: 'Mary Rainey',
      phone: '(478) 461-7641',
      email: 'tinagoodin67@yahoo.com',
      address: '3196 Mt Zion Rd, Stockbridge Georgia 30281',
      patient_id: 'VjMOzq8r5LxJMCWOMsyR'
    },
    parsed_demographics: {
      dob: '1946-06-11',
      age: 78,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'United Healthcare',
      plan: '97443017200',
      alternate_selection: 'United Healthcare',
      notes: 'Both knees in pain. Dealing w/ knee pain for 15 years or more. Hard to walk or stand. Diagnosed with OA & bone on bone. Had imaging more than 2 years ago, about 3 years she thinks. Had injections.'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 10,
      symptoms: 'Sharp Pain, Dull Ache, Stiffness',
      treatments_tried: 'Injections, Medications/pain pills',
      imaging_done: 'YES',
      notes: 'Severe bilateral knee pain (10/10) for 15+ years. Diagnosed with osteoarthritis and bone-on-bone condition. Significant mobility limitations - difficulty walking and standing. Previous imaging approximately 3 years ago.'
    },
    parsed_medical_info: {
      diagnosis: 'Osteoarthritis - bilateral knees, bone-on-bone condition',
      chronic_conditions: 'Bilateral knee osteoarthritis for 15+ years',
      treatments_tried: 'Injections, Pain medications',
      imaging_status: 'Completed approximately 3 years ago',
      pain_management: 'Current pain medications, previous injections with limited long-term relief',
      functional_impact: 'Severe mobility limitations - difficulty walking and standing',
      notes: 'Patient has suffered from bilateral knee pain for over 15 years. Diagnosed with osteoarthritis and bone-on-bone condition in both knees. Pain level is severe at 10/10, causing significant mobility issues including difficulty walking and standing. Has tried conservative treatments including injections and pain medications with limited lasting relief. Previous imaging was completed approximately 3 years ago. The chronic, long-term nature of the condition has severely impacted her quality of life and daily functioning.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Mary Rainey')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Mary Rainey appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Mary Rainey appointment:', data);
  return { success: true, data };
};
