
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
  procedure_status?: string | null;
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
  parsed_medical_info?: any;
  parsing_completed_at?: string | null;
  was_ever_confirmed?: boolean;
  internal_process_complete?: boolean;
  insurance_id_link?: string;
  insurance_back_link?: string | null;
  last_ghl_sync_status?: string | null;
  last_ghl_sync_at?: string | null;
  last_ghl_sync_error?: string | null;
  is_reserved_block?: boolean;
  reserved_end_time?: string | null;
  ghl_location_id?: string | null;
}

export interface AllAppointmentsManagerProps {
  projectFilter?: string;
  onDataChanged?: () => void;
  initialStatusFilter?: string;
  initialProcedureFilter?: string;
  initialTab?: string;
}

export interface AppointmentCardProps {
  appointment: AllAppointment;
  projectFilter?: string;
  statusOptions: string[];
  onUpdateStatus: (appointmentId: string, status: string) => void;
  onUpdateProcedure: (appointmentId: string, procedureStatus: string | null) => void;
  onUpdateDate: (appointmentId: string, date: string | null) => void;
  onUpdateTime: (appointmentId: string, time: string | null) => void;
  onUpdateInternalProcess?: (appointmentId: string, isComplete: boolean) => void;
  onUpdateDOB?: (appointmentId: string, dob: string | null) => void;
  onDelete?: (appointmentId: string) => void;
  onUpdateName?: (appointmentId: string, name: string) => void;
  onUpdateEmail?: (appointmentId: string, email: string) => void;
  onUpdatePhone?: (appointmentId: string, phone: string) => void;
  onUpdateCalendarLocation?: (appointmentId: string, location: string) => void;
}
