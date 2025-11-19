import { supabase } from "@/integrations/supabase/client";

export const recreateMissingPremierAppointments = async () => {
  console.log('Recreating missing Premier Vascular appointments...');
  
  const appointments = [
    {
      project_name: 'Premier Vascular',
      lead_name: 'Diana Johnson',
      lead_phone_number: '+12108409713',
      lead_email: 'ladyslicktexas@yahoo.com',
      date_appointment_created: '2025-10-29',
      date_of_appointment: '2025-10-29',
      dob: '1960-01-11',
      ghl_id: '09izp4moKoUrOD8LN6pS',
      status: 'confirmed',
      calendar_name: 'Request your GAE Consultation',
      internal_process_complete: false,
      was_ever_confirmed: true,
      patient_intake_notes: `Contact Information:
- Name: Diana Johnson
- Phone: (210) 840-9713
- Email: ladyslicktexas@yahoo.com
- DOB: 01/11/1960
- Address: Not provided

Insurance Information:
- Primary Insurance: United Healthcare Medicare
- Secondary Insurance: Blue Cross Blue Shield
- Member ID: Not provided

Pathology Information:
- Primary Complaint: Vascular consultation needed
- Affected Area: Lower extremities
- Duration: Not specified
- Symptoms: Requesting GAE consultation`,
    },
    {
      project_name: 'Premier Vascular',
      lead_name: 'Tiffini Porter',
      lead_phone_number: '+17708665081',
      lead_email: 'tiffinime@gmail.com',
      date_appointment_created: '2025-10-26',
      date_of_appointment: '2025-10-26',
      dob: '1973-04-07',
      ghl_id: 'Z64ylExpfnbgOnDQ49P9',
      status: 'confirmed',
      calendar_name: 'Request your GAE Consultation',
      internal_process_complete: false,
      was_ever_confirmed: true,
      patient_intake_notes: `Contact Information:
- Name: Tiffini Porter
- Phone: (770) 866-5081
- Email: tiffinime@gmail.com
- DOB: 04/07/1973
- Address: Not provided

Insurance Information:
- Primary Insurance: Blue Cross
- Member ID: Not provided

Pathology Information:
- Primary Complaint: Vascular consultation needed
- Affected Area: Lower extremities
- Duration: Not specified
- Symptoms: Requesting GAE consultation`,
    },
    {
      project_name: 'Premier Vascular',
      lead_name: 'Bill Haefele',
      lead_phone_number: '+12295390318',
      lead_email: 'whaefele@yahoo.com',
      date_appointment_created: '2025-10-27',
      date_of_appointment: '2025-10-27',
      dob: '1966-05-09',
      ghl_id: 'zH2MleoweQYoWqdsGJ9U',
      status: 'confirmed',
      calendar_name: 'Request your GAE Consultation',
      internal_process_complete: false,
      was_ever_confirmed: true,
      insurance_id_link: 'https://storage.googleapis.com/msgsndr/zH2MleoweQYoWqdsGJ9U/media/67258c0ceeb9e8b46e56a394.png',
      patient_intake_notes: `Contact Information:
- Name: Bill Haefele
- Phone: (229) 539-0318
- Email: whaefele@yahoo.com
- DOB: 05/09/1966
- Address: Not provided

Insurance Information:
- Primary Insurance: Blue Cross
- Member ID: Not provided
- Insurance Card: Available

Pathology Information:
- Primary Complaint: Vascular consultation needed
- Affected Area: Lower extremities
- Duration: Not specified
- Symptoms: Requesting GAE consultation`,
    },
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const appointment of appointments) {
    const { data, error } = await supabase
      .from('all_appointments')
      .insert(appointment)
      .select()
      .single();

    if (error) {
      console.error(`Error creating appointment for ${appointment.lead_name}:`, error);
      errorCount++;
    } else {
      console.log(`Successfully created appointment for ${appointment.lead_name}:`, data);
      successCount++;
    }
  }

  console.log(`Completed: ${successCount} successful, ${errorCount} errors`);
  return { success: successCount === appointments.length, successCount, errorCount };
};
