import { supabase } from '@/integrations/supabase/client';

export const updateFreddieManghamIntake = async () => {
  console.log('Updating Freddie B Mangham appointment...');
  
  const formattedNotes = `Contact: Name: Freddie B Mangham | Phone: (678) 791-8360 | Email: manghamfreddie@gmail.com | DOB: Nov 6th 1973 | Address: 440 East Mcintosh Road, Griffin Georgia 30223 | Patient ID: VbVA8sDqm7yI1PRyThZt /n Insurance: Plan: Oscar | Alt Selection: Other | Notes: Both knees, 4 years with pain, bone on bone, Pain level 10, had gel shots they don't work, has swelling and stiffness everyday, struggle to walk /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: NO | Pain Level: 10 | Symptoms: Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness, Dull Ache | Treatments Tried: Injections, Medications/pain pills, Physical therapy | Imaging Done: YES | Other: NO`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'VbVA8sDqm7yI1PRyThZt',
    lead_email: 'manghamfreddie@gmail.com',
    lead_phone_number: '(678) 791-8360',
    dob: '1973-11-06',
    detected_insurance_provider: 'Other',
    detected_insurance_plan: 'Oscar',
    parsed_contact_info: {
      name: 'Freddie B Mangham',
      phone: '(678) 791-8360',
      email: 'manghamfreddie@gmail.com',
      address: '440 East Mcintosh Road, Griffin Georgia 30223',
      patient_id: 'VbVA8sDqm7yI1PRyThZt'
    },
    parsed_demographics: {
      dob: '1973-11-06',
      age: 52,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'Other',
      plan: 'Oscar',
      alternate_selection: 'Other'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55',
      trauma_related_onset: 'NO',
      pain_level: 10,
      symptoms: 'Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness, Dull Ache',
      treatments_tried: 'Injections, Medications/pain pills, Physical therapy',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Freddie B Mangham')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Freddie B Mangham appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Freddie B Mangham appointment:', data);
  return { success: true, data };
};
