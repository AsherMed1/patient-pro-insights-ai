import { supabase } from '@/integrations/supabase/client';

export const updateRobertRennieIntake = async () => {
  console.log('Updating Robert Rennie appointment...');
  
  const formattedNotes = `Contact: Name: Robert Rennie | Phone: (478) 341-9400 | Email: trirob@live.com | DOB: Oct 31st 1961 | Address: 5437 Bowman Road, Macon Georgia 31210 | Patient ID: LxlARfGWxLlPcNjByv7a /n Insurance: Plan: MedCost | Group #: SH700 | Alt Selection: Other | Notes: Bone on Bone, No space between Femur, Swelling and Sharp pain in the Medial Side of knee cap, Had Xray 2 yrs ago, PCP Dr. Kristie Gonzales /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: NO | Pain Level: 6 | Symptoms: Dull Ache, Sharp Pain, Swelling | Treatments Tried: Physical therapy, Medications/pain pills, Other (please specify below), Injections, Supplements | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'LxlARfGWxLlPcNjByv7a',
    lead_email: 'trirob@live.com',
    lead_phone_number: '(478) 341-9400',
    dob: '1961-10-31',
    detected_insurance_provider: 'MedCost',
    detected_insurance_plan: 'MedCost',
    detected_insurance_id: 'SH700',
    parsed_contact_info: {
      name: 'Robert Rennie',
      phone: '(478) 341-9400',
      email: 'trirob@live.com',
      address: '5437 Bowman Road, Macon Georgia 31210',
      patient_id: 'LxlARfGWxLlPcNjByv7a'
    },
    parsed_demographics: {
      dob: '1961-10-31',
      age: 63,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'MedCost',
      plan: 'MedCost',
      group_number: 'SH700',
      alternate_selection: 'Other'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 6,
      symptoms: 'Dull Ache, Sharp Pain, Swelling',
      treatments_tried: 'Physical therapy, Medications/pain pills, Other, Injections, Supplements',
      imaging_done: 'YES'
    },
    parsed_medical_info: {
      pcp: 'Dr. Kristie Gonzales',
      notes: 'Bone on Bone, No space between Femur, Swelling and Sharp pain in the Medial Side of knee cap, Had Xray 2 yrs ago'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Robert Rennie')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Robert Rennie appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Robert Rennie appointment:', data);
  return { success: true, data };
};
