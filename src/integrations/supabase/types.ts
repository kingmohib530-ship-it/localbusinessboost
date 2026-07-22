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
      activity_log: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          summary: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          summary: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          summary?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      anon_rate_limits: {
        Row: {
          ip_address: string
          request_count: number
          route: string
          window_start: string
        }
        Insert: {
          ip_address: string
          request_count?: number
          route: string
          window_start: string
        }
        Update: {
          ip_address?: string
          request_count?: number
          route?: string
          window_start?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          estimated_value: number | null
          id: string
          notes: string | null
          scheduled_at: string
          service_type: string
          source: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          estimated_value?: number | null
          id?: string
          notes?: string | null
          scheduled_at: string
          service_type: string
          source?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          estimated_value?: number | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          service_type?: string
          source?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_leads: {
        Row: {
          business_name: string | null
          city: string | null
          created_at: string
          email: string
          id: string
          industry: string | null
          overall_score: number | null
          revenue_opportunity: string | null
          website_url: string | null
        }
        Insert: {
          business_name?: string | null
          city?: string | null
          created_at?: string
          email: string
          id?: string
          industry?: string | null
          overall_score?: number | null
          revenue_opportunity?: string | null
          website_url?: string | null
        }
        Update: {
          business_name?: string | null
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          industry?: string | null
          overall_score?: number | null
          revenue_opportunity?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      businesses: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          industry: string | null
          name: string
          owner_id: string | null
          phone: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          website?: string | null
        }
        Relationships: []
      }
      chatbot_settings: {
        Row: {
          booking_link: string | null
          business_id: string | null
          created_at: string | null
          faq: string | null
          id: string
          offers: string | null
          pricing: string | null
          services: string | null
          welcome_message: string | null
        }
        Insert: {
          booking_link?: string | null
          business_id?: string | null
          created_at?: string | null
          faq?: string | null
          id?: string
          offers?: string | null
          pricing?: string | null
          services?: string | null
          welcome_message?: string | null
        }
        Update: {
          booking_link?: string | null
          business_id?: string | null
          created_at?: string | null
          faq?: string | null
          id?: string
          offers?: string | null
          pricing?: string | null
          services?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          business_name: string | null
          created_at: string
          email: string | null
          id: string
          message: string | null
          name: string
          phone: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      conversation_intelligence: {
        Row: {
          ai_confidence_score: number | null
          business_id: string | null
          consumer_phone: string | null
          created_at: string | null
          id: string
          location_zip: string | null
          outcome: string | null
          price_mentioned: number | null
          service_type: string | null
          source_channel: string | null
          time_to_book_minutes: number | null
          urgency_level: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          business_id?: string | null
          consumer_phone?: string | null
          created_at?: string | null
          id?: string
          location_zip?: string | null
          outcome?: string | null
          price_mentioned?: number | null
          service_type?: string | null
          source_channel?: string | null
          time_to_book_minutes?: number | null
          urgency_level?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          business_id?: string | null
          consumer_phone?: string | null
          created_at?: string | null
          id?: string
          location_zip?: string | null
          outcome?: string | null
          price_mentioned?: number | null
          service_type?: string | null
          source_channel?: string | null
          time_to_book_minutes?: number | null
          urgency_level?: string | null
        }
        Relationships: []
      }
      lead_profiles: {
        Row: {
          address: string | null
          ai_research_summary: string | null
          annual_revenue_estimate: string | null
          business_name: string
          city: string | null
          company_size: string | null
          created_at: string | null
          data_source: string | null
          email: string | null
          google_rating: number | null
          google_review_count: number | null
          has_google_business: boolean | null
          has_website: boolean | null
          id: string
          industry: string | null
          last_google_post: string | null
          lead_score: number | null
          monday_item_id: string | null
          notes: string | null
          outreach_history: Json | null
          owner_name: string | null
          pain_signals: Json | null
          personalized_opening_line: string | null
          phone: string | null
          phone_verified: boolean | null
          priority: string | null
          social_media: Json | null
          state: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          website_quality: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          ai_research_summary?: string | null
          annual_revenue_estimate?: string | null
          business_name: string
          city?: string | null
          company_size?: string | null
          created_at?: string | null
          data_source?: string | null
          email?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          has_google_business?: boolean | null
          has_website?: boolean | null
          id?: string
          industry?: string | null
          last_google_post?: string | null
          lead_score?: number | null
          monday_item_id?: string | null
          notes?: string | null
          outreach_history?: Json | null
          owner_name?: string | null
          pain_signals?: Json | null
          personalized_opening_line?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          priority?: string | null
          social_media?: Json | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
          website_quality?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          ai_research_summary?: string | null
          annual_revenue_estimate?: string | null
          business_name?: string
          city?: string | null
          company_size?: string | null
          created_at?: string | null
          data_source?: string | null
          email?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          has_google_business?: boolean | null
          has_website?: boolean | null
          id?: string
          industry?: string | null
          last_google_post?: string | null
          lead_score?: number | null
          monday_item_id?: string | null
          notes?: string | null
          outreach_history?: Json | null
          owner_name?: string | null
          pain_signals?: Json | null
          personalized_opening_line?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          priority?: string | null
          social_media?: Json | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          website_quality?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      lead_sequences: {
        Row: {
          channel: string
          delay_hours: number
          id: string
          lead_id: string | null
          message_template: string
          sent_at: string | null
          status: string | null
          step_number: number
        }
        Insert: {
          channel: string
          delay_hours: number
          id?: string
          lead_id?: string | null
          message_template: string
          sent_at?: string | null
          status?: string | null
          step_number: number
        }
        Update: {
          channel?: string
          delay_hours?: number
          id?: string
          lead_id?: string | null
          message_template?: string
          sent_at?: string | null
          status?: string | null
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_sequences_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          business_id: string | null
          created_at: string | null
          email: string | null
          id: string
          message: string | null
          name: string | null
          phone: string | null
          source: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      market_pricing_index: {
        Row: {
          avg_price: number | null
          demand_score: number | null
          id: string
          last_updated: string | null
          price_range_high: number | null
          price_range_low: number | null
          seasonal_multiplier: number | null
          service_type: string
          supply_score: number | null
          zip_code: string
        }
        Insert: {
          avg_price?: number | null
          demand_score?: number | null
          id?: string
          last_updated?: string | null
          price_range_high?: number | null
          price_range_low?: number | null
          seasonal_multiplier?: number | null
          service_type: string
          supply_score?: number | null
          zip_code: string
        }
        Update: {
          avg_price?: number | null
          demand_score?: number | null
          id?: string
          last_updated?: string | null
          price_range_high?: number | null
          price_range_low?: number | null
          seasonal_multiplier?: number | null
          service_type?: string
          supply_score?: number | null
          zip_code?: string
        }
        Relationships: []
      }
      missed_calls: {
        Row: {
          called_at: string | null
          caller_name: string | null
          caller_phone: string
          created_at: string | null
          id: string
          notes: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          called_at?: string | null
          caller_name?: string | null
          caller_phone: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          called_at?: string | null
          caller_name?: string | null
          caller_phone?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accept_consumer_leads: boolean
          booking_completion_rate: number | null
          business_hours: string | null
          business_name: string | null
          city: string | null
          consumer_rating_avg: number | null
          created_at: string | null
          escalation_rules: string | null
          full_name: string | null
          greeting_message: string | null
          id: string
          industry: string | null
          is_admin: boolean
          lanavix_score: number
          onboarding_completed: boolean | null
          response_speed_avg_minutes: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_period_end: string | null
          subscription_status: string | null
          subscription_tier: string | null
          twilio_phone_number: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          accept_consumer_leads?: boolean
          booking_completion_rate?: number | null
          business_hours?: string | null
          business_name?: string | null
          city?: string | null
          consumer_rating_avg?: number | null
          created_at?: string | null
          escalation_rules?: string | null
          full_name?: string | null
          greeting_message?: string | null
          id: string
          industry?: string | null
          is_admin?: boolean
          lanavix_score?: number
          onboarding_completed?: boolean | null
          response_speed_avg_minutes?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          twilio_phone_number?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          accept_consumer_leads?: boolean
          booking_completion_rate?: number | null
          business_hours?: string | null
          business_name?: string | null
          city?: string | null
          consumer_rating_avg?: number | null
          created_at?: string | null
          escalation_rules?: string | null
          full_name?: string | null
          greeting_message?: string | null
          id?: string
          industry?: string | null
          is_admin?: boolean
          lanavix_score?: number
          onboarding_completed?: boolean | null
          response_speed_avg_minutes?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_period_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          twilio_phone_number?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          request_count: number
          route: string
          user_id: string
          window_start: string
        }
        Insert: {
          request_count?: number
          route: string
          user_id: string
          window_start: string
        }
        Update: {
          request_count?: number
          route?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      review_requests: {
        Row: {
          customer_name: string | null
          customer_phone: string
          google_review_url: string | null
          id: string
          job_description: string | null
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          customer_name?: string | null
          customer_phone: string
          google_review_url?: string | null
          id?: string
          job_description?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          customer_name?: string | null
          customer_phone?: string
          google_review_url?: string | null
          id?: string
          job_description?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      review_responses: {
        Row: {
          ai_response: string | null
          created_at: string | null
          id: string
          review_text: string
          reviewer_name: string | null
          star_rating: number | null
          user_id: string | null
        }
        Insert: {
          ai_response?: string | null
          created_at?: string | null
          id?: string
          review_text: string
          reviewer_name?: string | null
          star_rating?: number | null
          user_id?: string | null
        }
        Update: {
          ai_response?: string | null
          created_at?: string | null
          id?: string
          review_text?: string
          reviewer_name?: string | null
          star_rating?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      sms_conversations: {
        Row: {
          appointment_id: string | null
          caller_phone: string
          direction: string
          id: string
          message: string
          missed_call_id: string | null
          sent_at: string | null
          user_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          caller_phone: string
          direction: string
          id?: string
          message: string
          missed_call_id?: string | null
          sent_at?: string | null
          user_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          caller_phone?: string
          direction?: string
          id?: string
          message?: string
          missed_call_id?: string | null
          sent_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_conversations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_conversations_missed_call_id_fkey"
            columns: ["missed_call_id"]
            isOneToOne: false
            referencedRelation: "missed_calls"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_anon_rate_limit: {
        Args: {
          p_ip_address: string
          p_max_requests: number
          p_route: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_max_requests: number
          p_route: string
          p_user_id: string
          p_window_seconds: number
        }
        Returns: boolean
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
  public: {
    Enums: {},
  },
} as const
