import { supabase } from '@/integrations/supabase/client';

export const insertCassandraEvans = async () => {
  console.log('📝 Inserting Cassandra Evans appointment...');
  
  const appointmentId = 'e8f9c5d6-b3a2-4e8f-9d1a-7c6e5f4a3b2c';
  
  const appointmentData = {
    id: appointmentId,
    lead_name: 'Cassandra Evans',
    project_name: 'Premier Vascular',
    date_appointment_created: '2025-11-19',
    date_of_appointment: '2025-12-16T15:00:00Z',
    requested_time: '3:00 PM',
    status: 'confirmed',
    ghl_id: 'bC52pHANd2dD50NXXjWW',
    lead_phone_number: '+14782343357',
    lead_email: 'cassandraevans410@yahoo.com',
    dob: '1983-05-16',
    calendar_name: 'Request Your GAE Consultation - Milledgeville',
    agent: 'Unassigned',
    procedure_ordered: null,
    internal_process_complete: false,
    was_ever_confirmed: true,
    patient_intake_notes: `**Contact:** Name: Cassandra Evans | Phone: (478) 234-3357 | Email: cassandraevans410@yahoo.com | DOB: May 16th 1983 | Address: 2261 Leo Ct, Milledgeville Georgia 31061 | Patient ID: bC52pHANd2dD50NXXjWW

**Insurance:** Plan: Ambetter | Alt Selection: Other | Notes: Patient has been dealing with her knee pain for almost a year and a half. She can't sit for too long, because when she tries to stand up her knees hurt a lot. She has to sleep with a pillow under her knee, so she can sleep without pain. She looks forward to get the GAE treatment. Patient is aware that we have to call the insurance in order to verify her benefits and coverage

**Pathology (GAE):** Duration: Over 1 year | OA or TKR Diagnosed: YES | Age Range: 36 to 45 | Trauma-related Onset: NO | Pain Level: 8 | Symptoms: Sharp Pain, Instability or weakness, Stiffness | Treatments Tried: Medications/pain pills`,
    parsed_contact_info: JSON.stringify({
      name: 'Cassandra Evans',
      phone: '(478) 234-3357',
      email: 'cassandraevans410@yahoo.com',
      dob: 'May 16, 1983',
      address: '2261 Leo Ct, Milledgeville Georgia 31061',
      patient_id: 'bC52pHANd2dD50NXXjWW'
    }) as any,
    parsed_demographics: JSON.stringify({
      age: 41,
      gender: 'Female',
      dob: '05/16/1983'
    }) as any,
    parsed_insurance_info: JSON.stringify({
      provider: 'Ambetter',
      plan: 'Other',
      member_id: null,
      group_number: null,
      notes: 'Patient is aware that we have to call the insurance in order to verify her benefits and coverage'
    }) as any,
    parsed_pathology_info: JSON.stringify({
      primary_complaint: 'Knee pain - GAE treatment',
      affected_area: 'Both knees',
      duration: 'Over 1 year (approximately 1.5 years)',
      pain_level: '8/10',
      symptoms: ['Sharp Pain', 'Instability or weakness', 'Stiffness', 'Difficulty standing after sitting', 'Sleep disturbance'],
      previous_treatments: ['Medications/pain pills', 'Sleeping with pillow under knee'],
      notes: 'OA or TKR Diagnosed: YES | Age Range: 36 to 45 | Trauma-related Onset: NO'
    }) as any,
    parsed_medical_info: JSON.stringify({
      allergies: null,
      current_medications: 'Pain pills',
      primary_care_physician: null,
      imaging_reports: null
    }) as any,
    insurance_id_link: 'https://www.tdi.texas.gov/artwork/compliance/ambetter.png'
  };

  const { data, error } = await supabase
    .from('all_appointments')
    .insert([appointmentData])
    .select()
    .single();

  if (error) {
    console.error('❌ Error inserting Cassandra Evans:', error);
    return { success: false, error };
  }

  console.log('✅ Successfully inserted Cassandra Evans');
  return { success: true, data };
};
