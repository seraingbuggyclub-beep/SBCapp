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
          created_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          event_date: string
          start_time: string
          end_time: string
          category: string
          location?: string
          registration_fee?: number
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
