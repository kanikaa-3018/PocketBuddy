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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      campus_food_options: {
        Row: {
          available_from: string
          available_until: string
          campus: string
          id: string
          is_active: boolean
          item_name: string
          price: number
          venue_name: string
        }
        Insert: {
          available_from: string
          available_until: string
          campus?: string
          id?: string
          is_active?: boolean
          item_name: string
          price: number
          venue_name: string
        }
        Update: {
          available_from?: string
          available_until?: string
          campus?: string
          id?: string
          is_active?: boolean
          item_name?: string
          price?: number
          venue_name?: string
        }
        Relationships: []
      }
      cart_pool_items: {
        Row: {
          added_by_name: string
          created_at: string
          estimated_price: number
          id: string
          item_description: string
          pool_id: string
        }
        Insert: {
          added_by_name: string
          created_at?: string
          estimated_price: number
          id?: string
          item_description: string
          pool_id: string
        }
        Update: {
          added_by_name?: string
          created_at?: string
          estimated_price?: number
          id?: string
          item_description?: string
          pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_pool_items_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "cart_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_pools: {
        Row: {
          created_at: string
          created_by: string
          created_by_name: string
          delivery_fee: number
          expires_at: string
          id: string
          min_cart_value: number
          platform: string
          status: string
          wing_label: string
        }
        Insert: {
          created_at?: string
          created_by: string
          created_by_name?: string
          delivery_fee: number
          expires_at: string
          id?: string
          min_cart_value: number
          platform: string
          status?: string
          wing_label: string
        }
        Update: {
          created_at?: string
          created_by?: string
          created_by_name?: string
          delivery_fee?: number
          expires_at?: string
          id?: string
          min_cart_value?: number
          platform?: string
          status?: string
          wing_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_pools_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_logs: {
        Row: {
          created_at: string
          food_gap_hours: number
          id: string
          response: string
          stress_note: string | null
          suggestion_given: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          food_gap_hours: number
          id?: string
          response: string
          stress_note?: string | null
          suggestion_given?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          food_gap_hours?: number
          id?: string
          response?: string
          stress_note?: string | null
          suggestion_given?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_sync_log: {
        Row: {
          created_at: string
          device_name: string
          id: string
          notification_source: string
          parsed_amount: number | null
          parsed_merchant: string | null
          processing_status: string
          raw_body: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name: string
          id?: string
          notification_source: string
          parsed_amount?: number | null
          parsed_merchant?: string | null
          processing_status?: string
          raw_body: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string
          id?: string
          notification_source?: string
          parsed_amount?: number | null
          parsed_merchant?: string | null
          processing_status?: string
          raw_body?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_sync_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_directory: {
        Row: {
          campus: string
          category: string
          confirmation_count: number
          created_at: string
          display_name: string
          id: string
          mapped_by_user_id: string | null
          raw_string: string
        }
        Insert: {
          campus?: string
          category: string
          confirmation_count?: number
          created_at?: string
          display_name: string
          id?: string
          mapped_by_user_id?: string | null
          raw_string: string
        }
        Update: {
          campus?: string
          category?: string
          confirmation_count?: number
          created_at?: string
          display_name?: string
          id?: string
          mapped_by_user_id?: string | null
          raw_string?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_directory_mapped_by_user_id_fkey"
            columns: ["mapped_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          college_name: string
          companion_device_name: string | null
          companion_last_sync: string | null
          companion_paired: boolean
          created_at: string
          cycle_start_day: number
          exam_end_date: string | null
          exam_start_date: string | null
          full_name: string
          hostel_block: string
          id: string
          meal_schedule: Json | null
          mess_enrolled: boolean
          monthly_allowance: number
          onboarding_completed: boolean
          pairing_code: string | null
          phone_number: string | null
          room_number: string
          upi_apps_used: string[]
          wing_label: string
        }
        Insert: {
          college_name?: string
          companion_device_name?: string | null
          companion_last_sync?: string | null
          companion_paired?: boolean
          created_at?: string
          cycle_start_day?: number
          exam_end_date?: string | null
          exam_start_date?: string | null
          full_name?: string
          hostel_block?: string
          id: string
          meal_schedule?: Json | null
          mess_enrolled?: boolean
          monthly_allowance?: number
          onboarding_completed?: boolean
          pairing_code?: string | null
          phone_number?: string | null
          room_number?: string
          upi_apps_used?: string[]
          wing_label?: string
        }
        Update: {
          college_name?: string
          companion_device_name?: string | null
          companion_last_sync?: string | null
          companion_paired?: boolean
          created_at?: string
          cycle_start_day?: number
          exam_end_date?: string | null
          exam_start_date?: string | null
          full_name?: string
          hostel_block?: string
          id?: string
          meal_schedule?: Json | null
          mess_enrolled?: boolean
          monthly_allowance?: number
          onboarding_completed?: boolean
          pairing_code?: string | null
          phone_number?: string | null
          room_number?: string
          upi_apps_used?: string[]
          wing_label?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          detected_from: string
          id: string
          is_active: boolean
          next_debit_date: string
          service_name: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          detected_from?: string
          id?: string
          is_active?: boolean
          next_debit_date: string
          service_name: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          detected_from?: string
          id?: string
          is_active?: boolean
          next_debit_date?: string
          service_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          id: string
          is_mapped: boolean
          mapped_merchant_name: string | null
          raw_merchant_string: string
          raw_notification_body: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          id?: string
          is_mapped?: boolean
          mapped_merchant_name?: string | null
          raw_merchant_string: string
          raw_notification_body?: string | null
          source?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          is_mapped?: boolean
          mapped_merchant_name?: string | null
          raw_merchant_string?: string
          raw_notification_body?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
