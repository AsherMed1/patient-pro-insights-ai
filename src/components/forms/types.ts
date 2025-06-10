
export interface FormTemplate {
  id: string;
  form_type: string;
  title: string;
  description: string;
  total_steps: number;
  form_data: {
    slides: FormSlide[];
  };
  created_at: string;
  updated_at: string;
}

export interface FormSlide {
  id: number;
  type: 'welcome' | 'question' | 'educator' | 'ai_summary' | 'lead_capture';
  title: string;
  description?: string;
  image_placeholder?: string;
  cta?: string;
  progress?: string;
  field_name?: string;
  field_type?: 'radio' | 'checkbox' | 'text' | 'textarea' | 'email' | 'tel' | 'select' | 'range';
  required?: boolean;
  options?: FormOption[];
  fields?: FormField[];
  cta_options?: { value: string; label: string; }[];
  conditional_follow_up?: ConditionalFollowUp;
  conditional_follow_ups?: Record<string, { questions: FormField[] }>;
  doctors?: { name: string; specialty: string; }[];
  min?: number;
  max?: number;
}

export interface FormOption {
  value: string;
  label: string;
  tags?: string[];
}

export interface FormField {
  field_name: string;
  label: string;
  field_type: string;
  required?: boolean;
  options?: FormOption[];
}

export interface ConditionalFollowUp {
  condition: 'equals' | 'value_in' | 'includes_any' | 'greater_than_equal';
  value?: string | number;
  values?: string[];
  question: {
    title: string;
    field_name: string;
    field_type: string;
    options: FormOption[];
  };
}

export interface FormSubmission {
  id: string;
  project_form_id: string;
  submission_data: Record<string, any>;
  tags: string[];
  ai_summary?: string;
  contact_info?: Record<string, any>;
  submitted_at: string;
  created_at: string;
}

export interface ProjectForm {
  id: string;
  project_id: string;
  form_template_id: string;
  public_url_slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  form_templates?: FormTemplate;
}
