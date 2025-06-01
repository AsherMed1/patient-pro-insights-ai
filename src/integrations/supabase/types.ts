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
      campaigns: {
        Row: {
          ad_spend: number | null
          additional_fields: Json | null
          appointments: number | null
          campaign_date: string | null
          client_id: string
          cpa: number | null
          cpl: number | null
          cpp: number | null
          created_at: string
          id: string
          leads: number | null
          procedures: number | null
          raw_data: Json | null
          show_rate: number | null
          source_row: number | null
          source_sheet: string | null
          updated_at: string
        }
        Insert: {
          ad_spend?: number | null
          additional_fields?: Json | null
          appointments?: number | null
          campaign_date?: string | null
          client_id: string
          cpa?: number | null
          cpl?: number | null
          cpp?: number | null
          created_at?: string
          id?: string
          leads?: number | null
          procedures?: number | null
          raw_data?: Json | null
          show_rate?: number | null
          source_row?: number | null
          source_sheet?: string | null
          updated_at?: string
        }
        Update: {
          ad_spend?: number | null
          additional_fields?: Json | null
          appointments?: number | null
          campaign_date?: string | null
          client_id?: string
          cpa?: number | null
          cpl?: number | null
          cpp?: number | null
          created_at?: string
          id?: string
          leads?: number | null
          procedures?: number | null
          raw_data?: Json | null
          show_rate?: number | null
          source_row?: number | null
          source_sheet?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
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
          spreadsheet_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          spreadsheet_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          spreadsheet_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      new_leads: {
        Row: {
          created_at: string
          date: string
          id: string
          lead_name: string
          project_name: string
          times_called: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          lead_name: string
          project_name: string
          times_called?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          lead_name?: string
          project_name?: string
          times_called?: number
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
      sync_logs: {
        Row: {
          client_id: string | null
          completed_at: string | null
          error_message: string | null
          id: string
          records_processed: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_processed?: number | null
          started_at?: string
          status: string
          sync_type: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_processed?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
