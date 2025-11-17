import { supabase } from "@/integrations/supabase/client";

export async function addStarHigginsAppointment() {
  const { data, error } = await supabase
    .from('all_appointments')
    .insert({
      project_name: 'Premier Vascular',
      lead_name: 'Star Shamaine Higgins',
      date_appointment_created: '2024-11-15',
      date_of_appointment: '2025-12-10',
      requested_time: '14:00:00',
      status: 'confirmed',
      calendar_name: 'Request your UFE Consultation',
      lead_email: 'star.higgins12@myyahoo.com',
      lead_phone_number: '16784677356',
      internal_process_complete: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding appointment:', error);
    throw error;
  }

  console.log('✅ Successfully added Star Shamaine Higgins appointment:', data);
  return data;
}
