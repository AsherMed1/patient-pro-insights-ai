
export interface AllAppointment {
  id: string;
  date_appointment_created: string;
  date_of_appointment: string | null;
  project_name: string;
  lead_name: string;
  lead_email: string | null;
  lead_phone_number: string | null;
  calendar_name: string | null;
  requested_time: string | null;
  stage_booked: string | null;
  showed: boolean | null;
  confirmed: boolean | null;
  agent: string | null;
  agent_number: string | null;
  ghl_id: string | null;
  confirmed_number: string | null;
  created_at: string;
  updated_at: string;
  status: string | null;
  procedure_ordered: boolean | null;
  patient_intake_notes: string | null;
}

export interface AllAppointmentsManagerProps {
  projectFilter?: string;
}
