
export interface Project {
  id: string;
  project_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  portal_password?: string | null;
}

export interface ProjectStats {
  project_name: string;
  leads_count: number;
  calls_count: number;
  appointments_count: number;
  confirmed_appointments_count: number;
  ad_spend: number;
  last_activity: string | null;
}

export interface ProjectFormData {
  project_name: string;
  portal_password?: string;
}
