export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agent_performance_stats: {
        Row: {
          agent_id: string | null
          agent_name: string
          answered_calls_vm: number
          appts_to_take_place: number
          average_duration_per_call_minutes: number
          average_duration_per_call_seconds: number
          booked_appointments: number
          conversations_2_minutes_plus: number
          created_at: string
          date: string
          id: string
          no_shows: number
          pickups_40_seconds_plus: number
          show_rate: number
          shows: number
          time_on_phone_minutes: number
          total_dials_made: number
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          agent_name: string
          answered_calls_vm?: number
          appts_to_take_place?: number
          average_duration_per_call_minutes?: number
          average_duration_per_call_seconds?: number
          booked_appointments?: number
          conversations_2_minutes_plus?: number
          created_at?: string
          date: string
          id?: string
          no_shows?: number
          pickups_40_seconds_plus?: number
          show_rate?: number
          shows?: number
          time_on_phone_minutes?: number
          total_dials_made?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          agent_name?: string
          answered_calls_vm?: number
          appts_to_take_place?: number
          average_duration_per_call_minutes?: number
          average_duration_per_call_seconds?: number
          booked_appointments?: number
          conversations_2_minutes_plus?: number
          created_at?: string
          date?: string
          id?: string
          no_shows?: number
          pickups_40_seconds_plus?: number
          show_rate?: number
          shows?: number
          time_on_phone_minutes?: number
          total_dials_made?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_performance_stats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          active: boolean
          agent_name: string
          agent_number: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          agent_name: string
          agent_number: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          agent_name?: string
          agent_number?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      all_appointments: {
        Row: {
          agent: string | null
          agent_number: string | null
          ai_summary: string | null
          appointment_id: string | null
          calendar_name: string | null
          color_indicator: string | null
          confirmed: boolean | null
          confirmed_number: string | null
          created_at: string
          date_appointment_created: string
          date_of_appointment: string | null
          detected_insurance_id: string | null
          detected_insurance_plan: string | null
          detected_insurance_provider: string | null
          ghl_id: string | null
          id: string
          insurance_detection_confidence: number | null
          is_viewed: boolean | null
          lead_email: string | null
          lead_name: string
          lead_phone_number: string | null
          parsed_contact_info: Json | null
          parsed_demographics: Json | null
          parsed_insurance_info: Json | null
          parsed_pathology_info: Json | null
          parsing_completed_at: string | null
          patient_intake_notes: string | null
          procedure_ordered: boolean | null
          project_name: string
          requested_time: string | null
          showed: boolean | null
          stage_booked: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          agent?: string | null
          agent_number?: string | null
          ai_summary?: string | null
          appointment_id?: string | null
          calendar_name?: string | null
          color_indicator?: string | null
          confirmed?: boolean | null
          confirmed_number?: string | null
          created_at?: string
          date_appointment_created: string
          date_of_appointment?: string | null
          detected_insurance_id?: string | null
          detected_insurance_plan?: string | null
          detected_insurance_provider?: string | null
          ghl_id?: string | null
          id?: string
          insurance_detection_confidence?: number | null
          is_viewed?: boolean | null
          lead_email?: string | null
          lead_name: string
          lead_phone_number?: string | null
          parsed_contact_info?: Json | null
          parsed_demographics?: Json | null
          parsed_insurance_info?: Json | null
          parsed_pathology_info?: Json | null
          parsing_completed_at?: string | null
          patient_intake_notes?: string | null
          procedure_ordered?: boolean | null
          project_name: string
          requested_time?: string | null
          showed?: boolean | null
          stage_booked?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          agent?: string | null
          agent_number?: string | null
          ai_summary?: string | null
          appointment_id?: string | null
          calendar_name?: string | null
          color_indicator?: string | null
          confirmed?: boolean | null
          confirmed_number?: string | null
          created_at?: string
          date_appointment_created?: string
          date_of_appointment?: string | null
          detected_insurance_id?: string | null
          detected_insurance_plan?: string | null
          detected_insurance_provider?: string | null
          ghl_id?: string | null
          id?: string
          insurance_detection_confidence?: number | null
          is_viewed?: boolean | null
          lead_email?: string | null
          lead_name?: string
          lead_phone_number?: string | null
          parsed_contact_info?: Json | null
          parsed_demographics?: Json | null
          parsed_insurance_info?: Json | null
          parsed_pathology_info?: Json | null
          parsing_completed_at?: string | null
          patient_intake_notes?: string | null
          procedure_ordered?: boolean | null
          project_name?: string
          requested_time?: string | null
          showed?: boolean | null
          stage_booked?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      all_calls: {
        Row: {
          agent: string | null
          call_datetime: string
          call_summary: string | null
          created_at: string
          date: string
          direction: string
          duration_seconds: number
          ghl_id: string | null
          id: string
          lead_name: string
          lead_phone_number: string
          project_name: string
          recording_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agent?: string | null
          call_datetime: string
          call_summary?: string | null
          created_at?: string
          date: string
          direction: string
          duration_seconds?: number
          ghl_id?: string | null
          id?: string
          lead_name: string
          lead_phone_number: string
          project_name: string
          recording_url?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          agent?: string | null
          call_datetime?: string
          call_summary?: string | null
          created_at?: string
          date?: string
          direction?: string
          duration_seconds?: number
          ghl_id?: string | null
          id?: string
          lead_name?: string
          lead_phone_number?: string
          project_name?: string
          recording_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          blocked_until: string | null
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          blocked_until?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      appointment_notes: {
        Row: {
          appointment_id: string
          created_at: string
          created_by: string | null
          id: string
          note_text: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_text: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_appointment_notes_appointment_id"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "all_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_tags: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          project_tag_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          project_tag_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          project_tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_appointment_tags_appointment_id"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointment_tags_project_tag_id"
            columns: ["project_tag_id"]
            isOneToOne: false
            referencedRelation: "project_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          additional_fields: Json | null
          appointment_date: string | null
          appointment_time: string | null
          cancelled: boolean | null
          client_id: string
          confirmed: boolean | null
          created_at: string
          id: string
          patient_name: string | null
          procedure_ordered: boolean | null
          raw_data: Json | null
          showed: boolean | null
          source_row: number | null
          source_sheet: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          additional_fields?: Json | null
          appointment_date?: string | null
          appointment_time?: string | null
          cancelled?: boolean | null
          client_id: string
          confirmed?: boolean | null
          created_at?: string
          id?: string
          patient_name?: string | null
          procedure_ordered?: boolean | null
          raw_data?: Json | null
          showed?: boolean | null
          source_row?: number | null
          source_sheet?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          additional_fields?: Json | null
          appointment_date?: string | null
          appointment_time?: string | null
          cancelled?: boolean | null
          client_id?: string
          confirmed?: boolean | null
          created_at?: string
          id?: string
          patient_name?: string | null
          procedure_ordered?: boolean | null
          raw_data?: Json | null
          showed?: boolean | null
          source_row?: number | null
          source_sheet?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      csv_import_history: {
        Row: {
          created_at: string
          file_name: string
          id: string
          import_summary: Json | null
          import_type: string
          imported_at: string
          imported_by: string | null
          imported_record_ids: string[]
          is_undone: boolean
          records_failed: number
          records_imported: number
          undone_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          import_summary?: Json | null
          import_type: string
          imported_at?: string
          imported_by?: string | null
          imported_record_ids?: string[]
          is_undone?: boolean
          records_failed?: number
          records_imported?: number
          undone_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          import_summary?: Json | null
          import_type?: string
          imported_at?: string
          imported_by?: string | null
          imported_record_ids?: string[]
          is_undone?: boolean
          records_failed?: number
          records_imported?: number
          undone_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      facebook_ad_spend: {
        Row: {
          campaign_name: string | null
          created_at: string
          date: string
          id: string
          project_name: string
          spend: number
          updated_at: string
        }
        Insert: {
          campaign_name?: string | null
          created_at?: string
          date: string
          id?: string
          project_name: string
          spend?: number
          updated_at?: string
        }
        Update: {
          campaign_name?: string | null
          created_at?: string
          date?: string
          id?: string
          project_name?: string
          spend?: number
          updated_at?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          ai_summary: string | null
          contact_info: Json | null
          created_at: string
          id: string
          project_form_id: string
          submission_data: Json
          submitted_at: string
          tags: Json | null
          user_id: string | null
        }
        Insert: {
          ai_summary?: string | null
          contact_info?: Json | null
          created_at?: string
          id?: string
          project_form_id: string
          submission_data: Json
          submitted_at?: string
          tags?: Json | null
          user_id?: string | null
        }
        Update: {
          ai_summary?: string | null
          contact_info?: Json | null
          created_at?: string
          id?: string
          project_form_id?: string
          submission_data?: Json
          submitted_at?: string
          tags?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_project_form_id_fkey"
            columns: ["project_form_id"]
            isOneToOne: false
            referencedRelation: "project_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string
          description: string | null
          form_data: Json
          form_type: string
          id: string
          title: string
          total_steps: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          form_data: Json
          form_type: string
          id?: string
          title: string
          total_steps?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          form_data?: Json
          form_type?: string
          id?: string
          title?: string
          total_steps?: number
          updated_at?: string
        }
        Relationships: []
      }
      new_leads: {
        Row: {
          address: string | null
          ai_summary: string | null
          appt_date: string | null
          calendar_location: string | null
          card_image: string | null
          contact_id: string | null
          created_at: string
          date: string
          dob: string | null
          email: string | null
          fever_chills: boolean | null
          first_name: string | null
          gae_candidate: boolean | null
          group_number: string | null
          heel_morning_pain: boolean | null
          heel_pain_duration: string | null
          heel_pain_exercise_frequency: string | null
          heel_pain_improves_rest: boolean | null
          id: string
          insurance_id: string | null
          insurance_plan: string | null
          insurance_provider: string | null
          knee_imaging: boolean | null
          knee_osteoarthritis_diagnosis: boolean | null
          knee_pain_duration: string | null
          knee_treatments_tried: string | null
          last_name: string | null
          lead_name: string
          notes: string | null
          pain_severity_scale: number | null
          parsed_contact_info: Json | null
          parsed_demographics: Json | null
          parsed_insurance_info: Json | null
          parsed_pathology_info: Json | null
          parsing_completed_at: string | null
          patient_intake_notes: string | null
          phone_number: string | null
          plantar_fasciitis_imaging: boolean | null
          plantar_fasciitis_mobility_impact: boolean | null
          plantar_fasciitis_treatments: string | null
          procedure_ordered: boolean | null
          project_name: string
          status: string | null
          symptoms_description: string | null
          times_called: number
          trauma_injury_onset: boolean | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai_summary?: string | null
          appt_date?: string | null
          calendar_location?: string | null
          card_image?: string | null
          contact_id?: string | null
          created_at?: string
          date: string
          dob?: string | null
          email?: string | null
          fever_chills?: boolean | null
          first_name?: string | null
          gae_candidate?: boolean | null
          group_number?: string | null
          heel_morning_pain?: boolean | null
          heel_pain_duration?: string | null
          heel_pain_exercise_frequency?: string | null
          heel_pain_improves_rest?: boolean | null
          id?: string
          insurance_id?: string | null
          insurance_plan?: string | null
          insurance_provider?: string | null
          knee_imaging?: boolean | null
          knee_osteoarthritis_diagnosis?: boolean | null
          knee_pain_duration?: string | null
          knee_treatments_tried?: string | null
          last_name?: string | null
          lead_name: string
          notes?: string | null
          pain_severity_scale?: number | null
          parsed_contact_info?: Json | null
          parsed_demographics?: Json | null
          parsed_insurance_info?: Json | null
          parsed_pathology_info?: Json | null
          parsing_completed_at?: string | null
          patient_intake_notes?: string | null
          phone_number?: string | null
          plantar_fasciitis_imaging?: boolean | null
          plantar_fasciitis_mobility_impact?: boolean | null
          plantar_fasciitis_treatments?: string | null
          procedure_ordered?: boolean | null
          project_name: string
          status?: string | null
          symptoms_description?: string | null
          times_called?: number
          trauma_injury_onset?: boolean | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai_summary?: string | null
          appt_date?: string | null
          calendar_location?: string | null
          card_image?: string | null
          contact_id?: string | null
          created_at?: string
          date?: string
          dob?: string | null
          email?: string | null
          fever_chills?: boolean | null
          first_name?: string | null
          gae_candidate?: boolean | null
          group_number?: string | null
          heel_morning_pain?: boolean | null
          heel_pain_duration?: string | null
          heel_pain_exercise_frequency?: string | null
          heel_pain_improves_rest?: boolean | null
          id?: string
          insurance_id?: string | null
          insurance_plan?: string | null
          insurance_provider?: string | null
          knee_imaging?: boolean | null
          knee_osteoarthritis_diagnosis?: boolean | null
          knee_pain_duration?: string | null
          knee_treatments_tried?: string | null
          last_name?: string | null
          lead_name?: string
          notes?: string | null
          pain_severity_scale?: number | null
          parsed_contact_info?: Json | null
          parsed_demographics?: Json | null
          parsed_insurance_info?: Json | null
          parsed_pathology_info?: Json | null
          parsing_completed_at?: string | null
          patient_intake_notes?: string | null
          phone_number?: string | null
          plantar_fasciitis_imaging?: boolean | null
          plantar_fasciitis_mobility_impact?: boolean | null
          plantar_fasciitis_treatments?: string | null
          procedure_ordered?: boolean | null
          project_name?: string
          status?: string | null
          symptoms_description?: string | null
          times_called?: number
          trauma_injury_onset?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_forms: {
        Row: {
          created_at: string
          form_template_id: string
          id: string
          is_active: boolean
          project_id: string
          public_url_slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_template_id: string
          id?: string
          is_active?: boolean
          project_id: string
          public_url_slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_template_id?: string
          id?: string
          is_active?: boolean
          project_id?: string
          public_url_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_forms_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_portal_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          project_name: string
          session_token: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          project_name: string
          session_token: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          project_name?: string
          session_token?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      project_tags: {
        Row: {
          created_at: string
          id: string
          project_id: string
          tag_color: string
          tag_description: string | null
          tag_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          tag_color?: string
          tag_description?: string | null
          tag_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          tag_color?: string
          tag_description?: string | null
          tag_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_project_tags_project_id"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_user_access: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_user_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          active: boolean
          brand_primary_color: string | null
          brand_secondary_color: string | null
          created_at: string
          custom_doctors: Json | null
          custom_facility_info: Json | null
          custom_insurance_list: Json | null
          custom_logo_url: string | null
          ghl_api_key: string | null
          id: string
          portal_password: string | null
          project_name: string
          selected_form_types: string[] | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          created_at?: string
          custom_doctors?: Json | null
          custom_facility_info?: Json | null
          custom_insurance_list?: Json | null
          custom_logo_url?: string | null
          ghl_api_key?: string | null
          id?: string
          portal_password?: string | null
          project_name: string
          selected_form_types?: string[] | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          created_at?: string
          custom_doctors?: Json | null
          custom_facility_info?: Json | null
          custom_insurance_list?: Json | null
          custom_logo_url?: string | null
          ghl_api_key?: string | null
          id?: string
          portal_password?: string | null
          project_name?: string
          selected_form_types?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_log: {
        Row: {
          action_type: string
          count: number | null
          created_at: string | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          action_type: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          action_type?: string
          count?: number | null
          created_at?: string | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      speed_to_lead_stats: {
        Row: {
          created_at: string
          date: string
          date_time_in: string
          date_time_of_first_call: string | null
          id: string
          lead_name: string
          lead_phone_number: string
          project_name: string
          speed_to_lead_time_min: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          date_time_in: string
          date_time_of_first_call?: string | null
          id?: string
          lead_name: string
          lead_phone_number: string
          project_name: string
          speed_to_lead_time_min?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          date_time_in?: string
          date_time_of_first_call?: string | null
          id?: string
          lead_name?: string
          lead_phone_number?: string
          project_name?: string
          speed_to_lead_time_min?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_sync_patient_intake_notes: {
        Args: Record<PropertyKey, never>
        Returns: {
          appointment_id: string
          lead_name: string
          project_name: string
          notes_synced: boolean
        }[]
      }
      check_rate_limit_enhanced: {
        Args: {
          identifier_param: string
          action_type_param: string
          max_attempts_param?: number
          window_minutes_param?: number
        }
        Returns: boolean
      }
      check_rate_limit_v2: {
        Args: {
          identifier_param: string
          endpoint_param: string
          max_requests_param?: number
          window_minutes_param?: number
        }
        Returns: boolean
      }
      cleanup_expired_portal_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_security_tables: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_portal_session: {
        Args: {
          project_name_param: string
          password_param: string
          ip_address_param?: unknown
          user_agent_param?: string
        }
        Returns: string
      }
      create_secure_portal_session: {
        Args: {
          project_name_param: string
          password_param: string
          ip_address_param?: unknown
          user_agent_param?: string
        }
        Returns: string
      }
      get_dashboard_data: {
        Args: {
          p_project_name?: string
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
        }
        Returns: {
          leads_count: number
          appointments_count: number
          calls_count: number
          ad_spend_total: number
        }[]
      }
      get_project_stats: {
        Args: { project_filter?: string }
        Returns: {
          project_name: string
          leads_count: number
          calls_count: number
          appointments_count: number
          confirmed_appointments_count: number
          ad_spend: number
          last_activity: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_project_access: {
        Args: { _user_id: string; _project_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      hash_password: {
        Args: { password: string }
        Returns: string
      }
      log_security_event: {
        Args: {
          event_type_param: string
          ip_address_param?: unknown
          user_agent_param?: string
          details_param?: Json
        }
        Returns: undefined
      }
      log_security_event_critical: {
        Args: {
          event_type_param: string
          ip_address_param?: unknown
          user_agent_param?: string
          details_param?: Json
          severity_param?: string
        }
        Returns: undefined
      }
      log_security_event_enhanced: {
        Args: {
          event_type_param: string
          ip_address_param?: unknown
          user_agent_param?: string
          details_param?: Json
          severity_param?: string
        }
        Returns: undefined
      }
      log_security_event_v2: {
        Args: {
          event_type_param: string
          severity_param?: string
          user_id_param?: string
          session_id_param?: string
          ip_address_param?: unknown
          user_agent_param?: string
          details_param?: Json
          endpoint_param?: string
        }
        Returns: string
      }
      refresh_performance_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_project_access: {
        Args: { project_name_param: string }
        Returns: boolean
      }
      validate_secure_session: {
        Args: {
          project_name_param: string
          session_token_param: string
          ip_address_param?: unknown
        }
        Returns: boolean
      }
      validate_security_policies: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          has_rls: boolean
          public_access_count: number
          authenticated_access_count: number
          security_status: string
        }[]
      }
      verify_password: {
        Args: { password: string; hash: string }
        Returns: boolean
      }
      verify_portal_session: {
        Args: {
          project_name_param: string
          session_token_param: string
          ip_address_param?: unknown
        }
        Returns: boolean
      }
      verify_secure_portal_session: {
        Args: {
          project_name_param: string
          session_token_param: string
          ip_address_param?: unknown
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "agent" | "project_user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "agent", "project_user"],
    },
  },
} as const
