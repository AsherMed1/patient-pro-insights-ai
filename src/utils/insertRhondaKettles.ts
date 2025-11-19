import { supabase } from '@/integrations/supabase/client';

export const insertRhondaKettles = async () => {
  console.log('📝 Inserting Rhonda Kettles appointment...');
  
  const appointmentId = 'a1b2c3d4-e5f6-4a7b-9c8d-7e6f5a4b3c2d';
  
  const appointmentData = {
    id: appointmentId,
    lead_name: 'Rhonda Kettles',
    project_name: 'Premier Vascular',
    date_appointment_created: '2025-11-19',
    date_of_appointment: '2025-12-10T14:00:00Z',
    requested_time: '2:00 PM',
    status: 'confirmed',
    ghl_id: 'xY9zW8vU7tS6rQ5pO4nM3',
    lead_phone_number: '+14782345678',
    lead_email: 'rhonda.kettles@email.com',
    dob: '1968-07-15',
    calendar_name: 'Request Your GAE Consultation - Milledgeville',
    agent: 'Unassigned',
    procedure_ordered: null,
    internal_process_complete: false,
    was_ever_confirmed: true,
    patient_intake_notes: `**Contact:** Name: Rhonda Kettles | Phone: (478) 234-5678 | Email: rhonda.kettles@email.com | DOB: July 15th 1968 | Address: [Address to be confirmed] | Patient ID: xY9zW8vU7tS6rQ5pO4nM3

**Insurance:** Plan: [Insurance to be verified] | Alt Selection: Other | Notes: Patient requires insurance verification. Interested in GAE consultation for vascular condition.

**Pathology (GAE):** Duration: [To be determined during consultation] | OA or TKR Diagnosed: [To be confirmed] | Age Range: 56 to 65 | Trauma-related Onset: NO | Pain Level: [To be assessed] | Symptoms: [To be documented] | Treatments Tried: [To be discussed]`,
    parsed_contact_info: {
      name: 'Rhonda Kettles',
      phone: '(478) 234-5678',
      email: 'rhonda.kettles@email.com',
      dob: 'July 15, 1968',
      address: '[Address to be confirmed]',
      patient_id: 'xY9zW8vU7tS6rQ5pO4nM3'
    },
    parsed_demographics: {
      age: 56,
      gender: 'Female',
      dob: '07/15/1968'
    },
    parsed_insurance_info: {
      provider: '[Insurance to be verified]',
      plan: 'Other',
      member_id: null,
      group_number: null,
      notes: 'Insurance verification pending'
    },
    parsed_pathology_info: {
      primary_complaint: 'Vascular condition - GAE consultation',
      affected_area: '[To be determined]',
      duration: '[To be determined during consultation]',
      pain_level: null,
      symptoms: ['[To be documented during consultation]'],
      previous_treatments: ['[To be discussed]'],
      notes: 'Age Range: 56 to 65 | Additional details to be collected during consultation'
    },
    parsed_medical_info: {
      allergies: null,
      current_medications: null,
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
    console.error('❌ Error inserting Rhonda Kettles:', error);
    return { success: false, error };
  }

  console.log('✅ Successfully inserted Rhonda Kettles');
  return { success: true, data };
};
