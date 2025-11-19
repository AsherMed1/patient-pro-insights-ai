import { supabase } from "@/integrations/supabase/client";

// One-time script to add Anthony Camera appointment from new_leads to all_appointments
async function insertAnthonyCameraAppointment() {
  console.log('🔄 Inserting Anthony Camera appointment...');
  
  const appointmentData = {
    project_name: 'Premier Vascular',
    lead_name: 'Anthony Camera',
    lead_phone_number: '+19147142451',
    ghl_id: 'nPsAgJM0SFkclV9NgbUR',
    date_of_appointment: '2025-11-20',
    requested_time: '15:40:00',
    date_appointment_created: '2025-10-24',
    calendar_name: 'Request your GAE Consultation at Macon, GA',
    status: 'confirmed',
    internal_process_complete: false,
    was_ever_confirmed: true,
    detected_insurance_provider: 'Blue Cross Blue Shield',
    detected_insurance_plan: 'Blue Cross',
    detected_insurance_id: 'R5E819585156',
    patient_intake_notes: 'Contact: Name: Anthony Camera, Phone: (914) 714-2451, Email: antjcamera@gmail.com, DOB: Apr 1st 1962, Address: 1690 Briarcliff Rd, Macon Georgia 31211, Patient ID: nPsAgJM0SFkclV9NgbUR. /n Insurance: Plan: Blue cross blue shield, Group #: PK2804, Alt Selection: Blue Cross. /n Pathology: GAE - Duration: Over 1 year, OA or TKR Diagnosed: YES, Age Range: 56 and above, Trauma-related Onset: NO, Pain Level: 4, Symptoms: Dull Ache, Treatments Tried: Knee replacement, Other (please specify below), Medications/pain pills, Clean up type surgery, Imaging Done: YES.',
    parsed_contact_info: {
      name: 'Anthony Camera',
      phone: '(914) 714-2451',
      email: 'antjcamera@gmail.com',
      address: '1690 Briarcliff Rd, Macon Georgia 31211',
      patient_id: 'nPsAgJM0SFkclV9NgbUR'
    },
    parsed_demographics: {
      dob: '1962-04-01',
      age: 63,
      gender: 'Male'
    },
    parsed_insurance_info: {
      provider: 'Blue Cross Blue Shield',
      plan: 'Blue Cross',
      group_number: 'PK2804',
      alternate_selection: 'Blue Cross'
    },
    parsed_pathology_info: {
      procedure: 'GAE',
      duration: 'Over 1 year',
      oa_tkr_diagnosed: 'YES',
      age_range: '56 and above',
      trauma_related_onset: 'NO',
      pain_level: 4,
      symptoms: 'Dull Ache',
      treatments_tried: 'Knee replacement, Other (please specify below), Medications/pain pills, Clean up type surgery',
      imaging_done: 'YES'
    }
  };

  const { data, error } = await supabase
    .from('all_appointments')
    .insert(appointmentData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error inserting Anthony Camera appointment:', error);
    return { success: false, error };
  }

  console.log('✅ Successfully inserted Anthony Camera appointment:', data);
  return { success: true, data };
}

// Execute the insert
insertAnthonyCameraAppointment();

export { insertAnthonyCameraAppointment };
