import { supabase } from '@/integrations/supabase/client';

export const updateRebekahPooleIntake = async () => {
  console.log('Updating Rebekah Poole appointment...');
  
  const formattedNotes = `Contact: Name: Rebekah Poole | Phone: (478) 232-6527 | Email: ltpoole@yahoo.com | DOB: Feb 23rd 1958 | Address: 7046 Sofkee Place, Macon Georgia 31216 | Patient ID: ZtXOjUcxKf5TupoDgJt6 /n Insurance: Plan: Medicare | Alt Selection: Medicare | Notes: Also have secondary insurance through Chesterfield Resources Group #8100, ID#0011771 800-321-0935 /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 5 | Symptoms: Stiffness, Sharp Pain, Dull Ache, Instability or weakness | Treatments Tried: Injections, Physical therapy | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'ZtXOjUcxKf5TupoDgJt6',
    lead_email: 'ltpoole@yahoo.com',
    lead_phone_number: '(478) 232-6527',
    dob: '1958-02-23',
    detected_insurance_provider: 'Medicare',
    detected_insurance_plan: 'Medicare',
    parsed_contact_info: {
      name: 'Rebekah Poole',
      phone: '(478) 232-6527',
      email: 'ltpoole@yahoo.com',
      address: '7046 Sofkee Place, Macon Georgia 31216',
      patient_id: 'ZtXOjUcxKf5TupoDgJt6'
    },
    parsed_demographics: {
      dob: '1958-02-23',
      age: 66,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Medicare',
      plan: 'Medicare',
      alternate_selection: 'Medicare',
      secondary_insurance: 'Chesterfield Resources',
      secondary_group_number: '8100',
      secondary_id: '0011771',
      secondary_phone: '800-321-0935',
      notes: 'Also have secondary insurance through Chesterfield Resources Group #8100, ID#0011771 800-321-0935'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 5,
      symptoms: 'Stiffness, Sharp Pain, Dull Ache, Instability or weakness',
      treatments_tried: 'Injections, Physical therapy',
      imaging_done: 'YES'
    },
    parsed_medical_info: {
      treatments_tried: 'Injections, Physical therapy',
      imaging_status: 'Completed'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Rebekah Poole')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Rebekah Poole appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Rebekah Poole appointment:', data);
  return { success: true, data };
};
