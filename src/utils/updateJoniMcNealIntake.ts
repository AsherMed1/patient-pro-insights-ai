import { supabase } from '@/integrations/supabase/client';

export const updateJoniMcNealIntake = async () => {
  console.log('Updating Joni McNeal appointment...');
  
  const formattedNotes = `Contact: Name: Joni McNeal | Phone: (478) 559-0259 | Email: dupreejoni71@gmail.com | DOB: Nov 1st 1971 | Address: 926 Ward St f7, Eastman Georgia 31023 | Patient ID: 3B3Zh4UwAf9a47xB2i53 /n Insurance: Plan: Ambetter from Peach State Health plan | Alt Selection: Other | Upload: https://services.leadconnectorhq.com/documents/download/PQmD2GFLsxuBgkHKJxmP /n Pathology: GAE - Duration: Less than 1 month | OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: YES | Pain Level: 10 | Symptoms: Swelling, Stiffness, Grinding sensation, Instability or weakness, Dull Ache | Treatments Tried: Injections, Medications/pain pills | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: '3B3Zh4UwAf9a47xB2i53',
    lead_email: 'dupreejoni71@gmail.com',
    lead_phone_number: '(478) 559-0259',
    dob: '1971-11-01',
    detected_insurance_provider: 'Ambetter',
    detected_insurance_plan: 'Ambetter from Peach State Health plan',
    insurance_id_link: 'https://services.leadconnectorhq.com/documents/download/PQmD2GFLsxuBgkHKJxmP',
    parsed_contact_info: {
      name: 'Joni McNeal',
      phone: '(478) 559-0259',
      email: 'dupreejoni71@gmail.com',
      address: '926 Ward St f7, Eastman Georgia 31023',
      patient_id: '3B3Zh4UwAf9a47xB2i53'
    },
    parsed_demographics: {
      dob: '1971-11-01',
      age: 53,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Ambetter',
      plan: 'Ambetter from Peach State Health plan',
      alternate_selection: 'Other'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Less than 1 month',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55',
      trauma_related_onset: 'YES',
      pain_level: 10,
      symptoms: 'Swelling, Stiffness, Grinding sensation, Instability or weakness, Dull Ache',
      treatments_tried: 'Injections, Medications/pain pills',
      imaging_done: 'YES',
      notes: 'Acute onset of severe knee pain following trauma. Pain level 10/10 with significant functional impairment.'
    },
    parsed_medical_info: {
      treatments_tried: 'Injections, Medications/pain pills',
      imaging_status: 'Completed',
      notes: 'Recent trauma-related onset (less than 1 month) with severe pain level 10/10. Patient has undergone initial treatment with injections and pain medications. Imaging completed.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Joni McNeal')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Joni McNeal appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Joni McNeal appointment:', data);
  return { success: true, data };
};
