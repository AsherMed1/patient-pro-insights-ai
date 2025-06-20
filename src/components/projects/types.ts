
export interface Project {
  id: string;
  project_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  portal_password?: string | null;
  ghl_api_key?: string | null;
  brand_primary_color?: string;
  brand_secondary_color?: string;
  custom_logo_url?: string;
  custom_insurance_list?: any[] | null;
  custom_doctors?: any[] | null;
  custom_facility_info?: any | null;
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
  active: boolean;
  portal_password?: string;
  ghl_api_key?: string;
  brand_primary_color: string;
  brand_secondary_color: string;
  custom_logo_url?: string;
  custom_insurance_list?: any[];
  custom_doctors?: any[];
  custom_facility_info?: any;
}
