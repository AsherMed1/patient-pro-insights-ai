import { supabase } from '@/integrations/supabase/client';

export const updateDeborahEnsleyIntake = async () => {
  console.log('Updating Deborah Colleen Ensley appointment...');
  
  const formattedNotes = `Contact: Name: Deborah Colleen Ensley | Phone: (478) 262-6644 | Email: ddensley1@arl.com | DOB: Jul 14th 1950 | Address: 444 Forest Hill Road, Macon Georgia 31210 | Patient ID: AZ2uGt4blPqk6BOrEFsH /n Insurance: Plan: Medicare Advantage | Group #: 12472 | Notes: The pain has been ongoing since the 90s, had surgery in 2004 on the right knee. Both knees are hurting since the pain started on the right knee and then leaning on the left knee causes degradation. This has caused her troubles across the years in her regular life like work. Has had shots on her knee, physical therapy, adding cold. There is swelling present on both knees, sometimes the pain keeps her from sleeping. /n Pathology: GAE - Duration: Over 1 year | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 5 | Symptoms: Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness | Treatments Tried: Injections, Physical therapy, Orthoscopic | Imaging Done: YES | Other: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'AZ2uGt4blPqk6BOrEFsH',
    lead_email: 'ddensley1@arl.com',
    lead_phone_number: '(478) 262-6644',
    dob: '1950-07-14',
    detected_insurance_provider: 'Medicare Advantage',
    detected_insurance_plan: 'Medicare Advantage',
    detected_insurance_id: '12472',
    parsed_contact_info: {
      name: 'Deborah Colleen Ensley',
      phone: '(478) 262-6644',
      email: 'ddensley1@arl.com',
      address: '444 Forest Hill Road, Macon Georgia 31210',
      patient_id: 'AZ2uGt4blPqk6BOrEFsH'
    },
    parsed_demographics: {
      dob: '1950-07-14',
      age: 74,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Medicare Advantage',
      plan: 'Medicare Advantage',
      group_number: '12472',
      notes: 'The pain has been ongoing since the 90s, had surgery in 2004 on the right knee. Both knees are hurting since the pain started on the right knee and then leaning on the left knee causes degradation. This has caused her troubles across the years in her regular life like work. Has had shots on her knee, physical therapy, adding cold. There is swelling present on both knees, sometimes the pain keeps her from sleeping.'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 5,
      symptoms: 'Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness',
      treatments_tried: 'Injections, Physical therapy, Orthoscopic',
      imaging_done: 'YES',
      other: 'YES',
      notes: 'The pain has been ongoing since the 90s, had surgery in 2004 on the right knee. Both knees are hurting since the pain started on the right knee and then leaning on the left knee causes degradation. This has caused her troubles across the years in her regular life like work. Has had shots on her knee, physical therapy, adding cold. There is swelling present on both knees, sometimes the pain keeps her from sleeping.'
    },
    parsed_medical_info: {
      surgical_history: 'Right knee surgery in 2004',
      chronic_conditions: 'Bilateral knee pain since 1990s',
      treatments_tried: 'Injections to knee, Physical therapy, Cold therapy, Orthoscopic surgery',
      imaging_status: 'Completed',
      pain_management: 'Previous injections, physical therapy, and cold therapy with limited relief',
      functional_impact: 'Pain affects work and daily activities, causes sleep disruption',
      notes: 'Patient has extensive history of bilateral knee pain dating back to the 1990s. Had right knee surgery in 2004. Pain started in right knee and spread to left knee due to compensatory mechanics. Has tried multiple conservative treatments including injections, physical therapy, and cold therapy. Swelling present in both knees. Pain severity sometimes prevents sleep. Condition has significantly impacted her ability to work and perform daily activities over many years.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Deborah Colleen Ensley')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Deborah Colleen Ensley appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Deborah Colleen Ensley appointment:', data);
  return { success: true, data };
};
