export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_manager_appointments: {
        Row: {
          appointment_date: string
          client_name: string
          first_name: string | null
          id: string
          insurance_provider: string | null
          last_name: string | null
          notes: string | null
          phone_number: string | null
          procedure_ordered: boolean
          procedure_type: string
          status: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          appointment_date: string
          client_name: string
          first_name?: string | null
          id?: string
          insurance_provider?: string | null
          last_name?: string | null
          notes?: string | null
          phone_number?: string | null
          procedure_ordered?: boolean
          procedure_type: string
          status: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          appointment_date?: string
          client_name?: string
          first_name?: string | null
          id?: string
          insurance_provider?: string | null
          last_name?: string | null
          notes?: string | null
          phone_number?: string | null
          procedure_ordered?: boolean
          procedure_type?: string
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      action_items: {
        Row: {
          created_at: string
          created_by: string | null
          department: string
          description: string
          due_date: string
          id: string
          owner: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department: string
          description: string
          due_date: string
          id?: string
          owner: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string
          due_date?: string
          id?: string
          owner?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          confirmed_number: string | null
          created_at: string
          date_appointment_created: string
          date_of_appointment: string | null
          detected_insurance_id: string | null
          detected_insurance_plan: string | null
          detected_insurance_provider: string | null
          dob: string | null
          ghl_appointment_id: string | null
          ghl_id: string | null
          id: string
          insurance_detection_confidence: number | null
          insurance_id_link: string | null
          internal_process_complete: boolean
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
          stage_booked: string | null
          status: string | null
          updated_at: string
          was_ever_confirmed: boolean
        }
        Insert: {
          agent?: string | null
          agent_number?: string | null
          ai_summary?: string | null
          appointment_id?: string | null
          calendar_name?: string | null
          color_indicator?: string | null
          confirmed_number?: string | null
          created_at?: string
          date_appointment_created: string
          date_of_appointment?: string | null
          detected_insurance_id?: string | null
          detected_insurance_plan?: string | null
          detected_insurance_provider?: string | null
          dob?: string | null
          ghl_appointment_id?: string | null
          ghl_id?: string | null
          id?: string
          insurance_detection_confidence?: number | null
          insurance_id_link?: string | null
          internal_process_complete?: boolean
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
          stage_booked?: string | null
          status?: string | null
          updated_at?: string
          was_ever_confirmed?: boolean
        }
        Update: {
          agent?: string | null
          agent_number?: string | null
          ai_summary?: string | null
          appointment_id?: string | null
          calendar_name?: string | null
          color_indicator?: string | null
          confirmed_number?: string | null
          created_at?: string
          date_appointment_created?: string
          date_of_appointment?: string | null
          detected_insurance_id?: string | null
          detected_insurance_plan?: string | null
          detected_insurance_provider?: string | null
          dob?: string | null
          ghl_appointment_id?: string | null
          ghl_id?: string | null
          id?: string
          insurance_detection_confidence?: number | null
          insurance_id_link?: string | null
          internal_process_complete?: boolean
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
          stage_booked?: string | null
          status?: string | null
          updated_at?: string
          was_ever_confirmed?: boolean
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
      core_objectives: {
        Row: {
          created_at: string
          created_by: string | null
          department: string
          description: string
          end_date: string
          id: string
          owner: string
          progress: number
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department: string
          description: string
          end_date: string
          id?: string
          owner: string
          progress?: number
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string
          end_date?: string
          id?: string
          owner?: string
          progress?: number
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cpl_data: {
        Row: {
          amount_spent: number
          business_name: string
          cpl: number
          created_at: string | null
          id: string
          leads_count: number
          procedure_type: string
          updated_at: string | null
          upload_date: string
          uploaded_by: string | null
        }
        Insert: {
          amount_spent: number
          business_name: string
          cpl: number
          created_at?: string | null
          id?: string
          leads_count: number
          procedure_type: string
          updated_at?: string | null
          upload_date?: string
          uploaded_by?: string | null
        }
        Update: {
          amount_spent?: number
          business_name?: string
          cpl?: number
          created_at?: string | null
          id?: string
          leads_count?: number
          procedure_type?: string
          updated_at?: string | null
          upload_date?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      cpl_kpi_summary: {
        Row: {
          created_at: string | null
          id: string
          overall_weighted_avg_cpl: number
          period_end: string
          period_start: string
          period_type: string
          procedure_breakdown: Json
          status: string
          total_leads: number
          total_spent: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          overall_weighted_avg_cpl: number
          period_end: string
          period_start: string
          period_type: string
          procedure_breakdown?: Json
          status: string
          total_leads: number
          total_spent: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          overall_weighted_avg_cpl?: number
          period_end?: string
          period_start?: string
          period_type?: string
          procedure_breakdown?: Json
          status?: string
          total_leads?: number
          total_spent?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      csv_import_batches: {
        Row: {
          created_at: string
          errors: Json | null
          failed_imports: number
          file_name: string
          id: string
          skipped_duplicates: number
          successful_imports: number
          total_rows: number
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          errors?: Json | null
          failed_imports?: number
          file_name: string
          id?: string
          skipped_duplicates?: number
          successful_imports?: number
          total_rows?: number
          uploaded_by: string
        }
        Update: {
          created_at?: string
          errors?: Json | null
          failed_imports?: number
          file_name?: string
          id?: string
          skipped_duplicates?: number
          successful_imports?: number
          total_rows?: number
          uploaded_by?: string
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
      data_retention_policies: {
        Row: {
          conditions: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_executed: string | null
          policy_type: string
          retention_period_days: number
          table_name: string
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_executed?: string | null
          policy_type: string
          retention_period_days: number
          table_name: string
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_executed?: string | null
          policy_type?: string
          retention_period_days?: number
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          annual_amount: number | null
          category_name: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          monthly_amount: number | null
          subcategory: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          annual_amount?: number | null
          category_name: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          monthly_amount?: number | null
          subcategory?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          annual_amount?: number | null
          category_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          monthly_amount?: number | null
          subcategory?: string | null
          updated_at?: string | null
          updated_by?: string | null
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
      ghl_appointments: {
        Row: {
          assigned_user_id: string | null
          calendar_id: string | null
          created_at: string
          end_time: string | null
          ghl_appointment_id: string
          ghl_contact_id: string | null
          ghl_location_id: string
          id: string
          notes: string | null
          start_time: string | null
          status: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          calendar_id?: string | null
          created_at?: string
          end_time?: string | null
          ghl_appointment_id: string
          ghl_contact_id?: string | null
          ghl_location_id: string
          id?: string
          notes?: string | null
          start_time?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          calendar_id?: string | null
          created_at?: string
          end_time?: string | null
          ghl_appointment_id?: string
          ghl_contact_id?: string | null
          ghl_location_id?: string
          id?: string
          notes?: string | null
          start_time?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_appointments_ghl_contact_id_fkey"
            columns: ["ghl_contact_id"]
            isOneToOne: false
            referencedRelation: "ghl_contacts"
            referencedColumns: ["ghl_contact_id"]
          },
          {
            foreignKeyName: "ghl_appointments_ghl_location_id_fkey"
            columns: ["ghl_location_id"]
            isOneToOne: false
            referencedRelation: "ghl_subaccounts"
            referencedColumns: ["ghl_location_id"]
          },
        ]
      }
      ghl_calls: {
        Row: {
          call_date: string | null
          created_at: string
          direction: string | null
          duration: number | null
          from_number: string | null
          ghl_call_id: string
          ghl_contact_id: string | null
          ghl_location_id: string
          ghl_user_id: string | null
          id: string
          recording_url: string | null
          status: string | null
          to_number: string | null
          updated_at: string
        }
        Insert: {
          call_date?: string | null
          created_at?: string
          direction?: string | null
          duration?: number | null
          from_number?: string | null
          ghl_call_id: string
          ghl_contact_id?: string | null
          ghl_location_id: string
          ghl_user_id?: string | null
          id?: string
          recording_url?: string | null
          status?: string | null
          to_number?: string | null
          updated_at?: string
        }
        Update: {
          call_date?: string | null
          created_at?: string
          direction?: string | null
          duration?: number | null
          from_number?: string | null
          ghl_call_id?: string
          ghl_contact_id?: string | null
          ghl_location_id?: string
          ghl_user_id?: string | null
          id?: string
          recording_url?: string | null
          status?: string | null
          to_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_calls_ghl_contact_id_fkey"
            columns: ["ghl_contact_id"]
            isOneToOne: false
            referencedRelation: "ghl_contacts"
            referencedColumns: ["ghl_contact_id"]
          },
          {
            foreignKeyName: "ghl_calls_ghl_location_id_fkey"
            columns: ["ghl_location_id"]
            isOneToOne: false
            referencedRelation: "ghl_subaccounts"
            referencedColumns: ["ghl_location_id"]
          },
          {
            foreignKeyName: "ghl_calls_ghl_user_id_fkey"
            columns: ["ghl_user_id"]
            isOneToOne: false
            referencedRelation: "ghl_users"
            referencedColumns: ["ghl_user_id"]
          },
        ]
      }
      ghl_contacts: {
        Row: {
          created_at: string
          custom_fields: Json | null
          date_added: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          ghl_contact_id: string
          ghl_location_id: string
          id: string
          last_name: string | null
          phone: string | null
          source: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fields?: Json | null
          date_added?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          ghl_contact_id: string
          ghl_location_id: string
          id?: string
          last_name?: string | null
          phone?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fields?: Json | null
          date_added?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          ghl_contact_id?: string
          ghl_location_id?: string
          id?: string
          last_name?: string | null
          phone?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_contacts_ghl_location_id_fkey"
            columns: ["ghl_location_id"]
            isOneToOne: false
            referencedRelation: "ghl_subaccounts"
            referencedColumns: ["ghl_location_id"]
          },
        ]
      }
      ghl_subaccounts: {
        Row: {
          address: string | null
          business_name: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          ghl_location_id: string
          id: string
          last_synced_at: string | null
          phone: string | null
          postal_code: string | null
          project_name: string
          state: string | null
          status: string | null
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          ghl_location_id: string
          id?: string
          last_synced_at?: string | null
          phone?: string | null
          postal_code?: string | null
          project_name: string
          state?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          ghl_location_id?: string
          id?: string
          last_synced_at?: string | null
          phone?: string | null
          postal_code?: string | null
          project_name?: string
          state?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      ghl_sync_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          location_id: string
          location_name: string
          sync_appointments: boolean
          sync_calls: boolean
          sync_contacts: boolean
          sync_users: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          location_id: string
          location_name: string
          sync_appointments?: boolean
          sync_calls?: boolean
          sync_contacts?: boolean
          sync_users?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          location_id?: string
          location_name?: string
          sync_appointments?: boolean
          sync_calls?: boolean
          sync_contacts?: boolean
          sync_users?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ghl_users: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          ghl_location_id: string | null
          ghl_user_id: string
          id: string
          is_active: boolean | null
          last_name: string | null
          permissions: Json | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          ghl_location_id?: string | null
          ghl_user_id: string
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          ghl_location_id?: string | null
          ghl_user_id?: string
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ghl_users_ghl_location_id_fkey"
            columns: ["ghl_location_id"]
            isOneToOne: false
            referencedRelation: "ghl_subaccounts"
            referencedColumns: ["ghl_location_id"]
          },
        ]
      }
      hipaa_audit_log: {
        Row: {
          access_justification: string | null
          action: string
          created_at: string | null
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          patient_identifier: string | null
          phi_accessed: boolean | null
          resource_id: string | null
          resource_type: string
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_justification?: string | null
          action: string
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          patient_identifier?: string | null
          phi_accessed?: boolean | null
          resource_id?: string | null
          resource_type: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_justification?: string | null
          action?: string
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          patient_identifier?: string | null
          phi_accessed?: boolean | null
          resource_id?: string | null
          resource_type?: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      meeting_transcripts: {
        Row: {
          attendees: string[] | null
          created_at: string | null
          id: string
          meeting_date: string
          meeting_name: string
          transcript_text: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          attendees?: string[] | null
          created_at?: string | null
          id?: string
          meeting_date: string
          meeting_name: string
          transcript_text: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          attendees?: string[] | null
          created_at?: string | null
          id?: string
          meeting_date?: string
          meeting_name?: string
          transcript_text?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      new_leads: {
        Row: {
          address: string | null
          ai_summary: string | null
          appt_date: string | null
          calendar_location: string | null
          contact_id: string | null
          created_at: string
          date: string
          dob: string | null
          email: string | null
          first_name: string | null
          group_number: string | null
          id: string
          insurance_id: string | null
          insurance_id_link: string | null
          insurance_plan: string | null
          insurance_provider: string | null
          last_name: string | null
          lead_name: string
          notes: string | null
          parsing_completed_at: string | null
          patient_intake_notes: string | null
          phone_number: string | null
          procedure_ordered: boolean | null
          project_name: string
          status: string | null
          times_called: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          ai_summary?: string | null
          appt_date?: string | null
          calendar_location?: string | null
          contact_id?: string | null
          created_at?: string
          date: string
          dob?: string | null
          email?: string | null
          first_name?: string | null
          group_number?: string | null
          id?: string
          insurance_id?: string | null
          insurance_id_link?: string | null
          insurance_plan?: string | null
          insurance_provider?: string | null
          last_name?: string | null
          lead_name: string
          notes?: string | null
          parsing_completed_at?: string | null
          patient_intake_notes?: string | null
          phone_number?: string | null
          procedure_ordered?: boolean | null
          project_name: string
          status?: string | null
          times_called?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          ai_summary?: string | null
          appt_date?: string | null
          calendar_location?: string | null
          contact_id?: string | null
          created_at?: string
          date?: string
          dob?: string | null
          email?: string | null
          first_name?: string | null
          group_number?: string | null
          id?: string
          insurance_id?: string | null
          insurance_id_link?: string | null
          insurance_plan?: string | null
          insurance_provider?: string | null
          last_name?: string | null
          lead_name?: string
          notes?: string | null
          parsing_completed_at?: string | null
          patient_intake_notes?: string | null
          phone_number?: string | null
          procedure_ordered?: boolean | null
          project_name?: string
          status?: string | null
          times_called?: number
          updated_at?: string
        }
        Relationships: []
      }
      patient_data_access: {
        Row: {
          access_type: string
          created_at: string | null
          data_elements: string[] | null
          duration_seconds: number | null
          id: string
          ip_address: unknown | null
          patient_identifier: string
          project_name: string
          purpose: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          access_type: string
          created_at?: string | null
          data_elements?: string[] | null
          duration_seconds?: number | null
          id?: string
          ip_address?: unknown | null
          patient_identifier: string
          project_name: string
          purpose?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          created_at?: string | null
          data_elements?: string[] | null
          duration_seconds?: number | null
          id?: string
          ip_address?: unknown | null
          patient_identifier?: string
          project_name?: string
          purpose?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payroll_employees: {
        Row: {
          annual_salary: number | null
          commission_rate: number | null
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          department: string
          employment_type: string | null
          full_name: string
          hourly_rate: number | null
          hours_per_week: number | null
          id: string
          is_active: boolean | null
          monthly_salary: number | null
          role_title: string | null
          updated_at: string | null
          updated_by: string | null
          weekly_salary: number | null
        }
        Insert: {
          annual_salary?: number | null
          commission_rate?: number | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department: string
          employment_type?: string | null
          full_name: string
          hourly_rate?: number | null
          hours_per_week?: number | null
          id?: string
          is_active?: boolean | null
          monthly_salary?: number | null
          role_title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          weekly_salary?: number | null
        }
        Update: {
          annual_salary?: number | null
          commission_rate?: number | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string
          employment_type?: string | null
          full_name?: string
          hourly_rate?: number | null
          hours_per_week?: number | null
          id?: string
          is_active?: boolean | null
          monthly_salary?: number | null
          role_title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          weekly_salary?: number | null
        }
        Relationships: []
      }
      positions: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          department: string
          employee: string | null
          four_rs: Json
          id: string
          kpis: Json
          level: string
          reporting_to: string | null
          sops: Json
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          department: string
          employee?: string | null
          four_rs?: Json
          id?: string
          kpis?: Json
          level: string
          reporting_to?: string | null
          sops?: Json
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          department?: string
          employee?: string | null
          four_rs?: Json
          id?: string
          kpis?: Json
          level?: string
          reporting_to?: string | null
          sops?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      potential_hires: {
        Row: {
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          department: string
          employment_type: string | null
          expected_monthly_salary: number | null
          expected_start_date: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          priority: string | null
          role_title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department: string
          employment_type?: string | null
          expected_monthly_salary?: number | null
          expected_start_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          priority?: string | null
          role_title: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string
          employment_type?: string | null
          expected_monthly_salary?: number | null
          expected_start_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          priority?: string | null
          role_title?: string
          updated_at?: string | null
          updated_by?: string | null
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
          project_name?: string
          selected_form_types?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      quarterly_strategy_submissions: {
        Row: {
          accountability: Json | null
          automation_idea: string | null
          automation_pilot: string | null
          bottlenecks: string | null
          breaking_point: string | null
          breaking_points: string | null
          created_at: string
          current_capacity: string | null
          dashboard_kpis: string | null
          department: string
          dependencies: string | null
          documented_sops: string | null
          doubling_breakpoint: string | null
          id: string
          kpi_table: Json | null
          kpi_to_track: string | null
          kpis: string | null
          leader_name: string
          never_lose_book_concept: string | null
          never_lose_implementation: string | null
          nlaca_concept: string | null
          nlaca_implementation: string | null
          staffing_gaps: string | null
          submitted_by: string | null
          tracking_cadence: string | null
          updated_at: string
        }
        Insert: {
          accountability?: Json | null
          automation_idea?: string | null
          automation_pilot?: string | null
          bottlenecks?: string | null
          breaking_point?: string | null
          breaking_points?: string | null
          created_at?: string
          current_capacity?: string | null
          dashboard_kpis?: string | null
          department: string
          dependencies?: string | null
          documented_sops?: string | null
          doubling_breakpoint?: string | null
          id?: string
          kpi_table?: Json | null
          kpi_to_track?: string | null
          kpis?: string | null
          leader_name: string
          never_lose_book_concept?: string | null
          never_lose_implementation?: string | null
          nlaca_concept?: string | null
          nlaca_implementation?: string | null
          staffing_gaps?: string | null
          submitted_by?: string | null
          tracking_cadence?: string | null
          updated_at?: string
        }
        Update: {
          accountability?: Json | null
          automation_idea?: string | null
          automation_pilot?: string | null
          bottlenecks?: string | null
          breaking_point?: string | null
          breaking_points?: string | null
          created_at?: string
          current_capacity?: string | null
          dashboard_kpis?: string | null
          department?: string
          dependencies?: string | null
          documented_sops?: string | null
          doubling_breakpoint?: string | null
          id?: string
          kpi_table?: Json | null
          kpi_to_track?: string | null
          kpis?: string | null
          leader_name?: string
          never_lose_book_concept?: string | null
          never_lose_implementation?: string | null
          nlaca_concept?: string | null
          nlaca_implementation?: string | null
          staffing_gaps?: string | null
          submitted_by?: string | null
          tracking_cadence?: string | null
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
      resources: {
        Row: {
          access_count: number
          created_at: string
          created_by: string | null
          department: string
          description: string
          embed_id: string | null
          id: string
          status: string
          tags: Json
          title: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          access_count?: number
          created_at?: string
          created_by?: string | null
          department: string
          description: string
          embed_id?: string | null
          id?: string
          status?: string
          tags?: Json
          title: string
          type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          access_count?: number
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string
          embed_id?: string | null
          id?: string
          status?: string
          tags?: Json
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      revenue_projections: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_direct_total: boolean | null
          per_unit: number | null
          quantity: number | null
          total_projected: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_direct_total?: boolean | null
          per_unit?: number | null
          quantity?: number | null
          total_projected?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_direct_total?: boolean | null
          per_unit?: number | null
          quantity?: number | null
          total_projected?: number | null
          updated_at?: string | null
          updated_by?: string | null
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
      stripe_invoices: {
        Row: {
          amount_due: number
          amount_paid: number
          created_at: string | null
          currency: string
          customer_email: string | null
          id: string
          invoice_date: string | null
          metadata: Json | null
          paid_at: string | null
          status: string
          stripe_customer_id: string
          stripe_invoice_id: string
          stripe_subscription_id: string | null
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          id?: string
          invoice_date?: string | null
          metadata?: Json | null
          paid_at?: string | null
          status: string
          stripe_customer_id: string
          stripe_invoice_id: string
          stripe_subscription_id?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          id?: string
          invoice_date?: string | null
          metadata?: Json | null
          paid_at?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_invoice_id?: string
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      stripe_revenue_summary: {
        Row: {
          active_subscriptions: number
          arr: number
          churned_subscriptions: number
          created_at: string | null
          id: string
          mrr: number
          new_subscriptions: number
          period_end: string
          period_start: string
          period_type: string
          total_revenue: number
          updated_at: string | null
        }
        Insert: {
          active_subscriptions?: number
          arr?: number
          churned_subscriptions?: number
          created_at?: string | null
          id?: string
          mrr?: number
          new_subscriptions?: number
          period_end: string
          period_start: string
          period_type: string
          total_revenue?: number
          updated_at?: string | null
        }
        Update: {
          active_subscriptions?: number
          arr?: number
          churned_subscriptions?: number
          created_at?: string | null
          id?: string
          mrr?: number
          new_subscriptions?: number
          period_end?: string
          period_start?: string
          period_type?: string
          total_revenue?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_subscriptions: {
        Row: {
          amount: number
          billing_interval: string
          cancel_at: string | null
          canceled_at: string | null
          created_at: string | null
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          customer_email: string | null
          customer_name: string | null
          id: string
          metadata: Json | null
          plan_name: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          billing_interval: string
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          metadata?: Json | null
          plan_name: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          billing_interval?: string
          cancel_at?: string | null
          canceled_at?: string | null
          created_at?: string | null
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          metadata?: Json | null
          plan_name?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          category: string
          checklist_items: Json | null
          created_at: string
          created_by: string | null
          default_collaborators: Json | null
          default_priority: string
          department: string
          description: string
          estimated_days: number | null
          id: string
          is_active: boolean | null
          name: string
          resources: Json | null
          updated_at: string
        }
        Insert: {
          category: string
          checklist_items?: Json | null
          created_at?: string
          created_by?: string | null
          default_collaborators?: Json | null
          default_priority?: string
          department: string
          description: string
          estimated_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          resources?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string
          checklist_items?: Json | null
          created_at?: string
          created_by?: string | null
          default_collaborators?: Json | null
          default_priority?: string
          department?: string
          description?: string
          estimated_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          resources?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          attachments: Json | null
          blocked_by: string[] | null
          category: string
          collaborators: Json
          comments: Json | null
          created_at: string
          created_by: string | null
          deadline: string
          department: string
          description: string
          details: string | null
          id: string
          notes: Json
          priority: string
          progress: number
          resources: Json | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          blocked_by?: string[] | null
          category: string
          collaborators?: Json
          comments?: Json | null
          created_at?: string
          created_by?: string | null
          deadline: string
          department: string
          description: string
          details?: string | null
          id?: string
          notes?: Json
          priority?: string
          progress?: number
          resources?: Json | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          blocked_by?: string[] | null
          category?: string
          collaborators?: Json
          comments?: Json | null
          created_at?: string
          created_by?: string | null
          deadline?: string
          department?: string
          description?: string
          details?: string | null
          id?: string
          notes?: Json
          priority?: string
          progress?: number
          resources?: Json | null
          status?: string
          title?: string
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
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          terminated_reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          terminated_reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          terminated_reason?: string | null
          user_agent?: string | null
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
          notes_synced: boolean
          project_name: string
        }[]
      }
      calculate_cpl_summary: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_period_type: string
        }
        Returns: string
      }
      check_rate_limit_enhanced: {
        Args: {
          action_type_param: string
          identifier_param: string
          max_attempts_param?: number
          window_minutes_param?: number
        }
        Returns: boolean
      }
      check_rate_limit_v2: {
        Args: {
          endpoint_param: string
          identifier_param: string
          max_requests_param?: number
          window_minutes_param?: number
        }
        Returns: boolean
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_security_tables: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      debug_password_verification: {
        Args: { password_param: string; project_name_param: string }
        Returns: {
          debug_info: Json
          has_password: boolean
          password_hash: string
          project_found: boolean
          verification_result: boolean
        }[]
      }
      get_account_manager_kpis: {
        Args: {
          p_client_name?: string
          p_end_date?: string
          p_procedure_type?: string
          p_start_date?: string
          p_user_id?: string
        }
        Returns: {
          by_client: Json
          by_procedure_type: Json
          cancelled_appointments: number
          conversion_rate: number
          no_show_appointments: number
          procedures_ordered: number
          show_rate: number
          showed_appointments: number
          total_appointments: number
        }[]
      }
      get_appointment_lead_association: {
        Args: {
          appointment_email?: string
          appointment_ghl_id?: string
          appointment_lead_name?: string
          appointment_phone?: string
          appointment_project_name?: string
        }
        Returns: {
          contact_id: string
          email: string
          group_number: string
          insurance_id: string
          insurance_id_link: string
          insurance_plan: string
          insurance_provider: string
          lead_id: string
          lead_name: string
          match_strategy: string
          patient_intake_notes: string
          phone_number: string
          project_name: string
        }[]
      }
      get_client_health_metrics: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          conversion_rate: number
          cost_per_appointment: number
          cost_per_procedure: number
          procedure_appointments: number
          procedure_breakdown: Json
          proj_name: string
          show_rate: number
          showed_appointments: number
          total_ad_spend: number
          total_appointments: number
        }[]
      }
      get_dashboard_data: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_project_name?: string
        }
        Returns: {
          ad_spend_total: number
          appointments_count: number
          calls_count: number
          leads_count: number
        }[]
      }
      get_project_stats: {
        Args: { project_filter?: string }
        Returns: {
          ad_spend: number
          appointments_count: number
          calls_count: number
          confirmed_appointments_count: number
          last_activity: string
          leads_count: number
          project_name: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_project_access: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_password: {
        Args: { password: string }
        Returns: string
      }
      log_hipaa_audit: {
        Args: {
          p_action?: string
          p_event_type: string
          p_metadata?: Json
          p_patient_identifier?: string
          p_phi_accessed?: boolean
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: string
      }
      log_patient_access: {
        Args: {
          p_access_type: string
          p_data_elements?: string[]
          p_patient_identifier: string
          p_project_name: string
          p_purpose?: string
        }
        Returns: string
      }
      log_security_event: {
        Args: {
          details_param?: Json
          event_type_param: string
          ip_address_param?: unknown
          user_agent_param?: string
        }
        Returns: undefined
      }
      log_security_event_critical: {
        Args: {
          details_param?: Json
          event_type_param: string
          ip_address_param?: unknown
          severity_param?: string
          user_agent_param?: string
        }
        Returns: undefined
      }
      log_security_event_enhanced: {
        Args: {
          details_param?: Json
          event_type_param: string
          ip_address_param?: unknown
          severity_param?: string
          user_agent_param?: string
        }
        Returns: undefined
      }
      log_security_event_v2: {
        Args: {
          details_param?: Json
          endpoint_param?: string
          event_type_param: string
          ip_address_param?: unknown
          session_id_param?: string
          severity_param?: string
          user_agent_param?: string
          user_id_param?: string
        }
        Returns: string
      }
      refresh_performance_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_lead_data_to_appointments: {
        Args: { batch_size?: number }
        Returns: {
          total_updated: number
        }[]
      }
      validate_project_access: {
        Args: { project_name_param: string }
        Returns: boolean
      }
      validate_security_policies: {
        Args: Record<PropertyKey, never>
        Returns: {
          authenticated_access_count: number
          has_rls: boolean
          public_access_count: number
          security_status: string
          table_name: string
        }[]
      }
      verify_password: {
        Args: { hash: string; password: string }
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
