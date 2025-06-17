
export interface ProjectTag {
  id: string;
  project_id: string;
  tag_name: string;
  tag_color: string;
  tag_description?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentTag {
  id: string;
  appointment_id: string;
  project_tag_id: string;
  created_at: string;
}

export interface TagWithAppointmentCount extends ProjectTag {
  appointment_count?: number;
}
