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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      channel_members: {
        Row: {
          channel_id: string
          joined_at: string
          last_read_ordinal: number
          role: Database["public"]["Enums"]["channel_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          joined_at?: string
          last_read_ordinal?: number
          role?: Database["public"]["Enums"]["channel_role"]
          team_id: string
          user_id: string
        }
        Update: {
          channel_id?: string
          joined_at?: string
          last_read_ordinal?: number
          role?: Database["public"]["Enums"]["channel_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_team_id_channel_id_fkey"
            columns: ["team_id", "channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "channel_members_team_id_user_id_fkey"
            columns: ["team_id", "user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
        ]
      }
      channels: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          dm_user_high: string | null
          dm_user_low: string | null
          id: string
          kind: Database["public"]["Enums"]["channel_kind"]
          last_message_ordinal: number
          name: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          dm_user_high?: string | null
          dm_user_low?: string | null
          id?: string
          kind: Database["public"]["Enums"]["channel_kind"]
          last_message_ordinal?: number
          name?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          dm_user_high?: string | null
          dm_user_low?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["channel_kind"]
          last_message_ordinal?: number
          name?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_team_id_dm_user_high_fkey"
            columns: ["team_id", "dm_user_high"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
          {
            foreignKeyName: "channels_team_id_dm_user_low_fkey"
            columns: ["team_id", "dm_user_low"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
          {
            foreignKeyName: "channels_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          event_id: string
          responded_at: string | null
          response: Database["public"]["Enums"]["attendance_response"]
          team_id: string
          user_id: string
        }
        Insert: {
          event_id: string
          responded_at?: string | null
          response?: Database["public"]["Enums"]["attendance_response"]
          team_id: string
          user_id: string
        }
        Update: {
          event_id?: string
          responded_at?: string | null
          response?: Database["public"]["Enums"]["attendance_response"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_team_id_event_id_fkey"
            columns: ["team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "event_attendees_team_id_user_id_fkey"
            columns: ["team_id", "user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
        ]
      }
      events: {
        Row: {
          call_url: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string
          description: string
          ends_at: string
          id: string
          kind: Database["public"]["Enums"]["event_kind"]
          starts_at: string
          team_id: string
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          call_url?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by: string
          description?: string
          ends_at: string
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          starts_at: string
          team_id: string
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          call_url?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          ends_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          starts_at?: string
          team_id?: string
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      member_statuses: {
        Row: {
          body: string
          emoji: string | null
          expires_at: string | null
          team_id: string
          timer_running: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          emoji?: string | null
          expires_at?: string | null
          team_id: string
          timer_running?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          emoji?: string | null
          expires_at?: string | null
          team_id?: string
          timer_running?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_statuses_team_id_user_id_fkey"
            columns: ["team_id", "user_id"]
            isOneToOne: true
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string
          body: string
          channel_id: string
          client_id: string
          created_at: string
          deleted_at: string | null
          id: string
          ordinal: number
          team_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          channel_id: string
          client_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          ordinal: number
          team_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          channel_id?: string
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          ordinal?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_team_id_author_id_fkey"
            columns: ["team_id", "author_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
          {
            foreignKeyName: "messages_team_id_channel_id_fkey"
            columns: ["team_id", "channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          last_seen_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          last_seen_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_seen_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          description?: string
          id?: string
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          assignee_id: string | null
          created_at: string
          created_by: string
          description: string
          due_on: string | null
          id: string
          priority: string
          project_id: string | null
          status: string
          team_id: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          assignee_id?: string | null
          created_at?: string
          created_by: string
          description?: string
          due_on?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          team_id: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_on?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          team_id?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_assignee_id_fkey"
            columns: ["team_id", "assignee_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
          {
            foreignKeyName: "tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_team_id_project_id_fkey"
            columns: ["team_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      team_members: {
        Row: {
          is_active: boolean
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_workspace_id_team_id_fkey"
            columns: ["workspace_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "team_members_workspace_id_user_id_fkey"
            columns: ["workspace_id", "user_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["workspace_id", "user_id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          description: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          project_id: string | null
          source: string
          started_at: string
          task_id: string | null
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          project_id?: string | null
          source: string
          started_at: string
          task_id?: string | null
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          project_id?: string | null
          source?: string
          started_at?: string
          task_id?: string | null
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_task_team_fk"
            columns: ["team_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "time_entries_team_id_project_id_fkey"
            columns: ["team_id", "project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "time_entries_team_id_user_id_fkey"
            columns: ["team_id", "user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          is_active: boolean
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      channel_unread_counts: {
        Row: {
          channel_id: string | null
          last_read_ordinal: number | null
          team_id: string | null
          unread_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_team_id_channel_id_fkey"
            columns: ["team_id", "channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "channel_members_team_id_user_id_fkey"
            columns: ["team_id", "user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
        ]
      }
    }
    Functions: {
      add_manual_time_entry: {
        Args: {
          p_description?: string
          p_ended_at: string
          p_project_id?: string
          p_started_at: string
          p_team_id: string
        }
        Returns: string
      }
      archive_task: {
        Args: { p_expected_version: number; p_task_id: string }
        Returns: undefined
      }
      cancel_event: { Args: { p_event_id: string }; Returns: undefined }
      create_channel: {
        Args: {
          p_kind?: Database["public"]["Enums"]["channel_kind"]
          p_member_ids?: string[]
          p_name: string
          p_team_id: string
        }
        Returns: string
      }
      create_team: {
        Args: { p_name: string; p_workspace_id: string }
        Returns: string
      }
      create_workspace: { Args: { p_name: string }; Returns: string }
      delete_message: { Args: { p_message_id: string }; Returns: undefined }
      edit_message: {
        Args: { p_body: string; p_message_id: string }
        Returns: undefined
      }
      edit_time_entry: {
        Args: {
          p_description?: string
          p_ended_at: string
          p_entry_id: string
          p_project_id?: string
          p_started_at: string
        }
        Returns: undefined
      }
      invite_event_attendee: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: undefined
      }
      join_public_channel: {
        Args: { p_channel_id: string }
        Returns: undefined
      }
      mark_channel_read: {
        Args: { p_channel_id: string; p_through_ordinal: number }
        Returns: undefined
      }
      move_task: {
        Args: {
          p_expected_version: number
          p_status: string
          p_task_id: string
        }
        Returns: undefined
      }
      open_dm: {
        Args: { p_other_user_id: string; p_team_id: string }
        Returns: string
      }
      recover_channel_moderator: {
        Args: { p_channel_id: string; p_user_id: string }
        Returns: undefined
      }
      remove_channel_member: {
        Args: { p_channel_id: string; p_user_id: string }
        Returns: undefined
      }
      respond_to_event: {
        Args: {
          p_event_id: string
          p_response: Database["public"]["Enums"]["attendance_response"]
        }
        Returns: undefined
      }
      save_event: {
        Args: {
          p_call_url?: string
          p_description?: string
          p_ends_at: string
          p_event_id?: string
          p_kind?: Database["public"]["Enums"]["event_kind"]
          p_starts_at: string
          p_team_id: string
          p_timezone?: string
          p_title: string
        }
        Returns: string
      }
      save_project: {
        Args: {
          p_archived?: boolean
          p_description?: string
          p_name: string
          p_project_id?: string
          p_team_id: string
        }
        Returns: string
      }
      save_task: {
        Args: {
          p_assignee_id?: string
          p_description?: string
          p_due_on?: string
          p_expected_version?: number
          p_priority?: string
          p_project_id?: string
          p_task_id?: string
          p_team_id: string
          p_title: string
        }
        Returns: string
      }
      send_message: {
        Args: { p_body: string; p_channel_id: string; p_client_id: string }
        Returns: string
      }
      set_channel_archived: {
        Args: { p_archived: boolean; p_channel_id: string }
        Returns: undefined
      }
      set_channel_member: {
        Args: {
          p_channel_id: string
          p_role?: Database["public"]["Enums"]["channel_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      set_team_member: {
        Args: {
          p_is_active?: boolean
          p_role: Database["public"]["Enums"]["team_role"]
          p_team_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      set_work_status: {
        Args: {
          p_body: string
          p_emoji?: string
          p_expires_at?: string
          p_team_id: string
        }
        Returns: undefined
      }
      set_workspace_member: {
        Args: {
          p_is_active?: boolean
          p_role: Database["public"]["Enums"]["workspace_role"]
          p_user_id: string
          p_workspace_id: string
        }
        Returns: undefined
      }
      start_task_timer: { Args: { p_task_id: string }; Returns: string }
      start_timer: {
        Args: {
          p_description?: string
          p_project_id?: string
          p_team_id: string
        }
        Returns: string
      }
      stop_timer: { Args: { p_entry_id: string }; Returns: string }
      touch_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      attendance_response: "pending" | "accepted" | "tentative" | "declined"
      channel_kind: "public" | "private" | "dm"
      channel_role: "moderator" | "member"
      event_kind: "event" | "meeting"
      team_role: "leader" | "member"
      workspace_role: "admin" | "member"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      attendance_response: ["pending", "accepted", "tentative", "declined"],
      channel_kind: ["public", "private", "dm"],
      channel_role: ["moderator", "member"],
      event_kind: ["event", "meeting"],
      team_role: ["leader", "member"],
      workspace_role: ["admin", "member"],
    },
  },
} as const
