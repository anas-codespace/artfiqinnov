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
      admin_pins: {
        Row: {
          created_at: string
          id: string
          pin_hash: string
          security_answer_hash: string
          security_question: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pin_hash: string
          security_answer_hash: string
          security_question: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pin_hash?: string
          security_answer_hash?: string
          security_question?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          punch_in_time: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          punch_in_time?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          punch_in_time?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      cleanup_log: {
        Row: {
          executed_at: string
          id: string
          user_id: string
        }
        Insert: {
          executed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          executed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      company_holidays: {
        Row: {
          created_at: string
          date: string
          declared_by: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          date: string
          declared_by: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          date?: string
          declared_by?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          created_by_name: string
          description: string | null
          end_date: string
          id: string
          is_urgent: boolean | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          created_by_name: string
          description?: string | null
          end_date: string
          id?: string
          is_urgent?: boolean | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          created_by_name?: string
          description?: string | null
          end_date?: string
          id?: string
          is_urgent?: boolean | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      file_views: {
        Row: {
          file_id: string
          id: string
          user_id: string
          user_name: string
          viewed_at: string
        }
        Insert: {
          file_id: string
          id?: string
          user_id: string
          user_name: string
          viewed_at?: string
        }
        Update: {
          file_id?: string
          id?: string
          user_id?: string
          user_name?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_views_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          id: string
          name: string
          size: number
          storage_path: string
          uploaded_by: string
          uploader_name: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          size: number
          storage_path: string
          uploaded_by: string
          uploader_name: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          size?: number
          storage_path?: string
          uploaded_by?: string
          uploader_name?: string
          url?: string
        }
        Relationships: []
      }
      founder_alerts: {
        Row: {
          created_at: string
          file_id: string | null
          id: string
          message: string
          read_by_ceo: boolean | null
          read_by_cto: boolean | null
          triggered_by: string
          triggered_by_name: string
          type: string
        }
        Insert: {
          created_at?: string
          file_id?: string | null
          id?: string
          message: string
          read_by_ceo?: boolean | null
          read_by_cto?: boolean | null
          triggered_by: string
          triggered_by_name: string
          type: string
        }
        Update: {
          created_at?: string
          file_id?: string | null
          id?: string
          message?: string
          read_by_ceo?: boolean | null
          read_by_cto?: boolean | null
          triggered_by?: string
          triggered_by_name?: string
          type?: string
        }
        Relationships: []
      }
      leave_requests: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string
          reviewed_by: string | null
          reviewer_note: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason: string
          reviewed_by?: string | null
          reviewer_note?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string
          reviewed_by?: string | null
          reviewer_note?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          id: string
          reply_to: string | null
          text: string
          user_avatar: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          reply_to?: string | null
          text: string
          user_avatar?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          reply_to?: string | null
          text?: string
          user_avatar?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pitch_votes: {
        Row: {
          created_at: string
          id: string
          pitch_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          pitch_id: string
          user_id: string
          vote_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          pitch_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pitch_votes_pitch_id_fkey"
            columns: ["pitch_id"]
            isOneToOne: false
            referencedRelation: "pitches"
            referencedColumns: ["id"]
          },
        ]
      }
      pitches: {
        Row: {
          author_id: string
          created_at: string
          description: string | null
          feedback: string | null
          id: string
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
          votes_down: number
          votes_up: number
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string | null
          feedback?: string | null
          id?: string
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
          votes_down?: number
          votes_up?: number
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string | null
          feedback?: string | null
          id?: string
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          votes_down?: number
          votes_up?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_status: string | null
          avatar_url: string | null
          created_at: string
          department: string | null
          display_name: string | null
          email: string | null
          id: string
          posting: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_status?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          posting?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_status?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          posting?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string
          created_at: string
          created_by: string
          description: string | null
          icon: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          created_by_name: string
          description: string | null
          id: string
          priority: string | null
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          created_by_name: string
          description?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string
          description?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          id: string
          is_online: boolean
          is_typing: boolean
          last_seen: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_online?: boolean
          is_typing?: boolean
          last_seen?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_online?: boolean
          is_typing?: boolean
          last_seen?: string
          updated_at?: string
          user_id?: string
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
      profiles_safe: {
        Row: {
          access_status: string | null
          avatar_url: string | null
          created_at: string | null
          department: string | null
          display_name: string | null
          email: string | null
          id: string | null
          posting: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_status?: string | null
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string | null
          posting?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_status?: string | null
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string | null
          posting?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_messages: { Args: never; Returns: number }
      get_access_status: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_approved_member: { Args: { _user_id: string }; Returns: boolean }
      verify_admin_pin: {
        Args: { _pin: string; _user_id: string }
        Returns: boolean
      }
      verify_security_answer: {
        Args: { _answer: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "ceo" | "cto" | "team"
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
      app_role: ["ceo", "cto", "team"],
    },
  },
} as const
