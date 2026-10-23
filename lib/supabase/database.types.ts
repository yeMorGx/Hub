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
      absences: {
        Row: {
          created_at: string
          decided_by: string | null
          decision_note: string
          ends_on: string
          id: string
          kind: string
          note: string
          starts_on: string
          status: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_by?: string | null
          decision_note?: string
          ends_on: string
          id?: string
          kind: string
          note?: string
          starts_on: string
          status?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_by?: string | null
          decision_note?: string
          ends_on?: string
          id?: string
          kind?: string
          note?: string
          starts_on?: string
          status?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_team_id_user_id_fkey"
            columns: ["team_id", "user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
        ]
      }
      attachments: {
        Row: {
          byte_size: number
          channel_id: string
          created_at: string
          created_by: string
          filename: string
          id: string
          message_id: string | null
          mime_type: string
          object_path: string
          state: string
          team_id: string
        }
        Insert: {
          byte_size: number
          channel_id: string
          created_at?: string
          created_by: string
          filename: string
          id?: string
          message_id?: string | null
          mime_type: string
          object_path: string
          state?: string
          team_id: string
        }
        Update: {
          byte_size?: number
          channel_id?: string
          created_at?: string
          created_by?: string
          filename?: string
          id?: string
          message_id?: string | null
          mime_type?: string
          object_path?: string
          state?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_team_id_channel_id_fkey"
            columns: ["team_id", "channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "attachments_team_id_channel_id_message_id_fkey"
            columns: ["team_id", "channel_id", "message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["team_id", "channel_id", "id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json
          entity_id: string
          entity_table: string
          id: number
          occurred_at: string
          team_id: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json
          entity_id: string
          entity_table: string
          id?: never
          occurred_at?: string
          team_id?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json
          entity_id?: string
          entity_table?: string
          id?: never
          occurred_at?: string
          team_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          last_synced_at: string | null
          provider: string
          sync_locked_until: string | null
          sync_token: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider: string
          sync_locked_until?: string | null
          sync_token?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider?: string
          sync_locked_until?: string | null
          sync_token?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_team_id_user_id_fkey"
            columns: ["team_id", "user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
        ]
      }
      calendar_event_links: {
        Row: {
          connection_id: string
          event_id: string
          external_id: string
          external_updated_at: string | null
          hub_updated_at: string | null
          synced_at: string
          team_id: string
        }
        Insert: {
          connection_id: string
          event_id: string
          external_id: string
          external_updated_at?: string | null
          hub_updated_at?: string | null
          synced_at?: string
          team_id: string
        }
        Update: {
          connection_id?: string
          event_id?: string
          external_id?: string
          external_updated_at?: string | null
          hub_updated_at?: string | null
          synced_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_links_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_links_team_id_event_id_fkey"
            columns: ["team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
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
      clients: {
        Row: {
          archived_at: string | null
          created_by: string
          id: string
          name: string
          team_id: string
        }
        Insert: {
          archived_at?: string | null
          created_by: string
          id?: string
          name: string
          team_id: string
        }
        Update: {
          archived_at?: string | null
          created_by?: string
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_team_id_fkey"
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
      incoming_webhooks: {
        Row: {
          channel_id: string
          created_at: string
          created_by: string
          enabled: boolean
          id: string
          last_called_at: string | null
          name: string
          team_id: string
          token_hash: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          created_by: string
          enabled?: boolean
          id?: string
          last_called_at?: string | null
          name: string
          team_id: string
          token_hash: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          created_by?: string
          enabled?: boolean
          id?: string
          last_called_at?: string | null
          name?: string
          team_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "incoming_webhooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incoming_webhooks_team_id_channel_id_fkey"
            columns: ["team_id", "channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["team_id", "id"]
          },
        ]
      }
      home_office_holidays: {
        Row: { created_at: string; holiday_date: string; label: string; team_id: string }
        Insert: { created_at?: string; holiday_date: string; label?: string; team_id: string }
        Update: { created_at?: string; holiday_date?: string; label?: string; team_id?: string }
        Relationships: []
      }
      home_office_members: {
        Row: { anchor_weekday: number; team_id: string; user_id: string }
        Insert: { anchor_weekday: number; team_id: string; user_id: string }
        Update: { anchor_weekday?: number; team_id?: string; user_id?: string }
        Relationships: []
      }
      home_office_schedules: {
        Row: { anchor_week: string; created_at: string; created_by: string; enabled: boolean; reminder_time: string; team_id: string; timezone: string; updated_at: string }
        Insert: { anchor_week: string; created_at?: string; created_by: string; enabled?: boolean; reminder_time?: string; team_id: string; timezone?: string; updated_at?: string }
        Update: { anchor_week?: string; created_at?: string; created_by?: string; enabled?: boolean; reminder_time?: string; team_id?: string; timezone?: string; updated_at?: string }
        Relationships: []
      }
      home_office_swaps: {
        Row: { created_at: string; id: string; requested_by: string; status: string; target_user_id: string; team_id: string; updated_at: string; week_start: string }
        Insert: { created_at?: string; id?: string; requested_by: string; status?: string; target_user_id: string; team_id: string; updated_at?: string; week_start: string }
        Update: { created_at?: string; id?: string; requested_by?: string; status?: string; target_user_id?: string; team_id?: string; updated_at?: string; week_start?: string }
        Relationships: []
      }
      meeting_documents: {
        Row: {
          agenda: string
          event_id: string
          minutes: string
          team_id: string
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          agenda?: string
          event_id: string
          minutes?: string
          team_id: string
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          agenda?: string
          event_id?: string
          minutes?: string
          team_id?: string
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "meeting_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_documents_team_id_event_id_fkey"
            columns: ["team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "meeting_documents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      message_pins: {
        Row: {
          active: boolean
          channel_id: string
          message_id: string
          pinned_by: string
          team_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          channel_id: string
          message_id: string
          pinned_by: string
          team_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          channel_id?: string
          message_id?: string
          pinned_by?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_pins_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_pins_team_id_channel_id_message_id_fkey"
            columns: ["team_id", "channel_id", "message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["team_id", "channel_id", "id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          active: boolean
          channel_id: string
          message_id: string
          reaction: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          channel_id: string
          message_id: string
          reaction: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          channel_id?: string
          message_id?: string
          reaction?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_team_id_channel_id_message_id_fkey"
            columns: ["team_id", "channel_id", "message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["team_id", "channel_id", "id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
          reply_to: string | null
          source: string
          team_id: string
          updated_at: string
          webhook_id: string | null
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
          reply_to?: string | null
          source?: string
          team_id: string
          updated_at?: string
          webhook_id?: string | null
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
          reply_to?: string | null
          source?: string
          team_id?: string
          updated_at?: string
          webhook_id?: string | null
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
          {
            foreignKeyName: "messages_thread_scope_fk"
            columns: ["team_id", "channel_id", "reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["team_id", "channel_id", "id"]
          },
          {
            foreignKeyName: "messages_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "incoming_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel_id: string | null
          created_at: string
          dedupe_key: string
          delivered_at: string | null
          delivery_attempts: number
          delivery_claimed_at: string | null
          event_id: string | null
          id: string
          kind: string
          message_id: string | null
          read_at: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          dedupe_key: string
          delivered_at?: string | null
          delivery_attempts?: number
          delivery_claimed_at?: string | null
          event_id?: string | null
          id?: string
          kind: string
          message_id?: string | null
          read_at?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          dedupe_key?: string
          delivered_at?: string | null
          delivery_attempts?: number
          delivery_claimed_at?: string | null
          event_id?: string | null
          id?: string
          kind?: string
          message_id?: string | null
          read_at?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_team_id_channel_id_message_id_fkey"
            columns: ["team_id", "channel_id", "message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["team_id", "channel_id", "id"]
          },
          {
            foreignKeyName: "notifications_team_id_event_id_fkey"
            columns: ["team_id", "event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
            foreignKeyName: "projects_team_id_client_id_fkey"
            columns: ["team_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["team_id", "id"]
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
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swaps: {
        Row: {
          created_at: string
          decided_by: string | null
          id: string
          requested_by: string
          shift_id: string
          status: string
          target_user_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_by?: string | null
          id?: string
          requested_by: string
          shift_id: string
          status?: string
          target_user_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_by?: string | null
          id?: string
          requested_by?: string
          shift_id?: string
          status?: string
          target_user_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swaps_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_team_id_requested_by_fkey"
            columns: ["team_id", "requested_by"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
          {
            foreignKeyName: "shift_swaps_team_id_shift_id_fkey"
            columns: ["team_id", "shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["team_id", "id"]
          },
          {
            foreignKeyName: "shift_swaps_team_id_target_user_id_fkey"
            columns: ["team_id", "target_user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
        ]
      }
      shifts: {
        Row: {
          cancelled_at: string | null
          created_by: string
          ends_at: string
          id: string
          label: string
          starts_at: string
          team_id: string
          user_id: string
          version: number
        }
        Insert: {
          cancelled_at?: string | null
          created_by: string
          ends_at: string
          id?: string
          label: string
          starts_at: string
          team_id: string
          user_id: string
          version?: number
        }
        Update: {
          cancelled_at?: string | null
          created_by?: string
          ends_at?: string
          id?: string
          label?: string
          starts_at?: string
          team_id?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_team_id_user_id_fkey"
            columns: ["team_id", "user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
        ]
      }
      standups: {
        Row: {
          accomplished: string
          blockers: string
          id: string
          kind: string
          mood: string
          period_on: string
          planned: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accomplished?: string
          blockers?: string
          id?: string
          kind: string
          mood?: string
          period_on: string
          planned?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accomplished?: string
          blockers?: string
          id?: string
          kind?: string
          mood?: string
          period_on?: string
          planned?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "standups_team_id_user_id_fkey"
            columns: ["team_id", "user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
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
          sort_order?: number
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
          sort_order?: number
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
          sort_order?: number
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
      team_dates: {
        Row: {
          created_by: string
          happens_on: string
          id: string
          label: string
          recurs_yearly: boolean
          team_id: string
        }
        Insert: {
          created_by: string
          happens_on: string
          id?: string
          label: string
          recurs_yearly?: boolean
          team_id: string
        }
        Update: {
          created_by?: string
          happens_on?: string
          id?: string
          label?: string
          recurs_yearly?: boolean
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_dates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_dates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          is_team_admin?: boolean
          permissions?: Json

          is_active: boolean
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          is_team_admin?: boolean
          permissions?: Json

          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          is_team_admin?: boolean
          permissions?: Json

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
      team_notes: {
        Row: {
          archived_at: string | null
          body: string
          created_at: string
          created_by: string
          id: string
          team_id: string
          title: string
          updated_at: string
          updated_by: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          body?: string
          created_at?: string
          created_by: string
          id?: string
          team_id: string
          title: string
          updated_at?: string
          updated_by: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          team_id?: string
          title?: string
          updated_at?: string
          updated_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_notes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
          carried_seconds: number
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
          carried_seconds?: number
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
          carried_seconds?: number
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
      time_goals: {
        Row: {
          forgotten_after_minutes: number
          team_id: string
          updated_at: string
          user_id: string
          weekly_minutes: number
        }
        Insert: {
          forgotten_after_minutes?: number
          team_id: string
          updated_at?: string
          user_id: string
          weekly_minutes: number
        }
        Update: {
          forgotten_after_minutes?: number
          team_id?: string
          updated_at?: string
          user_id?: string
          weekly_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "time_goals_team_id_user_id_fkey"
            columns: ["team_id", "user_id"]
            isOneToOne: true
            referencedRelation: "team_members"
            referencedColumns: ["team_id", "user_id"]
          },
        ]
      }
      work_schedules: {
        Row: { daily_minutes: number; effective_from: string; setup_state: string; team_id: string; timezone: string; updated_at: string; user_id: string; workdays_mask: number }
        Insert: { daily_minutes: number; effective_from: string; setup_state: string; team_id: string; timezone?: string; updated_at?: string; user_id: string; workdays_mask: number }
        Update: { daily_minutes?: number; effective_from?: string; setup_state?: string; team_id?: string; timezone?: string; updated_at?: string; user_id?: string; workdays_mask?: number }
        Relationships: [
          { foreignKeyName: "work_schedules_team_id_user_id_fkey"; columns: ["team_id", "user_id"]; isOneToOne: false; referencedRelation: "team_members"; referencedColumns: ["team_id", "user_id"] }
        ]
      }
      paused_timers: {
        Row: { accumulated_seconds: number; description: string; paused_at: string; project_id: string | null; task_id: string | null; team_id: string; user_id: string }
        Insert: { accumulated_seconds: number; description?: string; paused_at?: string; project_id?: string | null; task_id?: string | null; team_id: string; user_id: string }
        Update: { accumulated_seconds?: number; description?: string; paused_at?: string; project_id?: string | null; task_id?: string | null; team_id?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "paused_timers_team_id_user_id_fkey"; columns: ["team_id", "user_id"]; isOneToOne: true; referencedRelation: "team_members"; referencedColumns: ["team_id", "user_id"] },
          { foreignKeyName: "paused_timers_team_id_project_id_fkey"; columns: ["team_id", "project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["team_id", "id"] },
          { foreignKeyName: "paused_timers_team_id_task_id_fkey"; columns: ["team_id", "task_id"]; isOneToOne: false; referencedRelation: "tasks"; referencedColumns: ["team_id", "id"] }
        ]
      }
      workspace_members: {
        Row: {
          job_title?: string
          can_approve?: boolean

          is_active: boolean
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          job_title?: string
          can_approve?: boolean

          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          job_title?: string
          can_approve?: boolean

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
          owner_id?: string

          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          owner_id?: string

          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          owner_id?: string

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
      organization_contacts: { Args: { p_workspace_id: string; p_other_user_id?: string }; Returns: Json };
      organization_console: { Args: { p_workspace_id: string; p_command?: string; p_payload?: Json }; Returns: Json };
      library_console: { Args: { p_workspace_id: string; p_command?: string; p_payload?: Json }; Returns: Json };
      organization_permission: { Args: { p_team_id: string; p_capability: string }; Returns: boolean };
      issue_organization_invite: { Args: { p_authorization_id: string; p_token_hash: string }; Returns: Json };

      report_work_balances: { Args: { p_team_id: string; p_from: string; p_to: string; p_user_id?: string }; Returns: { user_id: string; display_name: string; work_date: string; expected_minutes: number; actual_seconds: number; configured: boolean }[] };
      create_team_invitation: {
        Args: { p_team_id: string; p_email: string; p_role: Database["public"]["Enums"]["team_role"]; p_token_hash: string }
        Returns: Json
      }
      list_team_access: {
        Args: { p_team_id: string }
        Returns: Json
      }
      revoke_team_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      preview_team_invitation: {
        Args: { p_token: string }
        Returns: Json
      }
      accept_team_invitation: {
        Args: { p_token: string }
        Returns: string
      }
      manage_team_access: {
        Args: { p_team_id: string; p_user_id: string; p_workspace_role: Database["public"]["Enums"]["workspace_role"]; p_team_role: Database["public"]["Enums"]["team_role"]; p_is_active: boolean }
        Returns: undefined
      }
      absence_schedule: {
        Args: { p_from: string; p_team_id: string; p_to: string }
        Returns: {
          ends_on: string
          starts_on: string
          user_id: string
        }[]
      }
      accept_incoming_webhook: {
        Args: {
          p_body: string
          p_event_id: string
          p_token: string
          p_webhook_id: string
        }
        Returns: string
      }
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
      apply_calendar_event: {
        Args: {
          p_cancelled?: boolean
          p_connection_id: string
          p_description?: string
          p_ends_at: string
          p_event_id?: string
          p_expected_updated_at?: string
          p_starts_at: string
          p_title: string
        }
        Returns: string
      }
      archive_task: {
        Args: { p_expected_version: number; p_task_id: string }
        Returns: undefined
      }
      calendar_background: {
        Args: {
          p_connection_id?: string
          p_operation: string
          p_payload?: Json
        }
        Returns: Json
      }
      calendar_connection_secret: {
        Args: { p_connection_id: string }
        Returns: string
      }
      calendar_worker_dispatch: {
        Args: {
          p_arguments?: Json
          p_connection_id: string
          p_operation: string
        }
        Returns: Json
      }
      call_channel_roster: {
        Args: { p_channel_id: string }
        Returns: {
          user_id: string
        }[]
      }
      cancel_absence: { Args: { p_absence_id: string }; Returns: undefined }
      cancel_event: { Args: { p_event_id: string }; Returns: undefined }
      claim_calendar_sync: {
        Args: { p_connection_id: string }
        Returns: string
      }
      complete_calendar_sync: {
        Args: { p_connection_id: string; p_token: string }
        Returns: undefined
      }
      claim_notification_deliveries: {
        Args: { p_message_id?: string }
        Returns: {
          channel_id: string | null
          created_at: string
          dedupe_key: string
          delivered_at: string | null
          delivery_attempts: number
          delivery_claimed_at: string | null
          event_id: string | null
          id: string
          kind: string
          message_id: string | null
          read_at: string | null
          team_id: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_channel: {
        Args: {
          p_kind?: Database["public"]["Enums"]["channel_kind"]
          p_member_ids?: string[]
          p_name: string
          p_team_id: string
        }
        Returns: string
      }
      create_incoming_webhook: {
        Args: { p_channel_id: string; p_name: string }
        Returns: Json
      }
      create_team: {
        Args: { p_name: string; p_workspace_id: string }
        Returns: string
      }
      create_workspace: { Args: { p_name: string }; Returns: string }
      create_organization: { Args: { p_name: string; p_team_name: string }; Returns: Json }
      organization_deletion_status: { Args: { p_workspace_id: string }; Returns: boolean }
      begin_organization_deletion: { Args: { p_workspace_id: string; p_confirmation_name: string }; Returns: undefined }
      organization_deletion_files: { Args: { p_workspace_id: string }; Returns: { bucket_id: string; object_path: string }[] }
      finalize_organization_deletion: { Args: { p_workspace_id: string; p_confirmation_name: string }; Returns: undefined }
      decide_home_office_swap: { Args: { p_action: string; p_request_id: string }; Returns: undefined }
      decide_absence: {
        Args: { p_absence_id: string; p_note?: string; p_status: string }
        Returns: undefined
      }
      decide_shift_swap: {
        Args: { p_action: string; p_request_id: string }
        Returns: undefined
      }
      delete_message: { Args: { p_message_id: string }; Returns: undefined }
      delivery_configuration: { Args: never; Returns: Json }
      disconnect_calendar: {
        Args: { p_connection_id: string }
        Returns: undefined
      }
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
      get_home_office_calendar: {
        Args: { p_ends_on: string; p_starts_on: string; p_team_id: string }
        Returns: { avatar_url: string | null; display_name: string | null; entry_kind: string; entry_label: string | null; scheduled_on: string; team_id: string; user_id: string | null; week_start: string }[]
      }
      get_work_hour_balance: {
        Args: { p_from: string; p_team_id: string; p_to: string }
        Returns: { actual_seconds: number; expected_minutes: number; work_date: string }[]
      }
      pause_timer: { Args: Record<PropertyKey, never>; Returns: string }
      resume_timer: { Args: Record<PropertyKey, never>; Returns: string }
      stop_paused_timer: { Args: Record<PropertyKey, never>; Returns: undefined }
      finish_attachment: {
        Args: { p_attachment_id: string }
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
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      position_task: {
        Args: { p_task_id: string; p_status: string; p_expected_version: number; p_before_id?: string; p_after_id?: string }
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
      queue_home_office_reminders: { Args: never; Returns: undefined }
      pin_message: {
        Args: { p_active: boolean; p_message_id: string }
        Returns: undefined
      }
      react_to_message: {
        Args: { p_active: boolean; p_message_id: string; p_reaction: string }
        Returns: undefined
      }
      recover_channel_moderator: {
        Args: { p_channel_id: string; p_user_id: string }
        Returns: undefined
      }
      refresh_my_reminders: { Args: { p_team_id: string }; Returns: undefined }
      register_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string }
        Returns: string
      }
      release_calendar_sync: {
        Args: { p_connection_id: string; p_token: string }
        Returns: undefined
      }
      remove_attachment: {
        Args: { p_attachment_id: string }
        Returns: undefined
      }
      remove_channel_member: {
        Args: { p_channel_id: string; p_user_id: string }
        Returns: undefined
      }
      report_time_entries: {
        Args: {
          p_after?: string
          p_client_id?: string
          p_from: string
          p_project_id?: string
          p_team_id: string
          p_to: string
          p_user_id?: string
        }
        Returns: {
          client_id: string
          client_name: string
          description: string
          display_name: string
          duration_seconds: number
          ended_at: string
          entry_id: string
          project_id: string
          project_name: string
          started_at: string
          user_id: string
        }[]
      }
      request_absence: {
        Args: {
          p_ends_on: string
          p_kind: string
          p_note?: string
          p_starts_on: string
          p_team_id: string
        }
        Returns: string
      }
      request_home_office_swap: { Args: { p_target_user_id: string; p_team_id: string; p_week_start: string }; Returns: string }
      request_shift_swap: {
        Args: { p_shift_id: string; p_target_user_id: string }
        Returns: string
      }
      reserve_attachment: {
        Args: {
          p_byte_size: number
          p_channel_id: string
          p_filename: string
          p_mime_type: string
        }
        Returns: string
      }
      respond_to_event: {
        Args: {
          p_event_id: string
          p_response: Database["public"]["Enums"]["attendance_response"]
        }
        Returns: undefined
      }
      run_channel_command: {
        Args: {
          p_action: string
          p_channel_id: string
          p_client_id: string
          p_description?: string
          p_ends_at?: string
          p_starts_at?: string
          p_timezone?: string
        }
        Returns: string
      }
      save_calendar_connection: {
        Args: {
          p_calendar_id: string
          p_ciphertext: string
          p_provider: string
          p_team_id: string
        }
        Returns: string
      }
      save_calendar_event_link: {
        Args: {
          p_connection_id: string
          p_event_id: string
          p_external_id: string
          p_external_updated_at: string
          p_hub_updated_at: string
        }
        Returns: undefined
      }
      save_client: {
        Args: {
          p_archived?: boolean
          p_client_id?: string
          p_name: string
          p_team_id: string
        }
        Returns: string
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
      save_home_office_schedule: {
        Args: { p_anchor_week: string; p_holidays?: Json; p_member_ids: string[]; p_reminder_time?: string; p_team_id: string; p_timezone?: string }
        Returns: undefined
      }
      save_meeting_documents: {
        Args: {
          p_agenda: string
          p_event_id: string
          p_expected_version?: number
          p_minutes: string
        }
        Returns: undefined
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
      save_shift: {
        Args: {
          p_cancelled?: boolean
          p_ends_at: string
          p_expected_version?: number
          p_label: string
          p_shift_id?: string
          p_starts_at: string
          p_team_id: string
          p_user_id: string
        }
        Returns: string
      }
      save_standup: {
        Args: {
          p_accomplished: string
          p_blockers: string
          p_kind: string
          p_mood?: string
          p_period_on: string
          p_planned: string
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
      save_team_date: {
        Args: {
          p_date_id?: string
          p_delete?: boolean
          p_happens_on: string
          p_label: string
          p_recurs_yearly?: boolean
          p_team_id: string
        }
        Returns: string
      }
      save_team_note: {
        Args: {
          p_archived?: boolean
          p_body: string
          p_expected_version?: number
          p_note_id?: string
          p_team_id: string
          p_title: string
        }
        Returns: string
      }
      save_work_schedule: {
        Args: { p_daily_minutes: number; p_team_id: string; p_timezone?: string; p_user_id: string; p_workdays_mask: number }
        Returns: undefined
      }
      search_channel_messages: {
        Args: {
          p_before_ordinal?: number
          p_channel_id: string
          p_query: string
        }
        Returns: {
          author_id: string
          body: string
          channel_id: string
          client_id: string
          created_at: string
          deleted_at: string | null
          id: string
          ordinal: number
          reply_to: string | null
          source: string
          team_id: string
          updated_at: string
          webhook_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      send_message: {
        Args: { p_body: string; p_channel_id: string; p_client_id: string }
        Returns: string
      }
      send_rich_message: {
        Args: {
          p_attachment_ids?: string[]
          p_body: string
          p_channel_id: string
          p_client_id: string
          p_mention_channel?: boolean
          p_mention_ids?: string[]
          p_reply_to?: string
        }
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
      set_incoming_webhook: {
        Args: { p_enabled: boolean; p_webhook_id: string }
        Returns: undefined
      }
      set_project_client: {
        Args: { p_client_id?: string; p_project_id: string }
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
      set_time_goal: {
        Args: {
          p_forgotten_after_minutes?: number
          p_team_id: string
          p_user_id: string
          p_weekly_minutes: number
        }
        Returns: undefined
      }
      skip_work_schedule_setup: {
        Args: { p_team_id: string }
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
      unregister_push_subscription: {
        Args: { p_endpoint: string }
        Returns: undefined
      }
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
