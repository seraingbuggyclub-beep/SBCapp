export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sbc_club_config: {
        Row: {
          id: number
          lock_code: string
          geofence_lat: number
          geofence_lng: number
          geofence_radius_meters: number
          updated_at: string | null
        }
        Insert: {
          id?: never
          lock_code: string
          geofence_lat?: number
          geofence_lng?: number
          geofence_radius_meters?: number
          updated_at?: string | null
        }
        Update: {
          id?: never
          lock_code?: string
          geofence_lat?: number
          geofence_lng?: number
          geofence_radius_meters?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      sbc_members: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone: string | null
          license_number: string | null
          payment_status: string
          street_number: string | null
          zip_code: string | null
          city: string | null
          birth_date: string | null
          membership_choice: string | null
          transponder_number: string | null
          roi_accepted: boolean | null
          insurance_ack: boolean | null
          fba_license_number?: string | null
          fba_synced_at?: string | null
          referent_contract_signed_at?: string | null
          referent_contract_ip?: string | null
          referent_contract_version?: string | null
          wallet_balance: number
          tab_balance: number
          consent_email_club_news: boolean
          consent_email_events: boolean
          consent_image_rights: boolean
          consent_whatsapp_group: boolean
          consent_updated_at: string
          unsubscribe_token: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone?: string | null
          license_number?: string | null
          payment_status?: string
          street_number?: string | null
          zip_code?: string | null
          city?: string | null
          birth_date?: string | null
          membership_choice?: string | null
          transponder_number?: string | null
          roi_accepted?: boolean | null
          insurance_ack?: boolean | null
          fba_license_number?: string | null
          fba_synced_at?: string | null
          referent_contract_signed_at?: string | null
          referent_contract_ip?: string | null
          referent_contract_version?: string | null
          wallet_balance?: number
          tab_balance?: number
          consent_email_club_news?: boolean
          consent_email_events?: boolean
          consent_image_rights?: boolean
          consent_whatsapp_group?: boolean
          consent_updated_at?: string
          unsubscribe_token?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          license_number?: string | null
          payment_status?: string
          street_number?: string | null
          zip_code?: string | null
          city?: string | null
          birth_date?: string | null
          membership_choice?: string | null
          transponder_number?: string | null
          roi_accepted?: boolean | null
          insurance_ack?: boolean | null
          fba_license_number?: string | null
          fba_synced_at?: string | null
          referent_contract_signed_at?: string | null
          referent_contract_ip?: string | null
          referent_contract_version?: string | null
          wallet_balance?: number
          tab_balance?: number
          consent_email_club_news?: boolean
          consent_email_events?: boolean
          consent_image_rights?: boolean
          consent_whatsapp_group?: boolean
          consent_updated_at?: string
          unsubscribe_token?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sbc_members_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedSchema: "auth"
          }
        ]
      }
      member_assigned_keys: {
        Row: {
          id: string
          member_id: string
          item_name: string
          item_code: string | null
          given_at: string
          returned_at: string | null
          given_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          member_id: string
          item_name: string
          item_code?: string | null
          given_at?: string
          returned_at?: string | null
          given_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          item_name?: string
          item_code?: string | null
          given_at?: string
          returned_at?: string | null
          given_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_assigned_keys_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "sbc_members"
            referencedSchema: "public"
          },
          {
            foreignKeyName: "member_assigned_keys_given_by_fkey"
            columns: ["given_by"]
            isOneToOne: false
            referencedRelation: "sbc_members"
            referencedSchema: "public"
          }
        ]
      }
      sbc_presence: {
        Row: {
          id: string
          member_id: string
          check_in_time: string
          check_out_time: string | null
          is_active: boolean
          is_public: boolean
          check_in_type: string
          latitude: number | null
          longitude: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          member_id: string
          check_in_time?: string
          check_out_time?: string | null
          is_active?: boolean
          is_public?: boolean
          check_in_type: string
          latitude?: number | null
          longitude?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          member_id?: string
          check_in_time?: string
          check_out_time?: string | null
          is_active?: boolean
          is_public?: boolean
          check_in_type?: string
          latitude?: number | null
          longitude?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sbc_presence_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "sbc_members"
            referencedSchema: "public"
          }
        ]
      }
      sbc_events: {
        Row: {
          id: string
          title: string
          description: string | null
          event_date: string
          start_time: string
          end_time: string
          category: string
          location: string
          registration_fee: number
          status: string
          event_type: 'sbc_race' | 'belgian_championship' | 'holiday' | 'club_meeting'
          has_registration: boolean
          external_link: string | null
          categories: Json | null
          meal_options: Json | null
          max_participants: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          event_date: string
          start_time?: string
          end_time?: string
          category?: string
          location?: string
          registration_fee?: number
          status?: string
          event_type?: 'sbc_race' | 'belgian_championship' | 'holiday' | 'club_meeting'
          has_registration?: boolean
          external_link?: string | null
          categories?: Json | null
          meal_options?: Json | null
          max_participants?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          event_date?: string
          start_time?: string
          end_time?: string
          category?: string
          location?: string
          registration_fee?: number
          status?: string
          event_type?: 'sbc_race' | 'belgian_championship' | 'holiday' | 'club_meeting'
          has_registration?: boolean
          external_link?: string | null
          categories?: Json | null
          meal_options?: Json | null
          max_participants?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      sbc_event_registrations: {
        Row: {
          id: string
          event_id: string
          member_id: string
          race_category: string
          food_options: string[] | null
          selected_meals: Json | null
          selected_categories: Json | null
          transponder_id: string | null
          total_paid: number
          created_at: string | null
        }
        Insert: {
          id?: string
          event_id: string
          member_id: string
          race_category: string
          food_options?: string[] | null
          selected_meals?: Json | null
          selected_categories?: Json | null
          transponder_id?: string | null
          total_paid?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          member_id?: string
          race_category?: string
          food_options?: string[] | null
          selected_meals?: Json | null
          selected_categories?: Json | null
          transponder_id?: string | null
          total_paid?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sbc_event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "sbc_events"
            referencedSchema: "public"
          },
          {
            foreignKeyName: "sbc_event_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "sbc_members"
            referencedSchema: "public"
          }
        ]
      }
      tracks: {
        Row: {
          id: string
          name: string
          is_open: boolean
          status_message: string | null
          closure_reason: string | null
          closure_type: string | null
          reopening_at: string | null
          order_index: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          is_open?: boolean
          status_message?: string | null
          closure_reason?: string | null
          closure_type?: string | null
          reopening_at?: string | null
          order_index?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          is_open?: boolean
          status_message?: string | null
          closure_reason?: string | null
          closure_type?: string | null
          reopening_at?: string | null
          order_index?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sbc_membership_pricing: {
        Row: {
          id: string
          year: number
          price_with_fba: number
          price_without_fba: number
          belgian_championship_fee: number
          special_rates: Json | null
          discount_enabled: boolean | null
          discount_amount: number | null
          discount_label: string | null
          discount_start_date: string | null
          discount_end_date: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          year: number
          price_with_fba?: number
          price_without_fba?: number
          belgian_championship_fee?: number
          special_rates?: Json | null
          discount_enabled?: boolean | null
          discount_amount?: number | null
          discount_label?: string | null
          discount_start_date?: string | null
          discount_end_date?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          year?: number
          price_with_fba?: number
          price_without_fba?: number
          belgian_championship_fee?: number
          special_rates?: Json | null
          discount_enabled?: boolean | null
          discount_amount?: number | null
          discount_label?: string | null
          discount_start_date?: string | null
          discount_end_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      membership_payments: {
        Row: {
          id: string
          user_id: string
          year: number
          formula: string
          special_rate_id: string | null
          includes_fba: boolean
          license_number: string | null
          includes_belgian_championship: boolean
          applied_discount: number
          amount: number
          status: string
          payment_method: string | null
          validated_by: string | null
          validated_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          year?: number
          formula?: string
          special_rate_id?: string | null
          includes_fba?: boolean
          license_number?: string | null
          includes_belgian_championship?: boolean
          applied_discount?: number
          amount: number
          status?: string
          payment_method?: string | null
          validated_by?: string | null
          validated_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          year?: number
          formula?: string
          special_rate_id?: string | null
          includes_fba?: boolean
          license_number?: string | null
          includes_belgian_championship?: boolean
          applied_discount?: number
          amount?: number
          status?: string
          payment_method?: string | null
          validated_by?: string | null
          validated_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "sbc_members"
            referencedSchema: "public"
          }
        ]
      }
      bar_categories: {
        Row: {
          id: string
          name: string
          display_order: number
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          display_order?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          display_order?: number
          created_at?: string | null
        }
        Relationships: []
      }
      bar_items: {
        Row: {
          id: string
          category_id: string
          name: string
          selling_price: number
          cost_price: number
          stock_quantity: number
          alert_threshold: number
          is_active: boolean
          image_url: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          selling_price: number
          cost_price?: number
          stock_quantity?: number
          alert_threshold?: number
          is_active?: boolean
          image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          selling_price?: number
          cost_price?: number
          stock_quantity?: number
          alert_threshold?: number
          is_active?: boolean
          image_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "bar_categories"
            referencedSchema: "public"
          }
        ]
      }
      bar_sessions: {
        Row: {
          id: string
          opened_by: string
          opened_at: string
          opening_cash: number
          closed_by: string | null
          closed_at: string | null
          closing_cash_counted: number | null
          closing_cash_expected: number | null
          cash_difference: number | null
          status: string
          notes: string | null
        }
        Insert: {
          id?: string
          opened_by: string
          opened_at?: string
          opening_cash?: number
          closed_by?: string | null
          closed_at?: string | null
          closing_cash_counted?: number | null
          closing_cash_expected?: number | null
          cash_difference?: number | null
          status?: string
          notes?: string | null
        }
        Update: {
          id?: string
          opened_by?: string
          opened_at?: string
          opening_cash?: number
          closed_by?: string | null
          closed_at?: string | null
          closing_cash_counted?: number | null
          closing_cash_expected?: number | null
          cash_difference?: number | null
          status?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "sbc_members"
            referencedSchema: "public"
          }
        ]
      }
      bar_orders: {
        Row: {
          id: string
          session_id: string | null
          buyer_id: string | null
          seller_id: string | null
          channel: string
          total_amount: number
          payment_method: string
          payment_status: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id?: string | null
          buyer_id?: string | null
          seller_id?: string | null
          channel?: string
          total_amount?: number
          payment_method: string
          payment_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string | null
          buyer_id?: string | null
          seller_id?: string | null
          channel?: string
          total_amount?: number
          payment_method?: string
          payment_status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "bar_sessions"
            referencedSchema: "public"
          },
          {
            foreignKeyName: "bar_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "sbc_members"
            referencedSchema: "public"
          }
        ]
      }
      bar_order_items: {
        Row: {
          id: string
          order_id: string
          item_id: string
          quantity: number
          unit_price: number
          total_price: number
        }
        Insert: {
          id?: string
          order_id: string
          item_id: string
          quantity: number
          unit_price: number
          total_price: number
        }
        Update: {
          id?: string
          order_id?: string
          item_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bar_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "bar_orders"
            referencedSchema: "public"
          },
          {
            foreignKeyName: "bar_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "bar_items"
            referencedSchema: "public"
          }
        ]
      }
      bar_stock_movements: {
        Row: {
          id: string
          item_id: string
          type: string
          quantity: number
          cost_price_at_time: number
          reason: string | null
          admin_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          item_id: string
          type: string
          quantity: number
          cost_price_at_time?: number
          reason?: string | null
          admin_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          type?: string
          quantity?: number
          cost_price_at_time?: number
          reason?: string | null
          admin_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "bar_items"
            referencedSchema: "public"
          }
        ]
      }
      accounting_transactions: {
        Row: {
          id: string
          date: string
          type: string
          category: string
          payment_method: string
          amount: number
          description: string
          receipt_url: string | null
          source_type: string
          source_id: string | null
          author_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date?: string
          type: string
          category: string
          payment_method: string
          amount: number
          description: string
          receipt_url?: string | null
          source_type?: string
          source_id?: string | null
          author_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          type?: string
          category?: string
          payment_method?: string
          amount?: number
          description?: string
          receipt_url?: string | null
          source_type?: string
          source_id?: string | null
          author_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_transactions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "sbc_members"
            referencedSchema: "public"
          }
        ]
      }
      fba_attendances: {
        Row: {
          id: string
          user_id: string | null
          visitor_name: string | null
          visitor_license: string | null
          track_id: string | null
          check_in_at: string
          check_out_at: string | null
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          visitor_name?: string | null
          visitor_license?: string | null
          track_id?: string | null
          check_in_at?: string
          check_out_at?: string | null
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          visitor_name?: string | null
          visitor_license?: string | null
          track_id?: string | null
          check_in_at?: string
          check_out_at?: string | null
          source?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fba_attendances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "sbc_members"
            referencedSchema: "public"
          },
          {
            foreignKeyName: "fba_attendances_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedSchema: "public"
          }
        ]
      }
      gdpr_processing_register: {
        Row: {
          id: string
          activity_name: string
          purpose: string
          legal_basis: string
          data_categories: string
          retention_period: string
          recipients: string
          security_measures: string
          updated_at: string
        }
        Insert: {
          id?: string
          activity_name: string
          purpose: string
          legal_basis: string
          data_categories: string
          retention_period: string
          recipients: string
          security_measures: string
          updated_at?: string
        }
        Update: {
          id?: string
          activity_name?: string
          purpose?: string
          legal_basis?: string
          data_categories?: string
          retention_period?: string
          recipients?: string
          security_measures?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          id: string
          sender_id: string | null
          subject: string
          category: string
          recipients_count: number
          sent_at: string
        }
        Insert: {
          id?: string
          sender_id?: string | null
          subject: string
          category: string
          recipients_count?: number
          sent_at?: string
        }
        Update: {
          id?: string
          sender_id?: string | null
          subject?: string
          category?: string
          recipients_count?: number
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "sbc_members"
            referencedSchema: "public"
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      sbc_verify_lock_code: {
        Args: {
          input_code: string
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
