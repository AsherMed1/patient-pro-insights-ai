export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          calendar_name: string | null
          color_indicator: string | null
          confirmed: boolean | null
          confirmed_number: string | null
          created_at: string
          date_appointment_created: string
          date_of_appointment: string | null
          ghl_id: string | null
          id: string
          lead_email: string | null
          lead_name: string
          lead_phone_number: string | null
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
          calendar_name?: string | null
          color_indicator?: string | null
          confirmed?: boolean | null
          confirmed_number?: string | null
          created_at?: string
          date_appointment_created: string
          date_of_appointment?: string | null
          ghl_id?: string | null
          id?: string
          lead_email?: string | null
          lead_name: string
          lead_phone_number?: string | null
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
          calendar_name?: string | null
          color_indicator?: string | null
          confirmed?: boolean | null
          confirmed_number?: string | null
          created_at?: string
          date_appointment_created?: string
          date_of_appointment?: string | null
          ghl_id?: string | null
          id?: string
          lead_email?: string | null
          lead_name?: string
          lead_phone_number?: string | null
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
          appt_date: string | null
          calendar_location: string | null
          card_image: string | null
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
          appt_date?: string | null
          calendar_location?: string | null
          card_image?: string | null
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
          appt_date?: string | null
          calendar_location?: string | null
          card_image?: string | null
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
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
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
      project_permissions: {
        Row: {
          created_at: string
          id: string
          permission_level: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_level: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_level?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_permissions_project_id_fkey"
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
          id?: string
          portal_password?: string | null
          project_name?: string
          selected_form_types?: string[] | null
          updated_at?: string
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
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_project_permission: {
        Args: { _user_id: string; _project_id: string; _permission: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "viewer"],
    },
  },
} as const
