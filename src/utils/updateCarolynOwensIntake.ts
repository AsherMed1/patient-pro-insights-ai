import { supabase } from '@/integrations/supabase/client';

export const updateCarolynOwensIntake = async () => {
  console.log('Updating Carolyn Owens appointment...');
  
  const formattedNotes = `Contact: Name: Carolyn Owens | Phone: (229) 942-4346 | Email: carebear5577@gmail.com | DOB: Jul 16th 1960 | Address: 102 Bluebell Lane, Americus Georgia 31709 | Patient ID: gluKKUqTjMvYXeaHuPH6 /n Insurance: Plan: Anthem | Group #: GAEGR000 | Alt Selection: Medicare Advantage /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 56 and above | Trauma-related Onset: YES | Pain Level: 6 | Symptoms: Grinding sensation, Dull Ache, Sharp Pain, Stiffness, Instability or weakness | Treatments Tried: Injections, Physical therapy, Medications/pain pills, Creams | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'gluKKUqTjMvYXeaHuPH6',
    lead_email: 'carebear5577@gmail.com',
    lead_phone_number: '(229) 942-4346',
    dob: '1960-07-16',
    detected_insurance_provider: 'Medicare Advantage',
    detected_insurance_plan: 'Anthem',
    parsed_contact_info: {
      name: 'Carolyn Owens',
      phone: '(229) 942-4346',
      email: 'carebear5577@gmail.com',
      address: '102 Bluebell Lane, Americus Georgia 31709',
      patient_id: 'gluKKUqTjMvYXeaHuPH6'
    },
    parsed_demographics: {
      dob: '1960-07-16',
      age: 65,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Medicare Advantage',
      plan: 'Anthem',
      group_number: 'GAEGR000',
      alternate_selection: 'Medicare Advantage'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'YES',
      pain_level: 6,
      symptoms: 'Grinding sensation, Dull Ache, Sharp Pain, Stiffness, Instability or weakness',
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills, Creams',
      imaging_done: 'YES'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Carolyn Owens')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Carolyn Owens appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Carolyn Owens appointment:', data);
  return { success: true, data };
};
