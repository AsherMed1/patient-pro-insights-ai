import { supabase } from '@/integrations/supabase/client';

export const updateNicholasFelderIntake = async () => {
  console.log('Updating Nicholas Felder appointment...');
  
  const formattedNotes = `Contact: Name: Nicholas Felder | Phone: (478) 403-9919 | Email: nicholasfelder62@gmail.com | DOB: Jun 17th 1962 | Address: 1220 Creekwood Dr, Perry Georgia 31069 | Patient ID: J58nnLorTrGVNx4XnoQ7 /n Insurance: Plan: Ambetter | Alt Selection: Other | Notes: Left knee is in pain for over 26 years. Has been informed that he might need to get his leg amputated. Had an accident at work before the pain began; a welding machine fell on his knee. Has simply pushed through the pain through all these years until it has gotten to this unbearable point that it hurts too much on every aspect of his life, even while sitting on the bathroom keeps him in pain. Refuses to use any type of support to move around even though he should. There is swelling on the knees present and also the patient feels fevers and chills. /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Pain Level: 10 | Symptoms: Sharp Pain, Swelling, Stiffness, Instability or weakness, Dull Ache | Treatments Tried: Physical therapy, Injections, Knee replacement, Medications/pain pills, Other (please specify below) Surgery | Imaging Done: YES | Other: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'J58nnLorTrGVNx4XnoQ7',
    lead_email: 'nicholasfelder62@gmail.com',
    lead_phone_number: '(478) 403-9919',
    dob: '1962-06-17',
    detected_insurance_provider: 'Other',
    detected_insurance_plan: 'Ambetter',
    parsed_contact_info: {
      name: 'Nicholas Felder',
      phone: '(478) 403-9919',
      email: 'nicholasfelder62@gmail.com',
      address: '1220 Creekwood Dr, Perry Georgia 31069',
      patient_id: 'J58nnLorTrGVNx4XnoQ7'
    },
    parsed_demographics: {
      dob: '1962-06-17',
      age: 63,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'Other',
      plan: 'Ambetter',
      alternate_selection: 'Other'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      pain_level: 10,
      symptoms: 'Sharp Pain, Swelling, Stiffness, Instability or weakness, Dull Ache',
      treatments_tried: 'Physical therapy, Injections, Knee replacement, Medications/pain pills, Other (Surgery)',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Nicholas Felder')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Nicholas Felder appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Nicholas Felder appointment:', data);
  return { success: true, data };
};
