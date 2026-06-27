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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_rate_limits: {
        Row: {
          count: number
          day: string
          endpoint: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          day?: string
          endpoint: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          endpoint?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          calories: number
          carbs: number
          confidence: string | null
          description: string
          fat: number
          feedback: string | null
          flagged_at: string | null
          id: string
          image_url: string
          items: Json
          logged_at: string
          notes: string | null
          protein: number
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          confidence?: string | null
          description?: string
          fat?: number
          feedback?: string | null
          flagged_at?: string | null
          id?: string
          image_url: string
          items?: Json
          logged_at?: string
          notes?: string | null
          protein?: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          confidence?: string | null
          description?: string
          fat?: number
          feedback?: string | null
          flagged_at?: string | null
          id?: string
          image_url?: string
          items?: Json
          logged_at?: string
          notes?: string | null
          protein?: number
          user_id?: string
        }
        Relationships: []
      }
      product_scans: {
        Row: {
          alternatives: Json
          harmful_items: Json
          id: string
          label_image_url: string
          nutrition_summary: Json
          product_image_url: string
          product_name: string
          safe_items: Json
          scanned_at: string
          summary: string
          user_id: string
          verdict: string
          verdict_reason: string | null
          verdict_score: number
        }
        Insert: {
          alternatives?: Json
          harmful_items?: Json
          id?: string
          label_image_url: string
          nutrition_summary?: Json
          product_image_url: string
          product_name?: string
          safe_items?: Json
          scanned_at?: string
          summary?: string
          user_id: string
          verdict: string
          verdict_reason?: string | null
          verdict_score?: number
        }
        Update: {
          alternatives?: Json
          harmful_items?: Json
          id?: string
          label_image_url?: string
          nutrition_summary?: Json
          product_image_url?: string
          product_name?: string
          safe_items?: Json
          scanned_at?: string
          summary?: string
          user_id?: string
          verdict?: string
          verdict_reason?: string | null
          verdict_score?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          avatar_gender: string | null
          avatar_skin: string | null
          created_at: string
          current_weight_kg: number | null
          email: string | null
          height_cm: number | null
          id: string
          sex: string | null
          target_calories: number
          target_carbs: number
          target_fat: number
          target_protein: number
          target_weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          avatar_gender?: string | null
          avatar_skin?: string | null
          created_at?: string
          current_weight_kg?: number | null
          email?: string | null
          height_cm?: number | null
          id: string
          sex?: string | null
          target_calories?: number
          target_carbs?: number
          target_fat?: number
          target_protein?: number
          target_weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          avatar_gender?: string | null
          avatar_skin?: string | null
          created_at?: string
          current_weight_kg?: number | null
          email?: string | null
          height_cm?: number | null
          id?: string
          sex?: string | null
          target_calories?: number
          target_carbs?: number
          target_fat?: number
          target_protein?: number
          target_weight_kg?: number | null
        }
        Relationships: []
      }
      saved_alternatives: {
        Row: {
          brand: string
          created_at: string
          id: string
          key_benefit: string
          name: string
          reason: string
          source_scan_id: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          brand?: string
          created_at?: string
          id?: string
          key_benefit?: string
          name: string
          reason?: string
          source_scan_id?: string | null
          source_type?: string
          user_id: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          key_benefit?: string
          name?: string
          reason?: string
          source_scan_id?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_ai_rate_limit: {
        Args: { _day: string; _endpoint: string; _user_id: string }
        Returns: number
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
