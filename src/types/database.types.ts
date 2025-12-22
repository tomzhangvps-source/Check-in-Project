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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      action_types: {
        Row: {
          action_role: number
          button_color: string
          button_text: string
          created_at: string | null
          display_order: number | null
          id: number
          is_active: boolean | null
          name: string
          pair_action_id: number | null
          requires_pair: boolean | null
        }
        Insert: {
          action_role: number
          button_color: string
          button_text: string
          created_at?: string | null
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          name: string
          pair_action_id?: number | null
          requires_pair?: boolean | null
        }
        Update: {
          action_role?: number
          button_color?: string
          button_text?: string
          created_at?: string | null
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          name?: string
          pair_action_id?: number | null
          requires_pair?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "action_types_pair_action_id_fkey"
            columns: ["pair_action_id"]
            isOneToOne: false
            referencedRelation: "action_types"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          action_type_id: number | null
          check_time: string | null
          created_at: string | null
          duration_minutes: number | null
          id: number
          is_late: boolean | null
          note: string | null
          pair_check_in_id: number | null
          status: string | null
          user_id: number | null
        }
        Insert: {
          action_type_id?: number | null
          check_time?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: number
          is_late?: boolean | null
          note?: string | null
          pair_check_in_id?: number | null
          status?: string | null
          user_id?: number | null
        }
        Update: {
          action_type_id?: number | null
          check_time?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: number
          is_late?: boolean | null
          note?: string | null
          pair_check_in_id?: number | null
          status?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_action_type_id_fkey"
            columns: ["action_type_id"]
            isOneToOne: false
            referencedRelation: "action_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_pair_check_in_id_fkey"
            columns: ["pair_check_in_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          config_desc: string | null
          config_key: string
          config_value: string
          created_at: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          config_desc?: string | null
          config_key: string
          config_value: string
          created_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          config_desc?: string | null
          config_key?: string
          config_value?: string
          created_at?: string | null
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      time_rules: {
        Row: {
          action_type_id: number | null
          allow_early_minutes: number | null
          allow_late_minutes: number | null
          created_at: string | null
          expected_time: string | null
          id: number
          is_active: boolean | null
          max_duration_minutes: number | null
          rule_name: string
          timezone: string | null
          warning_minutes: number | null
        }
        Insert: {
          action_type_id?: number | null
          allow_early_minutes?: number | null
          allow_late_minutes?: number | null
          created_at?: string | null
          expected_time?: string | null
          id?: number
          is_active?: boolean | null
          max_duration_minutes?: number | null
          rule_name: string
          timezone?: string | null
          warning_minutes?: number | null
        }
        Update: {
          action_type_id?: number | null
          allow_early_minutes?: number | null
          allow_late_minutes?: number | null
          created_at?: string | null
          expected_time?: string | null
          id?: number
          is_active?: boolean | null
          max_duration_minutes?: number | null
          rule_name?: string
          timezone?: string | null
          warning_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_rules_action_type_id_fkey"
            columns: ["action_type_id"]
            isOneToOne: false
            referencedRelation: "action_types"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          full_name: string
          id: number
          is_admin: boolean | null
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: number
          is_admin?: boolean | null
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: number
          is_admin?: boolean | null
          password_hash?: string
          username?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
