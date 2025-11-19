import { supabase } from '@/integrations/supabase/client';

export const updateJohnRuffinIntake = async () => {
  console.log('Updating John Ruffin appointment...');
  
  const formattedNotes = `Contact: Name: John Ruffin | Phone: (908) 240-7074 | Email: johnruffin508@gmail.com | DOB: Jun 26th 1968 | Address: 2008 Parador Bend, McDonough Georgia 30253 | Patient ID: Ibqz7oX3PwfB9MOANlSD /n Insurance: Plan: United Healthcare | Group #: 78800210 | Notes: The pain has been going on for 2 years but it has gotten worse within the last 6 months. The pain is present on both knees. Diagnosed with knee osteoarthritis and the condition on both knees is bone on bone. The pain is extremely intense, the sharp pain comes when applying pressure on the knee. When lying down or sitting down it's okay, but as soon as he applies weight the pain happens. There's a grinding/cracking sound when bending the knee, and sometimes the knee feels like popping. There's swelling present and both knees also feel hot. The pain is so intense that whenever he is active he has to take a break and stop. Has tried cortisone injections in the past and did that 2 years ago but didn't feel good past a couple days. Has tried also physical therapy but he is not doing it anymore. He used to do so when mainly covered by the VA. He is scheduled for it again in the middle of December. He has taken Tylenol and Naproxen to deal with the pain, he gets them through the VA even though he can get them OTC /n Pathology: GAE - Duration: 1-6 months | OA or TKR Diagnosed: YES | Age Range: 56 and above | Pain Level: 10 | Symptoms: Swelling, Sharp Pain, Stiffness, Grinding sensation, Instability or weakness | Treatments Tried: Injections, Physical therapy, Medications/pain pills | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'Ibqz7oX3PwfB9MOANlSD',
    lead_email: 'johnruffin508@gmail.com',
    lead_phone_number: '(908) 240-7074',
    dob: '1968-06-26',
    detected_insurance_provider: 'United Healthcare',
    detected_insurance_plan: 'United Healthcare',
    detected_insurance_id: '78800210',
    parsed_contact_info: {
      name: 'John Ruffin',
      phone: '(908) 240-7074',
      email: 'johnruffin508@gmail.com',
      address: '2008 Parador Bend, McDonough Georgia 30253',
      patient_id: 'Ibqz7oX3PwfB9MOANlSD'
    },
    parsed_demographics: {
      dob: '1968-06-26',
      age: 56,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'United Healthcare',
      plan: 'United Healthcare',
      group_number: '78800210'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: '1-6 months',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      pain_level: 10,
      symptoms: 'Swelling, Sharp Pain, Stiffness, Grinding sensation, Instability or weakness',
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills',
      imaging_done: 'YES'
    },
    parsed_medical_info: {
      notes: 'The pain has been going on for 2 years but it has gotten worse within the last 6 months. The pain is present on both knees. Diagnosed with knee osteoarthritis and the condition on both knees is bone on bone. The pain is extremely intense, the sharp pain comes when applying pressure on the knee. When lying down or sitting down it\'s okay, but as soon as he applies weight the pain happens. There\'s a grinding/cracking sound when bending the knee, and sometimes the knee feels like popping. There\'s swelling present and both knees also feel hot. The pain is so intense that whenever he is active he has to take a break and stop. Has tried cortisone injections in the past and did that 2 years ago but didn\'t feel good past a couple days. Has tried also physical therapy but he is not doing it anymore. He used to do so when mainly covered by the VA. He is scheduled for it again in the middle of December. He has taken Tylenol and Naproxen to deal with the pain, he gets them through the VA even though he can get them OTC',
      medications: 'Tylenol, Naproxen (through VA)'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'John Ruffin')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating John Ruffin appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated John Ruffin appointment:', data);
  return { success: true, data };
};
