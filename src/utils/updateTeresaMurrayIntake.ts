import { supabase } from '@/integrations/supabase/client';

export const updateTeresaMurrayIntake = async () => {
  console.log('Updating Teresa Murray appointment...');
  
  const formattedNotes = `Contact: Name: Teresa Murray | Phone: (478) 235-7871 | Email: ironmth1@gmail.com | DOB: Jul 3rd 1960 | Address: 1806 Jackson Road, Roberta Georgia 31078 | Patient ID: bzDgLiMuJ4LVoqdUFlLn /n Insurance: Plan: (80840)9140461101 | Alt Selection: Medicare | Upload: https://services.leadconnectorhq.com/documents/download/TmH3Aa2NmggUwYA9URL0 /n Pathology: GAE: Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: YES | Pain Level: 9 | Symptoms: Dull Ache, Sharp Pain, Swelling, Stiffness, Instability or weakness, Grinding sensation | Treatments Tried: Injections, Physical therapy, Medications/pain pills, Arthroscopic surgery | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'bzDgLiMuJ4LVoqdUFlLn',
    lead_email: 'ironmth1@gmail.com',
    lead_phone_number: '(478) 235-7871',
    dob: '1960-07-03',
    detected_insurance_provider: 'Medicare',
    detected_insurance_plan: '(80840)9140461101',
    insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/TmH3Aa2NmggUwYA9URL0',
    parsed_contact_info: {
      name: 'Teresa Murray',
      phone: '(478) 235-7871',
      email: 'ironmth1@gmail.com',
      address: '1806 Jackson Road, Roberta Georgia 31078',
      patient_id: 'bzDgLiMuJ4LVoqdUFlLn'
    },
    parsed_demographics: {
      dob: '1960-07-03',
      age: 65,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Medicare',
      plan: '(80840)9140461101',
      alternate_selection: 'Medicare'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'YES',
      pain_level: 9,
      symptoms: 'Dull Ache, Sharp Pain, Swelling, Stiffness, Instability or weakness, Grinding sensation',
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills, Arthroscopic surgery',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Teresa Murray')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Teresa Murray appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Teresa Murray appointment:', data);
  return { success: true, data };
};
