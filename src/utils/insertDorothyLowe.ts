import { supabase } from '@/integrations/supabase/client';

export const insertDorothyLowe = async () => {
  console.log('📝 Inserting Dorothy Beatrice Lowe appointment...');
  
  const appointmentId = 'b2c3d4e5-f6a7-4b8c-9d0e-8f7a6b5c4d3e';
  
  const appointmentData = {
    id: appointmentId,
    lead_name: 'Dorothy Beatrice Lowe',
    project_name: 'Premier Vascular',
    date_appointment_created: '2025-11-19',
    date_of_appointment: '2025-12-11T10:00:00Z',
    requested_time: '10:00 AM',
    status: 'confirmed',
    ghl_id: 'pL0mK9nJ8hG7fE6dC5bA4',
    lead_phone_number: '+14783456789',
    lead_email: 'dorothy.lowe@email.com',
    dob: '1965-04-28',
    calendar_name: 'Request Your GAE Consultation - Milledgeville',
    agent: 'Unassigned',
    procedure_ordered: null,
    internal_process_complete: false,
    was_ever_confirmed: true,
    patient_intake_notes: `**Contact:** Name: Dorothy Beatrice Lowe | Phone: (478) 345-6789 | Email: dorothy.lowe@email.com | DOB: April 28th 1965 | Address: [Address to be confirmed] | Patient ID: pL0mK9nJ8hG7fE6dC5bA4

**Insurance:** Plan: [Insurance to be verified] | Alt Selection: Other | Notes: Patient requires insurance verification. Scheduled for GAE consultation.

**Pathology (GAE):** Duration: [To be determined during consultation] | OA or TKR Diagnosed: [To be confirmed] | Age Range: 56 to 65 | Trauma-related Onset: NO | Pain Level: [To be assessed] | Symptoms: [To be documented] | Treatments Tried: [To be discussed]`,
    parsed_contact_info: JSON.stringify({
      name: 'Dorothy Beatrice Lowe',
      phone: '(478) 345-6789',
      email: 'dorothy.lowe@email.com',
      dob: 'April 28, 1965',
      address: '[Address to be confirmed]',
      patient_id: 'pL0mK9nJ8hG7fE6dC5bA4'
    }) as any,
    parsed_demographics: JSON.stringify({
      age: 59,
      gender: 'Female',
      dob: '04/28/1965'
    }) as any,
    parsed_insurance_info: JSON.stringify({
      provider: '[Insurance to be verified]',
      plan: 'Other',
      member_id: null,
      group_number: null,
      notes: 'Insurance verification pending'
    }) as any,
    parsed_pathology_info: JSON.stringify({
      primary_complaint: 'Vascular condition - GAE consultation',
      affected_area: '[To be determined]',
      duration: '[To be determined during consultation]',
      pain_level: null,
      symptoms: ['[To be documented during consultation]'],
      previous_treatments: ['[To be discussed]'],
      notes: 'Age Range: 56 to 65 | Additional details to be collected during consultation'
    }) as any,
    parsed_medical_info: JSON.stringify({
      allergies: null,
      current_medications: null,
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
    console.error('❌ Error inserting Dorothy Beatrice Lowe:', error);
    return { success: false, error };
  }

  console.log('✅ Successfully inserted Dorothy Beatrice Lowe');
  return { success: true, data };
};
