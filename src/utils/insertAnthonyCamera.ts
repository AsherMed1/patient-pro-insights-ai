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
    patient_intake_notes: 'Contact: Name: Anthony Camera, Phone: +19147142451, Patient ID: nPsAgJM0SFkclV9NgbUR /n Insurance: Plan: Blue cross blue shield, Alt Selection: Blue Cross, ID: R5E819585156, Group: PK2804',
    parsed_contact_info: {
      name: 'Anthony Camera',
      phone: '+19147142451',
      patient_id: 'nPsAgJM0SFkclV9NgbUR'
    },
    parsed_insurance_info: {
      provider: 'Blue Cross Blue Shield',
      plan: 'Blue Cross',
      insurance_id: 'R5E819585156',
      group_number: 'PK2804',
      alternate_selection: 'Blue Cross'
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
