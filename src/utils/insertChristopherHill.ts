import { supabase } from '@/integrations/supabase/client';

export const insertChristopherHill = async () => {
  console.log('📝 Inserting Christopher R Hill appointment...');
  
  const appointmentId = 'f7a8b9c0-d1e2-4f3a-8b7c-6d5e4f3a2b1c';
  
  const appointmentData = {
    id: appointmentId,
    lead_name: 'Christopher R Hill',
    project_name: 'Premier Vascular',
    date_appointment_created: '2025-11-19',
    date_of_appointment: '2025-12-09T15:00:00Z',
    requested_time: '3:00 PM',
    status: 'confirmed',
    ghl_id: 'kMqgTy3RCCu5wamhAK8p',
    lead_phone_number: '+14784535076',
    lead_email: 'chris.hill12185@gmail.com',
    dob: '1971-03-22',
    calendar_name: 'Request Your GAE Consultation - Milledgeville',
    agent: 'Unassigned',
    procedure_ordered: null,
    internal_process_complete: false,
    was_ever_confirmed: true,
    patient_intake_notes: `**Contact:** Name: Christopher R Hill | Phone: (478) 453-5076 | Email: chris.hill12185@gmail.com | DOB: March 22nd 1971 | Address: 116 Sunset Dr, Milledgeville Georgia 31061 | Patient ID: kMqgTy3RCCu5wamhAK8p

**Insurance:** Plan: Aetna Medicare | Alt Selection: Medicare | Notes: Patient has been experiencing knee pain for about 4 years. The pain significantly impacts his daily activities and mobility. He is interested in exploring GAE treatment as an alternative to traditional knee replacement surgery. Patient has Medicare coverage through Aetna.

**Pathology (GAE):** Duration: Over 3 years (approximately 4 years) | OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: NO | Pain Level: 7 | Symptoms: Chronic pain, Reduced mobility, Joint stiffness | Treatments Tried: Pain management medications, Physical therapy`,
    parsed_contact_info: {
      name: 'Christopher R Hill',
      phone: '(478) 453-5076',
      email: 'chris.hill12185@gmail.com',
      dob: 'March 22, 1971',
      address: '116 Sunset Dr, Milledgeville Georgia 31061',
      patient_id: 'kMqgTy3RCCu5wamhAK8p'
    },
    parsed_demographics: {
      age: 53,
      gender: 'Male',
      dob: '03/22/1971'
    },
    parsed_insurance_info: {
      provider: 'Aetna Medicare',
      plan: 'Medicare',
      member_id: null,
      group_number: null,
      notes: 'Medicare coverage through Aetna'
    },
    parsed_pathology_info: {
      primary_complaint: 'Chronic knee pain - GAE treatment consideration',
      affected_area: 'Knees',
      duration: 'Over 3 years (approximately 4 years)',
      pain_level: '7/10',
      symptoms: ['Chronic pain', 'Reduced mobility', 'Joint stiffness'],
      previous_treatments: ['Pain management medications', 'Physical therapy'],
      notes: 'OA or TKR Diagnosed: YES | Age Range: 46 to 55 | Trauma-related Onset: NO | Patient seeking alternative to traditional knee replacement'
    },
    parsed_medical_info: {
      allergies: null,
      current_medications: 'Pain management medications',
      primary_care_physician: null,
      imaging_reports: null
    },
    insurance_id_link: 'https://www.tdi.texas.gov/artwork/compliance/ambetter.png'
  };

  const { data, error } = await supabase
    .from('all_appointments')
    .insert([appointmentData])
    .select()
    .single();

  if (error) {
    console.error('❌ Error inserting Christopher R Hill:', error);
    return { success: false, error };
  }

  console.log('✅ Successfully inserted Christopher R Hill');
  return { success: true, data };
};
