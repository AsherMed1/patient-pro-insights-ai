
export interface AllAppointment {
  id: string;
  date_appointment_created: string;
  date_of_appointment: string | null;
  project_name: string;
  lead_name: string;
  lead_email: string | null;
  lead_phone_number: string | null;
  dob?: string | null;
  calendar_name: string | null;
  requested_time: string | null;
  stage_booked: string | null;
  agent: string | null;
  agent_number: string | null;
  ghl_id: string | null;
  ghl_appointment_id?: string | null;
  confirmed_number: string | null;
  created_at: string;
  updated_at: string;
  status: string | null;
  procedure_ordered: boolean | null;
  patient_intake_notes: string | null;
  ai_summary?: string;
  detected_insurance_provider: string | null;
  detected_insurance_plan: string | null;
  detected_insurance_id: string | null;
  insurance_detection_confidence: number | null;
  parsed_insurance_info?: any;
  parsed_pathology_info?: any;
  parsed_contact_info?: any;
  parsed_demographics?: any;
  parsing_completed_at?: string | null;
  was_ever_confirmed?: boolean;
  internal_process_complete?: boolean;
}

export interface AllAppointmentsManagerProps {
  projectFilter?: string;
}
