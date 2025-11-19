import { supabase } from '@/integrations/supabase/client';

export const updateTalishaBallIntake = async () => {
  console.log('Updating Talisha Ball appointment...');
  
  const formattedNotes = `Contact: Name: Talisha Ball | Phone: (405) 514-4595 | Email: lovemystyleball@gmail.com | DOB: Jun 14th 1980 | Address: 407 Idle Pines Dr, Perry Georgia 31069 | Patient ID: cKuAQ1eGG11GEtGm9nM0 /n Insurance: Plan: Medicare | Alt Selection: Medicare | Notes: Both knees but left hurts more, has bone on bone | Secondary Insurance: Tricare- 427432895 /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 36 to 45 | Trauma-related Onset: NO | Pain Level: 4 | Symptoms: Dull Ache, Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness | Treatments Tried: Injections, Physical therapy, Medications/pain pills | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'cKuAQ1eGG11GEtGm9nM0',
    lead_email: 'lovemystyleball@gmail.com',
    lead_phone_number: '(405) 514-4595',
    dob: '1980-06-14',
    detected_insurance_provider: 'Medicare',
    detected_insurance_plan: 'Medicare',
    parsed_contact_info: {
      name: 'Talisha Ball',
      phone: '(405) 514-4595',
      email: 'lovemystyleball@gmail.com',
      address: '407 Idle Pines Dr, Perry Georgia 31069',
      patient_id: 'cKuAQ1eGG11GEtGm9nM0'
    },
    parsed_demographics: {
      dob: '1980-06-14',
      age: 44,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Medicare',
      plan: 'Medicare',
      alternate_selection: 'Medicare',
      secondary_insurance: 'Tricare',
      secondary_id: '427432895',
      notes: 'Secondary Insurance: Tricare- 427432895'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '36 to 45',
      trauma_related_onset: 'NO',
      pain_level: 4,
      primary_complaint: 'Bilateral knee pain with left knee worse',
      symptoms: 'Dull Ache, Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness',
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills',
      imaging_done: 'YES',
      notes: 'Both knees but left hurts more, has bone on bone'
    },
    parsed_medical_info: {
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills',
      imaging_status: 'Completed',
      notes: 'Bilateral knee osteoarthritis with bone-on-bone degeneration, left knee more symptomatic than right. Patient has undergone conservative treatments including injections, physical therapy, and pain medications.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Talisha Ball')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Talisha Ball appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Talisha Ball appointment:', data);
  return { success: true, data };
};
