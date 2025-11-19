import { supabase } from '@/integrations/supabase/client';

const updateVanessaGraydonIntake = async () => {
  console.log('Updating Vanessa Graydon appointment...');
  
  const formattedNotes = `Contact: Name: Vanessa Graydon | Phone: (229) 326-3200 | Email: vanessa_graydon@yahoo.com | DOB: Sep 23rd 1975 | Address: 1300 Brookvale Drive, Tifton Georgia 31794 | Patient ID: WHP4nha4MdJie90xcnE5 /n Insurance: Plan: H55015953 | Alt Selection: Humana | Notes: Will get from the hospital /n Pathology (GAE): Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: NO | Pain Level: 10 | Symptoms: Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness | Treatments Tried: Injections, Medications/pain pills | Imaging Done: YES | Other: NO`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'WHP4nha4MdJie90xcnE5',
    lead_email: 'vanessa_graydon@yahoo.com',
    lead_phone_number: '(229) 326-3200',
    dob: '1975-09-23',
    detected_insurance_provider: 'Humana',
    detected_insurance_plan: 'H55015953',
    parsed_contact_info: {
      name: 'Vanessa Graydon',
      phone: '(229) 326-3200',
      email: 'vanessa_graydon@yahoo.com',
      address: '1300 Brookvale Drive, Tifton Georgia 31794',
      patient_id: 'WHP4nha4MdJie90xcnE5'
    },
    parsed_demographics: {
      dob: '1975-09-23',
      age: 49,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Humana',
      plan: 'H55015953',
      alternate_selection: 'Humana',
      notes: 'Will get from the hospital'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55',
      trauma_related_onset: 'NO',
      pain_level: 10,
      symptoms: 'Sharp Pain, Swelling, Stiffness, Grinding sensation, Instability or weakness',
      treatments_tried: 'Injections, Medications/pain pills',
      imaging_done: 'YES',
      other: 'NO'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Vanessa Graydon')
    .select()
    .single();
  
  if (error) {
    console.error('Error updating Vanessa Graydon appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Vanessa Graydon appointment:', data);
  return { success: true, data };
};

// Execute the update
updateVanessaGraydonIntake();

export { updateVanessaGraydonIntake };
