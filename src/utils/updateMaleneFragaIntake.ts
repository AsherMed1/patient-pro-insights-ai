import { supabase } from '@/integrations/supabase/client';

export const updateMaleneFragaIntake = async () => {
  console.log('Updating Malene Fraga appointment...');
  
  const formattedNotes = `Contact: Name: Malene Fraga | Phone: (925) 639-5713 | Email: teamfraga@gmail.com | DOB: May 26th 1978 | Address: 289 Albermarle Place, Macon Georgia 31204 | Patient ID: SzHzBLqwHnFY9UXgGCFg /n Insurance: Plan: Blue Cross Blue Shield | Group #: 175203CA03 | Alt Selection: Blue Cross | Notes: Left knee Arthritis Meniscus Injections She is under her husband's insurance /n Pathology: GAE - Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: NO | Pain Level: 6 | Symptoms: Sharp Pain, Swelling, Stiffness, Dull Ache, Grinding sensation | Treatments Tried: Injections, Physical therapy, Medications/pain pills, Meniscectomy | Imaging Done: YES`;

  const updates = {
    patient_intake_notes: formattedNotes,
    ghl_id: 'SzHzBLqwHnFY9UXgGCFg',
    lead_email: 'teamfraga@gmail.com',
    lead_phone_number: '(925) 639-5713',
    dob: '1978-05-26',
    detected_insurance_provider: 'Blue Cross Blue Shield',
    detected_insurance_plan: 'Blue Cross Blue Shield',
    detected_insurance_id: '175203CA03',
    parsed_contact_info: {
      name: 'Malene Fraga',
      phone: '(925) 639-5713',
      email: 'teamfraga@gmail.com',
      address: '289 Albermarle Place, Macon Georgia 31204',
      patient_id: 'SzHzBLqwHnFY9UXgGCFg'
    },
    parsed_demographics: {
      dob: '1978-05-26',
      age: 46,
      gender: 'Female'
    },
    parsed_insurance_info: {
      provider: 'Blue Cross Blue Shield',
      plan: 'Blue Cross Blue Shield',
      group_number: '175203CA03',
      alternate_selection: 'Blue Cross',
      notes: 'Patient is under her husband\'s insurance'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '46 to 55',
      trauma_related_onset: 'NO',
      pain_level: 6,
      primary_complaint: 'Left knee arthritis and meniscus issues',
      symptoms: 'Sharp Pain, Swelling, Stiffness, Dull Ache, Grinding sensation',
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills, Meniscectomy',
      imaging_done: 'YES',
      notes: 'Left knee arthritis with meniscus issues. Patient has received injections and undergone meniscectomy.'
    },
    parsed_medical_info: {
      treatments_tried: 'Injections, Physical therapy, Medications/pain pills, Meniscectomy',
      imaging_status: 'Completed',
      notes: 'Left knee arthritis with meniscus issues. Patient has undergone meniscectomy procedure. Currently managed with injections, physical therapy, and pain medications.'
    },
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('all_appointments')
    .update(updates)
    .eq('lead_name', 'Malene Fraga')
    .eq('project_name', 'Premier Vascular')
    .select();
  
  if (error) {
    console.error('Error updating Malene Fraga appointment:', error);
    return { success: false, error };
  }
  
  console.log('✅ Successfully updated Malene Fraga appointment:', data);
  return { success: true, data };
};
