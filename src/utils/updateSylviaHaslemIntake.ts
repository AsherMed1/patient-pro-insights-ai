import { supabase } from '@/integrations/supabase/client';

export const updateSylviaHaslemIntake = async () => {
  console.log('Updating Sylvia Haslem appointment...');
  
  const formattedNotes = `Contact: Name: Sylvia Haslem | Phone: (478) 321-8971 | Email: syl7790@gmail.com | DOB: Jan 14th 1953 | Address: 3415 Mildred Ct, Macon Georgia 31217 | Patient ID: d6JUONFxt2MqTCm0Bvwp /n Insurance: Plan: Blue Cross Blue Shield | Group #: GAEGR000 | Alt Selection: Blue Cross | Notes: The pain is on both knees and has been going on for around 4-5 years. No injuries. Diagnosed with knee osteoarthritis - the condition is bone on bone on both knees. The pain manifests in intensity depending on the position of the knee, not exactly based on activity or applying weight on the knee. When being active is when the grinding and popping sensations are felt. Has taken shots on her knees years ago but doesn't exactly remember which type. She is not taking any meds for the pain. /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 7 | Symptoms: Sharp Pain, Grinding sensation | Treatments Tried: Injections, Medications/pain pills | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'd6JUONFxt2MqTCm0Bvwp',
    lead_email: 'syl7790@gmail.com',
    lead_phone_number: '(478) 321-8971',
    dob: '1953-01-14',
    detected_insurance_provider: 'Blue Cross Blue Shield',
    detected_insurance_plan: 'Blue Cross Blue Shield',
    detected_insurance_id: 'GAEGR000',
    parsed_contact_info: {
      name: 'Sylvia Haslem',
      phone: '(478) 321-8971',
      email: 'syl7790@gmail.com',
      address: '3415 Mildred Ct, Macon Georgia 31217',
      patient_id: 'd6JUONFxt2MqTCm0Bvwp'
    },
    parsed_demographics: {
      dob: '1953-01-14',
      age: 71,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Blue Cross Blue Shield',
      plan: 'Blue Cross Blue Shield',
      group_number: 'GAEGR000',
      alternate_selection: 'Blue Cross'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      duration_years: '4-5 years',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 7,
      primary_complaint: 'Bilateral knee osteoarthritis - bone on bone',
      symptoms: 'Sharp Pain, Grinding sensation, Popping sensation',
      treatments_tried: 'Injections (years ago, type unknown)',
      imaging_done: 'YES',
      notes: 'The pain is on both knees and has been going on for around 4-5 years. No injuries. Diagnosed with knee osteoarthritis - the condition is bone on bone on both knees. The pain manifests in intensity depending on the position of the knee, not exactly based on activity or applying weight on the knee. When being active is when the grinding and popping sensations are felt. Has taken shots on her knees years ago but doesn\'t exactly remember which type. She is not taking any meds for the pain.'
    },
    parsed_medical_info: {
      treatments_tried: 'Injections (years ago, type unknown)',
      imaging_status: 'Completed',
      current_medications: 'None for pain',
      notes: 'Bilateral knee osteoarthritis with bone-on-bone degeneration for 4-5 years. No trauma history. Pain intensity varies with knee position rather than activity level. Grinding and popping sensations occur during activity. Previous injections years ago (type unknown). Not currently taking pain medications.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Sylvia Haslem')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Sylvia Haslem appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Sylvia Haslem appointment:', data);
  return { success: true, data };
};
