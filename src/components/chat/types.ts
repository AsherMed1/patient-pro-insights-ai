export interface PatientReference {
  patient_id: string;
  patient_name: string;
  phone?: string;
  appointment_id?: string;
}

export interface Message {
  id: string;
  project_name: string;
  message: string;
  direction: 'inbound' | 'outbound';
  sender_type: string | null;
  sender_name: string | null;
  sender_email: string | null;
  patient_reference: any;
  metadata: any;
  created_at: string;
  read_at: string | null;
}

export interface Patient {
  id: string;
  lead_name: string;
  phone_number?: string;
  email?: string;
  appointment_id?: string;
  appointment_date?: string;
  project_name: string;
}
