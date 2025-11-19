import { supabase } from '@/integrations/supabase/client';

export const updateDennisWadeIntake = async () => {
  console.log('Updating Dennis Wade appointment...');
  
  const formattedNotes = `Contact: Name: Dennis Wade | Phone: (229) 357-2974 | Email: denniswade046@gmail.com | DOB: Nov 28th 1977 | Address: 1645 Sunny Lane, Albany Georgia 31701 | Patient ID: yz8twWEoSyLFKvEfoWLC /n Insurance: Plan: Ambetter | Alt Selection: Other | Notes: Patient has been dealing with pain on both knees for over a year. He's diagnosed with osteoarthritis. He can barely stand and is basically bed bound. Has a cane and walker but they are not helpful. Has tried a steroid injection only on the left knee that didn't work. Takes over the counter medication for pain. /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: NO | Pain Level: 10 | Symptoms: Dull Ache, Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness | Treatments Tried: Injections, Medications/pain pills | Imaging Done: YES | Other: NO`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'yz8twWEoSyLFKvEfoWLC',
    lead_email: 'denniswade046@gmail.com',
    lead_phone_number: '(229) 357-2974',
    dob: '1977-11-28',
    detected_insurance_provider: 'Ambetter',
    detected_insurance_plan: 'Ambetter',
    parsed_contact_info: {
      name: 'Dennis Wade',
      phone: '(229) 357-2974',
      email: 'denniswade046@gmail.com',
      address: '1645 Sunny Lane, Albany Georgia 31701',
      patient_id: 'yz8twWEoSyLFKvEfoWLC'
    },
    parsed_demographics: {
      dob: '1977-11-28',
      age: 47,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'Ambetter',
      plan: 'Ambetter',
      alternate_selection: 'Other',
      notes: 'Patient has been dealing with pain on both knees for over a year. He\'s diagnosed with osteoarthritis. He can barely stand and is basically bed bound. Has a cane and walker but they are not helpful. Has tried a steroid injection only on the left knee that didn\'t work. Takes over the counter medication for pain.'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55',
      trauma_related_onset: 'NO',
      pain_level: 10,
      symptoms: 'Dull Ache, Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness',
      treatments_tried: 'Injections, Medications/pain pills',
      imaging_done: 'YES',
      other: 'NO',
      notes: 'Patient diagnosed with osteoarthritis in both knees, experiencing severe mobility limitations. Bedbound with minimal relief from assistive devices. Previous steroid injection to left knee was ineffective.'
    },
    parsed_medical_info: {
      diagnosis: 'Osteoarthritis (both knees)',
      treatments_tried: 'Steroid injection (left knee - ineffective), Over-the-counter pain medications',
      imaging_status: 'Completed',
      mobility_status: 'Severely limited - bedbound, uses cane and walker with minimal benefit',
      pain_management: 'Over-the-counter medications, previous ineffective steroid injection',
      notes: 'Patient has severe osteoarthritis affecting both knees with extreme pain (10/10). Currently bedbound and unable to stand. Has tried cane and walker without significant improvement. Previous steroid injection to left knee provided no relief. Currently managing pain with OTC medications.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Dennis Wade')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Dennis Wade appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Dennis Wade appointment:', data);
  return { success: true, data };
};
