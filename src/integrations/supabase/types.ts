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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_sessions: {
        Row: {
          admin_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          last_activity: string | null
          session_token: string | null
          supabase_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          last_activity?: string | null
          session_token?: string | null
          supabase_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          last_activity?: string | null
          session_token?: string | null
          supabase_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login_at: string | null
          login_count: number | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          login_count?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          login_count?: number | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          arbiter_id: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string | null
          password: string | null
          permissions: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          arbiter_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          password?: string | null
          permissions?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          arbiter_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          password?: string | null
          permissions?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      arbiters: {
        Row: {
          address: string | null
          arbiter_category: string | null
          arbiter_id: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          fide_id: string | null
          first_name: string | null
          id: string
          is_active: boolean | null
          last_name: string | null
          licensed_status: string | null
          password: string | null
          password_hash: string | null
          phone: string | null
          profiles_id: string | null
          rating: number | null
          role: string | null
          state: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          zone: string | null
          zone_id: string | null
        }
        Insert: {
          address?: string | null
          arbiter_category?: string | null
          arbiter_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          fide_id?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          licensed_status?: string | null
          password?: string | null
          password_hash?: string | null
          phone?: string | null
          profiles_id?: string | null
          rating?: number | null
          role?: string | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          zone?: string | null
          zone_id?: string | null
        }
        Update: {
          address?: string | null
          arbiter_category?: string | null
          arbiter_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          fide_id?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string | null
          licensed_status?: string | null
          password?: string | null
          password_hash?: string | null
          phone?: string | null
          profiles_id?: string | null
          rating?: number | null
          role?: string | null
          state?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          zone?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arbiters_profiles_id_fkey"
            columns: ["profiles_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbiters_profiles_id_fkey"
            columns: ["profiles_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbiters_profiles_id_fkey"
            columns: ["profiles_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbiters_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      arbiters_events: {
        Row: {
          arbiters: string | null
          created_at: string | null
          description: string | null
          event_date: string | null
          event_name: string
          event_type: string | null
          id: string
          location: string | null
          registration_url: string | null
        }
        Insert: {
          arbiters?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          event_name: string
          event_type?: string | null
          id?: string
          location?: string | null
          registration_url?: string | null
        }
        Update: {
          arbiters?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          event_name?: string
          event_type?: string | null
          id?: string
          location?: string | null
          registration_url?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          device_info: Json | null
          email: string | null
          event: string
          id: string
          ip_address: string | null
          status: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          device_info?: Json | null
          email?: string | null
          event: string
          id?: string
          ip_address?: string | null
          status: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          device_info?: Json | null
          email?: string | null
          event?: string
          id?: string
          ip_address?: string | null
          status?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      awards: {
        Row: {
          arbiter_id: string
          award_category: string | null
          award_name: string
          award_year: number
          created_at: string | null
          description: string | null
          id: string
          issuing_organization: string | null
        }
        Insert: {
          arbiter_id: string
          award_category?: string | null
          award_name: string
          award_year: number
          created_at?: string | null
          description?: string | null
          id?: string
          issuing_organization?: string | null
        }
        Update: {
          arbiter_id?: string
          award_category?: string | null
          award_name?: string
          award_year?: number
          created_at?: string | null
          description?: string | null
          id?: string
          issuing_organization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awards_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiters"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          candidate_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          posted_at: string | null
          title: string
          video_url: string
        }
        Insert: {
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          posted_at?: string | null
          title: string
          video_url: string
        }
        Update: {
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          posted_at?: string | null
          title?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "arbiters"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_documents: {
        Row: {
          candidate_id: string
          created_at: string | null
          doc_type: Database["public"]["Enums"]["document_type"]
          file_url: string
          id: string
          updated_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          doc_type: Database["public"]["Enums"]["document_type"]
          file_url: string
          id?: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          doc_type?: Database["public"]["Enums"]["document_type"]
          file_url?: string
          id?: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          achievements: string | null
          bio: string | null
          created_at: string | null
          election_id: string
          fide_title: string | null
          id: string
          manifesto: string | null
          photo_url: string | null
          position_id: string
          status: Database["public"]["Enums"]["candidate_status"]
          updated_at: string | null
          user_id: string
          video_url: string | null
          zone: string | null
        }
        Insert: {
          achievements?: string | null
          bio?: string | null
          created_at?: string | null
          election_id: string
          fide_title?: string | null
          id?: string
          manifesto?: string | null
          photo_url?: string | null
          position_id: string
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string | null
          user_id: string
          video_url?: string | null
          zone?: string | null
        }
        Update: {
          achievements?: string | null
          bio?: string | null
          created_at?: string | null
          election_id?: string
          fide_title?: string | null
          id?: string
          manifesto?: string | null
          photo_url?: string | null
          position_id?: string
          status?: Database["public"]["Enums"]["candidate_status"]
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel: string | null
          content: string | null
          created_at: string | null
          duration: number | null
          edited_at: string | null
          encrypted: boolean | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          group_id: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          message: string | null
          message_type: string | null
          read_by: string[] | null
          recipient_id: string | null
          reply_to: string | null
          room_id: string | null
          sender_id: string
          updated_at: string | null
          voice_transcription: string | null
        }
        Insert: {
          channel?: string | null
          content?: string | null
          created_at?: string | null
          duration?: number | null
          edited_at?: string | null
          encrypted?: boolean | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          group_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message?: string | null
          message_type?: string | null
          read_by?: string[] | null
          recipient_id?: string | null
          reply_to?: string | null
          room_id?: string | null
          sender_id: string
          updated_at?: string | null
          voice_transcription?: string | null
        }
        Update: {
          channel?: string | null
          content?: string | null
          created_at?: string | null
          duration?: number | null
          edited_at?: string | null
          encrypted?: boolean | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          group_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message?: string | null
          message_type?: string | null
          read_by?: string[] | null
          recipient_id?: string | null
          reply_to?: string | null
          room_id?: string | null
          sender_id?: string
          updated_at?: string | null
          voice_transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "arbiters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          direct_message_with: string | null
          id: string
          is_direct_message: boolean | null
          is_private: boolean | null
          logo_url: string | null
          members: string[] | null
          moderators: string[] | null
          name: string
          room_type: string
          unread_count: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          direct_message_with?: string | null
          id?: string
          is_direct_message?: boolean | null
          is_private?: boolean | null
          logo_url?: string | null
          members?: string[] | null
          moderators?: string[] | null
          name: string
          room_type: string
          unread_count?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          direct_message_with?: string | null
          id?: string
          is_direct_message?: boolean | null
          is_private?: boolean | null
          logo_url?: string | null
          members?: string[] | null
          moderators?: string[] | null
          name?: string
          room_type?: string
          unread_count?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_direct_message_with_fkey"
            columns: ["direct_message_with"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_direct_message_with_fkey"
            columns: ["direct_message_with"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_direct_message_with_fkey"
            columns: ["direct_message_with"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_muted: boolean
          is_pinned: boolean
          last_message: string | null
          last_message_time: string | null
          last_sender_id: string | null
          name: string | null
          type: Database["public"]["Enums"]["chat_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id: string
          is_muted?: boolean
          is_pinned?: boolean
          last_message?: string | null
          last_message_time?: string | null
          last_sender_id?: string | null
          name?: string | null
          type: Database["public"]["Enums"]["chat_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_muted?: boolean
          is_pinned?: boolean
          last_message?: string | null
          last_message_time?: string | null
          last_sender_id?: string | null
          name?: string | null
          type?: Database["public"]["Enums"]["chat_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "arbiters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_last_sender_id_fkey"
            columns: ["last_sender_id"]
            isOneToOne: false
            referencedRelation: "arbiters"
            referencedColumns: ["id"]
          },
        ]
      }
      committees: {
        Row: {
          chair_account_id: string | null
          chairman_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          meeting_location: string | null
          meeting_schedule: string | null
          member_ids: string[] | null
          members: string[] | null
          name: string
          next_meeting_date: string | null
          purpose: string | null
          secretary_id: string | null
          updated_at: string | null
        }
        Insert: {
          chair_account_id?: string | null
          chairman_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          meeting_location?: string | null
          meeting_schedule?: string | null
          member_ids?: string[] | null
          members?: string[] | null
          name: string
          next_meeting_date?: string | null
          purpose?: string | null
          secretary_id?: string | null
          updated_at?: string | null
        }
        Update: {
          chair_account_id?: string | null
          chairman_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          meeting_location?: string | null
          meeting_schedule?: string | null
          member_ids?: string[] | null
          members?: string[] | null
          name?: string
          next_meeting_date?: string | null
          purpose?: string | null
          secretary_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committees_chair_account_id_fkey"
            columns: ["chair_account_id"]
            isOneToOne: false
            referencedRelation: "arbiters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_chairman_id_fkey"
            columns: ["chairman_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_chairman_id_fkey"
            columns: ["chairman_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_chairman_id_fkey"
            columns: ["chairman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cookie_consent_logs: {
        Row: {
          analytics_accepted: boolean | null
          consent_version: string | null
          created_at: string | null
          email: string | null
          essential_accepted: boolean | null
          id: string
          ip_address: string | null
          marketing_accepted: boolean | null
          preferences_accepted: boolean | null
          user_agent: string | null
        }
        Insert: {
          analytics_accepted?: boolean | null
          consent_version?: string | null
          created_at?: string | null
          email?: string | null
          essential_accepted?: boolean | null
          id?: string
          ip_address?: string | null
          marketing_accepted?: boolean | null
          preferences_accepted?: boolean | null
          user_agent?: string | null
        }
        Update: {
          analytics_accepted?: boolean | null
          consent_version?: string | null
          created_at?: string | null
          email?: string | null
          essential_accepted?: boolean | null
          id?: string
          ip_address?: string | null
          marketing_accepted?: boolean | null
          preferences_accepted?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      disciplinary_cases: {
        Row: {
          arbiter_id: string | null
          case_number: string
          created_at: string | null
          date_reported: string | null
          description: string | null
          id: string
          outcome: string | null
          penalty: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          arbiter_id?: string | null
          case_number: string
          created_at?: string | null
          date_reported?: string | null
          description?: string | null
          id?: string
          outcome?: string | null
          penalty?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          arbiter_id?: string | null
          case_number?: string
          created_at?: string | null
          date_reported?: string | null
          description?: string | null
          id?: string
          outcome?: string | null
          penalty?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_cases_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_cases_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_cases_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      downloads: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          file_type: string | null
          file_url: string
          id: string
          is_published: boolean | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_published?: boolean | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_published?: boolean | null
          title?: string
        }
        Relationships: []
      }
      election_announcements: {
        Row: {
          body: string
          created_at: string | null
          created_by: string
          election_id: string
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by: string
          election_id: string
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string
          election_id?: string
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "election_announcements_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      elections: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          eligible_voter_categories: string[] | null
          end_time: string | null
          id: string
          start_time: string | null
          status: Database["public"]["Enums"]["election_status"]
          title: string
          type: Database["public"]["Enums"]["election_type"]
          updated_at: string | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          eligible_voter_categories?: string[] | null
          end_time?: string | null
          id?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["election_status"]
          title: string
          type?: Database["public"]["Enums"]["election_type"]
          updated_at?: string | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          eligible_voter_categories?: string[] | null
          end_time?: string | null
          id?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["election_status"]
          title?: string
          type?: Database["public"]["Enums"]["election_type"]
          updated_at?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          agenda: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          current_attendees: number | null
          description: string | null
          end_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_public: boolean | null
          materials_url: string | null
          max_attendees: number | null
          organizer_id: string | null
          registration_deadline: string | null
          registration_fee: number | null
          requirements: string[] | null
          requires_registration: boolean | null
          start_date: string
          state: string | null
          title: string
          updated_at: string | null
          venue: string | null
        }
        Insert: {
          agenda?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          current_attendees?: number | null
          description?: string | null
          end_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          is_public?: boolean | null
          materials_url?: string | null
          max_attendees?: number | null
          organizer_id?: string | null
          registration_deadline?: string | null
          registration_fee?: number | null
          requirements?: string[] | null
          requires_registration?: boolean | null
          start_date: string
          state?: string | null
          title: string
          updated_at?: string | null
          venue?: string | null
        }
        Update: {
          agenda?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          current_attendees?: number | null
          description?: string | null
          end_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_public?: boolean | null
          materials_url?: string | null
          max_attendees?: number | null
          organizer_id?: string | null
          registration_deadline?: string | null
          registration_fee?: number | null
          requirements?: string[] | null
          requires_registration?: boolean | null
          start_date?: string
          state?: string | null
          title?: string
          updated_at?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      excos: {
        Row: {
          bio: string | null
          created_at: string | null
          email: string | null
          fide_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          order_index: number | null
          phone: string | null
          photo_url: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          email?: string | null
          fide_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          order_index?: number | null
          phone?: string | null
          photo_url?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          email?: string | null
          fide_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          phone?: string | null
          photo_url?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          active: boolean | null
          answer: string
          category: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          order_index: number | null
          question: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          answer: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          question: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          answer?: string
          category?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          question?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gallery: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          event_date: string | null
          event_id: string | null
          id: string
          image_height: number | null
          image_url: string
          image_width: number | null
          is_featured: boolean | null
          is_published: boolean | null
          like_count: number | null
          location: string | null
          media_type: string | null
          thumbnail_url: string | null
          title: string
          view_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          event_id?: string | null
          id?: string
          image_height?: number | null
          image_url: string
          image_width?: number | null
          is_featured?: boolean | null
          is_published?: boolean | null
          like_count?: number | null
          location?: string | null
          media_type?: string | null
          thumbnail_url?: string | null
          title: string
          view_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          event_id?: string | null
          id?: string
          image_height?: number | null
          image_url?: string
          image_width?: number | null
          is_featured?: boolean | null
          is_published?: boolean | null
          like_count?: number | null
          location?: string | null
          media_type?: string | null
          thumbnail_url?: string | null
          title?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "gallery_events"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_downloads: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          device_id: string | null
          download_format: string | null
          downloaded_at: string | null
          gallery_id: string
          id: string
          ip_address: unknown
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          device_id?: string | null
          download_format?: string | null
          downloaded_at?: string | null
          gallery_id: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          device_id?: string | null
          download_format?: string | null
          downloaded_at?: string | null
          gallery_id?: string
          id?: string
          ip_address?: unknown
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_downloads_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_events: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          event_date: string | null
          id: string
          is_published: boolean | null
          location: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          is_published?: boolean | null
          location?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          is_published?: boolean | null
          location?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gallery_likes: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          device_id: string | null
          gallery_id: string
          id: string
          ip_address: unknown
          liked_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          device_id?: string | null
          gallery_id: string
          id?: string
          ip_address?: unknown
          liked_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          device_id?: string | null
          gallery_id?: string
          id?: string
          ip_address?: unknown
          liked_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_likes_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_views: {
        Row: {
          device_id: string
          first_view: string | null
          gallery_id: string
          id: string
          ip_address: unknown
          language: string | null
          last_view: string | null
          screen_height: number | null
          screen_width: number | null
          timezone: string | null
          user_agent: string | null
          view_count: number | null
        }
        Insert: {
          device_id: string
          first_view?: string | null
          gallery_id: string
          id?: string
          ip_address?: unknown
          language?: string | null
          last_view?: string | null
          screen_height?: number | null
          screen_width?: number | null
          timezone?: string | null
          user_agent?: string | null
          view_count?: number | null
        }
        Update: {
          device_id?: string
          first_view?: string | null
          gallery_id?: string
          id?: string
          ip_address?: unknown
          language?: string | null
          last_view?: string | null
          screen_height?: number | null
          screen_width?: number | null
          timezone?: string | null
          user_agent?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_views_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          is_muted: boolean | null
          joined_at: string | null
          last_active_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          last_active_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          last_active_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_codes: {
        Row: {
          admin_id: string | null
          code_hash: string
          created_at: string | null
          expires_at: string
          failed_attempts: number | null
          id: string
          used_at: string | null
        }
        Insert: {
          admin_id?: string | null
          code_hash: string
          created_at?: string | null
          expires_at: string
          failed_attempts?: number | null
          id?: string
          used_at?: string | null
        }
        Update: {
          admin_id?: string | null
          code_hash?: string
          created_at?: string | null
          expires_at?: string
          failed_attempts?: number | null
          id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_codes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          file_name: string | null
          file_url: string | null
          id: string
          is_deleted: boolean
          is_edited: boolean
          reactions: Json
          read_by: string[]
          reply_to_message_id: string | null
          sender_id: string
          timestamp: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          chat_id: string
          content?: string | null
          file_name?: string | null
          file_url?: string | null
          id: string
          is_deleted?: boolean
          is_edited?: boolean
          reactions?: Json
          read_by?: string[]
          reply_to_message_id?: string | null
          sender_id: string
          timestamp?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          chat_id?: string
          content?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          reactions?: Json
          read_by?: string[]
          reply_to_message_id?: string | null
          sender_id?: string
          timestamp?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "arbiters"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author_id: string | null
          body: string
          category: string | null
          category_id: string | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          published: boolean | null
          published_at: string | null
          reading_time: number | null
          slug: string | null
          source: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          author_id?: string | null
          body?: string
          category?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          published_at?: string | null
          reading_time?: number | null
          slug?: string | null
          source?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          author_id?: string | null
          body?: string
          category?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          published?: boolean | null
          published_at?: string | null
          reading_time?: number | null
          slug?: string | null
          source?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "news_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "news_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      news_categories: {
        Row: {
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          subscribed_at: string | null
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          subscribed_at?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          account_id: string | null
          action_required: boolean | null
          action_type: Database["public"]["Enums"]["action_type"] | null
          action_url: string | null
          arbiter_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          notification_type: string | null
          read: boolean | null
          recipient_id: string | null
          related_id: string | null
          sender_id: string | null
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          action_required?: boolean | null
          action_type?: Database["public"]["Enums"]["action_type"] | null
          action_url?: string | null
          arbiter_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string | null
          read?: boolean | null
          recipient_id?: string | null
          related_id?: string | null
          sender_id?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          action_required?: boolean | null
          action_type?: Database["public"]["Enums"]["action_type"] | null
          action_url?: string | null
          arbiter_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string | null
          read?: boolean | null
          recipient_id?: string | null
          related_id?: string | null
          sender_id?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      obituaries: {
        Row: {
          arbiter_id: string | null
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          date_of_death: string
          id: string
          image_url: string | null
          name: string
          tribute: string | null
        }
        Insert: {
          arbiter_id?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          date_of_death: string
          id?: string
          image_url?: string | null
          name: string
          tribute?: string | null
        }
        Update: {
          arbiter_id?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          date_of_death?: string
          id?: string
          image_url?: string | null
          name?: string
          tribute?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obituaries_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiters"
            referencedColumns: ["id"]
          },
        ]
      }
      panels_2022_2023: {
        Row: {
          arbiter_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          panel_category: string | null
        }
        Insert: {
          arbiter_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          panel_category?: string | null
        }
        Update: {
          arbiter_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          panel_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "panels_2022_2023_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiters"
            referencedColumns: ["id"]
          },
        ]
      }
      panels_2024_2025: {
        Row: {
          arbiter_id: string
          color: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          arbiter_id: string
          color: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          arbiter_id?: string
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "panels_2024_2025_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiters"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_due: {
        Row: {
          amount: number
          arbiter_id: string
          created_at: string | null
          due_date: string
          id: string
          is_paid: boolean | null
          paid_date: string | null
          payment_id: string | null
          payment_type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          arbiter_id: string
          created_at?: string | null
          due_date: string
          id?: string
          is_paid?: boolean | null
          paid_date?: string | null
          payment_id?: string | null
          payment_type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          arbiter_id?: string
          created_at?: string | null
          due_date?: string
          id?: string
          is_paid?: boolean | null
          paid_date?: string | null
          payment_id?: string | null
          payment_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_due_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_due_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_due_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_due_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_due_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_id: string | null
          amount: number | null
          arbiter_id: string | null
          assignment_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          due_date: string | null
          id: string
          item: string | null
          paid_at: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          payment_type: string | null
          receipt_upload_date: string | null
          receipt_url: string | null
          status: string | null
          tournament_id: string | null
          transaction_reference: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number | null
          arbiter_id?: string | null
          assignment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          item?: string | null
          paid_at?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_type?: string | null
          receipt_upload_date?: string | null
          receipt_url?: string | null
          status?: string | null
          tournament_id?: string | null
          transaction_reference?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number | null
          arbiter_id?: string | null
          assignment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          item?: string | null
          paid_at?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_type?: string | null
          receipt_upload_date?: string | null
          receipt_url?: string | null
          status?: string | null
          tournament_id?: string | null
          transaction_reference?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignment_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "tournament_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "upcoming_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      paystack_transactions: {
        Row: {
          amount: number
          authorization_code: string | null
          channel: string | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          id: string
          last_four: string | null
          paid_at: string | null
          payment_id: string | null
          reference: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          authorization_code?: string | null
          channel?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          id?: string
          last_four?: string | null
          paid_at?: string | null
          payment_id?: string | null
          reference: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          authorization_code?: string | null
          channel?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          id?: string
          last_four?: string | null
          paid_at?: string | null
          payment_id?: string | null
          reference?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paystack_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paystack_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string | null
          display_order: number | null
          election_id: string
          id: string
          max_votes: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          election_id: string
          id?: string
          max_votes?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          election_id?: string
          id?: string
          max_votes?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          a_l: string | null
          address: string | null
          arbiter_level: Database["public"]["Enums"]["arbiter_level"] | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          first_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_name: string
          license_expiry: string | null
          license_number: string | null
          phone: string | null
          rating: number | null
          role: string | null
          state: string | null
          tournaments_officiated: number | null
          updated_at: string | null
          years_experience: number | null
          zone: Database["public"]["Enums"]["zone_type"] | null
        }
        Insert: {
          a_l?: string | null
          address?: string | null
          arbiter_level?: Database["public"]["Enums"]["arbiter_level"] | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          first_name: string
          gender?: string | null
          id: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_name: string
          license_expiry?: string | null
          license_number?: string | null
          phone?: string | null
          rating?: number | null
          role?: string | null
          state?: string | null
          tournaments_officiated?: number | null
          updated_at?: string | null
          years_experience?: number | null
          zone?: Database["public"]["Enums"]["zone_type"] | null
        }
        Update: {
          a_l?: string | null
          address?: string | null
          arbiter_level?: Database["public"]["Enums"]["arbiter_level"] | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_name?: string
          license_expiry?: string | null
          license_number?: string | null
          phone?: string | null
          rating?: number | null
          role?: string | null
          state?: string | null
          tournaments_officiated?: number | null
          updated_at?: string | null
          years_experience?: number | null
          zone?: Database["public"]["Enums"]["zone_type"] | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          author_id: string | null
          category: string
          created_at: string | null
          description: string | null
          download_count: number | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          author_id?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_assignments: {
        Row: {
          accommodation_provided: boolean | null
          arbiter_id: string
          arbiter_role: string | null
          assigned_at: string | null
          assigned_by: string | null
          assignment_status:
            | Database["public"]["Enums"]["assignment_status"]
            | null
          compensation: number | null
          created_at: string | null
          id: string
          notes: string | null
          responded_at: string | null
          role: string
          tournament_id: string
          tournament_name: string | null
          travel_allowance: number | null
          updated_at: string | null
        }
        Insert: {
          accommodation_provided?: boolean | null
          arbiter_id: string
          arbiter_role?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_status?:
            | Database["public"]["Enums"]["assignment_status"]
            | null
          compensation?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          responded_at?: string | null
          role: string
          tournament_id: string
          tournament_name?: string | null
          travel_allowance?: number | null
          updated_at?: string | null
        }
        Update: {
          accommodation_provided?: boolean | null
          arbiter_id?: string
          arbiter_role?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          assignment_status?:
            | Database["public"]["Enums"]["assignment_status"]
            | null
          compensation?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          responded_at?: string | null
          role?: string
          tournament_id?: string
          tournament_name?: string | null
          travel_allowance?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_assignments_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "upcoming_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_evaluations: {
        Row: {
          areas_for_improvement: string | null
          communication_rating: number | null
          equipment_rating: number | null
          evaluator_id: string
          id: string
          organization_rating: number | null
          overall_rating: number | null
          positive_feedback: string | null
          recommendations: string | null
          submitted_at: string | null
          time_management_rating: number | null
          tournament_id: string
          venue_rating: number | null
          would_officiate_again: boolean | null
        }
        Insert: {
          areas_for_improvement?: string | null
          communication_rating?: number | null
          equipment_rating?: number | null
          evaluator_id: string
          id?: string
          organization_rating?: number | null
          overall_rating?: number | null
          positive_feedback?: string | null
          recommendations?: string | null
          submitted_at?: string | null
          time_management_rating?: number | null
          tournament_id: string
          venue_rating?: number | null
          would_officiate_again?: boolean | null
        }
        Update: {
          areas_for_improvement?: string | null
          communication_rating?: number | null
          equipment_rating?: number | null
          evaluator_id?: string
          id?: string
          organization_rating?: number | null
          overall_rating?: number | null
          positive_feedback?: string | null
          recommendations?: string | null
          submitted_at?: string | null
          time_management_rating?: number | null
          tournament_id?: string
          venue_rating?: number | null
          would_officiate_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_evaluations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_evaluations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "upcoming_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          chief_arbiter_id: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          current_participants: number | null
          deputy_arbiters: string[] | null
          description: string | null
          end_date: string | null
          entry_fee: number | null
          id: string
          is_fide_rated: boolean | null
          is_rated: boolean | null
          location: string | null
          max_participants: number | null
          name: string
          organizer_id: string | null
          poster_url: string | null
          prize_fund: number | null
          registration_deadline: string | null
          requirements: string[] | null
          rounds: number | null
          start_date: string | null
          state: string | null
          status: string | null
          time_control: string | null
          tournament_status:
            | Database["public"]["Enums"]["tournament_status"]
            | null
          updated_at: string | null
          venue: string | null
          website_url: string | null
        }
        Insert: {
          chief_arbiter_id?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          current_participants?: number | null
          deputy_arbiters?: string[] | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          id?: string
          is_fide_rated?: boolean | null
          is_rated?: boolean | null
          location?: string | null
          max_participants?: number | null
          name: string
          organizer_id?: string | null
          poster_url?: string | null
          prize_fund?: number | null
          registration_deadline?: string | null
          requirements?: string[] | null
          rounds?: number | null
          start_date?: string | null
          state?: string | null
          status?: string | null
          time_control?: string | null
          tournament_status?:
            | Database["public"]["Enums"]["tournament_status"]
            | null
          updated_at?: string | null
          venue?: string | null
          website_url?: string | null
        }
        Update: {
          chief_arbiter_id?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          current_participants?: number | null
          deputy_arbiters?: string[] | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number | null
          id?: string
          is_fide_rated?: boolean | null
          is_rated?: boolean | null
          location?: string | null
          max_participants?: number | null
          name?: string
          organizer_id?: string | null
          poster_url?: string | null
          prize_fund?: number | null
          registration_deadline?: string | null
          requirements?: string[] | null
          rounds?: number | null
          start_date?: string | null
          state?: string | null
          status?: string | null
          time_control?: string | null
          tournament_status?:
            | Database["public"]["Enums"]["tournament_status"]
            | null
          updated_at?: string | null
          venue?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_chief_arbiter_id_fkey"
            columns: ["chief_arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_chief_arbiter_id_fkey"
            columns: ["chief_arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_chief_arbiter_id_fkey"
            columns: ["chief_arbiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unread_messages: {
        Row: {
          id: string
          last_read_at: string | null
          room_id: string | null
          unread_count: number | null
          user_id: string | null
        }
        Insert: {
          id?: string
          last_read_at?: string | null
          room_id?: string | null
          unread_count?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string
          last_read_at?: string | null
          room_id?: string | null
          unread_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unread_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unread_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unread_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unread_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          email: string
          id: string
          language: string | null
          marketing_emails: boolean | null
          notifications_enabled: boolean | null
          preferences_json: Json | null
          theme: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          language?: string | null
          marketing_emails?: boolean | null
          notifications_enabled?: boolean | null
          preferences_json?: Json | null
          theme?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          language?: string | null
          marketing_emails?: boolean | null
          notifications_enabled?: boolean | null
          preferences_json?: Json | null
          theme?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string
          id: string
          thumbnail_url: string | null
          title: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          thumbnail_url?: string | null
          title?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          thumbnail_url?: string | null
          title?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      vote_audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          details: Json | null
          election_id: string
          id: string
          ip_address: unknown
          timestamp: string | null
          user_agent: string | null
          voter_id_hashed: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          details?: Json | null
          election_id: string
          id?: string
          ip_address?: unknown
          timestamp?: string | null
          user_agent?: string | null
          voter_id_hashed?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          details?: Json | null
          election_id?: string
          id?: string
          ip_address?: unknown
          timestamp?: string | null
          user_agent?: string | null
          voter_id_hashed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vote_audit_log_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_receipts: {
        Row: {
          created_at: string | null
          election_id: string
          id: string
          receipt_hash: string
          voter_id: string
        }
        Insert: {
          created_at?: string | null
          election_id: string
          id?: string
          receipt_hash: string
          voter_id: string
        }
        Update: {
          created_at?: string | null
          election_id?: string
          id?: string
          receipt_hash?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_receipts_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          candidate_id: string
          created_at: string | null
          device_fingerprint: string | null
          election_id: string
          id: string
          ip_address: unknown
          position_id: string
          vote_hash: string
          voter_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          device_fingerprint?: string | null
          election_id: string
          id?: string
          ip_address?: unknown
          position_id: string
          vote_hash: string
          voter_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          device_fingerprint?: string | null
          election_id?: string
          id?: string
          ip_address?: unknown
          position_id?: string
          vote_hash?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      zonal_representatives: {
        Row: {
          appointed_at: string | null
          arbiter_id: string | null
          fide_id: string | null
          id: string
          is_active: boolean | null
          zone_id: string | null
        }
        Insert: {
          appointed_at?: string | null
          arbiter_id?: string | null
          fide_id?: string | null
          id?: string
          is_active?: boolean | null
          zone_id?: string | null
        }
        Update: {
          appointed_at?: string | null
          arbiter_id?: string | null
          fide_id?: string | null
          id?: string
          is_active?: boolean | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zonal_representatives_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zonal_representatives_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          states: string[]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          states: string[]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          states?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      arbiter_dashboard_stats: {
        Row: {
          accepted_assignments: number | null
          arbiter_level: Database["public"]["Enums"]["arbiter_level"] | null
          completed_assignments: number | null
          first_name: string | null
          id: string | null
          last_name: string | null
          pending_assignments: number | null
          pending_payments: number | null
          rating: number | null
          total_earnings: number | null
          tournaments_officiated: number | null
          unread_notifications: number | null
        }
        Relationships: []
      }
      arbiter_performance_metrics: {
        Row: {
          arbiter_level: Database["public"]["Enums"]["arbiter_level"] | null
          average_rating: number | null
          completed_assignments: number | null
          completion_rate: number | null
          declined_assignments: number | null
          full_name: string | null
          id: string | null
          total_assignments: number | null
          total_earnings: number | null
          total_evaluations: number | null
          zone: Database["public"]["Enums"]["zone_type"] | null
        }
        Relationships: []
      }
      assignment_details: {
        Row: {
          accommodation_provided: boolean | null
          arbiter_email: string | null
          arbiter_id: string | null
          arbiter_name: string | null
          arbiter_phone: string | null
          assigned_at: string | null
          assigned_by: string | null
          assigned_by_name: string | null
          assignment_status:
            | Database["public"]["Enums"]["assignment_status"]
            | null
          city: string | null
          compensation: number | null
          created_at: string | null
          end_date: string | null
          id: string | null
          notes: string | null
          responded_at: string | null
          role: string | null
          start_date: string | null
          state: string | null
          tournament_id: string | null
          tournament_name: string | null
          travel_allowance: number | null
          updated_at: string | null
          venue: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_assignments_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_assignments_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "upcoming_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_details: {
        Row: {
          chair_account_id: string | null
          chairman_id: string | null
          chairman_name: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          meeting_location: string | null
          meeting_schedule: string | null
          member_count: number | null
          member_ids: string[] | null
          members: string[] | null
          name: string | null
          next_meeting_date: string | null
          purpose: string | null
          secretary_id: string | null
          secretary_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committees_chair_account_id_fkey"
            columns: ["chair_account_id"]
            isOneToOne: false
            referencedRelation: "arbiters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_chairman_id_fkey"
            columns: ["chairman_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_chairman_id_fkey"
            columns: ["chairman_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_chairman_id_fkey"
            columns: ["chairman_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_summary: {
        Row: {
          account_id: string | null
          amount: number | null
          arbiter_id: string | null
          arbiter_name: string | null
          assignment_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          currency: string | null
          description: string | null
          due_date: string | null
          id: string | null
          item: string | null
          paid_at: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          payment_type: string | null
          receipt_url: string | null
          status: string | null
          tournament_id: string | null
          tournament_name: string | null
          transaction_reference: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_arbiter_id_fkey"
            columns: ["arbiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignment_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "tournament_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "upcoming_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_statistics: {
        Row: {
          avg_participants: number | null
          cancelled_tournaments: number | null
          completed_tournaments: number | null
          month: string | null
          ongoing_tournaments: number | null
          total_prize_fund: number | null
          total_tournaments: number | null
        }
        Relationships: []
      }
      upcoming_tournaments: {
        Row: {
          chief_arbiter_id: string | null
          chief_arbiter_name: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          current_participants: number | null
          deputy_arbiters: string[] | null
          description: string | null
          end_date: string | null
          entry_fee: number | null
          id: string | null
          is_fide_rated: boolean | null
          is_rated: boolean | null
          max_participants: number | null
          name: string | null
          organizer_id: string | null
          organizer_name: string | null
          poster_url: string | null
          prize_fund: number | null
          registration_deadline: string | null
          requirements: string[] | null
          rounds: number | null
          start_date: string | null
          state: string | null
          time_control: string | null
          tournament_status:
            | Database["public"]["Enums"]["tournament_status"]
            | null
          updated_at: string | null
          venue: string | null
          website_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_chief_arbiter_id_fkey"
            columns: ["chief_arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_chief_arbiter_id_fkey"
            columns: ["chief_arbiter_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_chief_arbiter_id_fkey"
            columns: ["chief_arbiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "arbiter_dashboard_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "arbiter_performance_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_arbiter_rating: {
        Args: { arbiter_uuid: string }
        Returns: number
      }
      decrement_gallery_like_count: {
        Args: { gallery_id_input: string }
        Returns: undefined
      }
      exec_sql: { Args: { sql_query: string }; Returns: Json }
      generate_slug: { Args: { input: string }; Returns: string }
      generate_vote_hash: {
        Args: {
          candidate_id: string
          election_id: string
          position_id: string
          voter_id: string
        }
        Returns: string
      }
      get_admin_logs: { Args: { log_type?: string }; Returns: Json }
      get_arbiter_activity_summary: {
        Args: { arbiter_uuid: string }
        Returns: {
          average_rating: number
          completed_assignments: number
          next_assignment_date: string
          pending_assignments: number
          pending_payments: number
          total_assignments: number
          total_earnings: number
          tournaments_this_month: number
        }[]
      }
      get_auth_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
        }[]
      }
      get_group_member_count: { Args: { p_group_id: string }; Returns: number }
      get_monthly_tournament_trends: {
        Args: { months_back?: number }
        Returns: {
          completed_tournaments: number
          month: string
          total_participants: number
          total_prize_fund: number
          total_tournaments: number
        }[]
      }
      get_notification_summary: {
        Args: { user_id: string }
        Returns: {
          action_required_notifications: number
          high_priority_notifications: number
          total_notifications: number
          unread_notifications: number
        }[]
      }
      get_or_create_dm_room: {
        Args: { p_other_user_id: string; p_user_id: string }
        Returns: string
      }
      get_schema_tables: {
        Args: never
        Returns: {
          tablename: string
        }[]
      }
      get_table_columns: { Args: { table_name: string }; Returns: Json }
      get_tournament_stats: {
        Args: { arbiter_uuid: string }
        Returns: {
          average_rating: number
          completed_tournaments: number
          pending_assignments: number
          total_tournaments: number
        }[]
      }
      get_unread_count: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: number
      }
      get_unread_notification_count: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_zone_statistics: {
        Args: never
        Returns: {
          active_arbiters: number
          avg_rating: number
          total_arbiters: number
          total_tournaments: number
          zone: Database["public"]["Enums"]["zone_type"]
        }[]
      }
      hash_voter_id: { Args: { voter_id: string }; Returns: string }
      increment_gallery_like_count: {
        Args: { gallery_id_input: string }
        Returns: undefined
      }
      increment_gallery_view_count: {
        Args: { gallery_id_input: string }
        Returns: undefined
      }
      increment_unread_count: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: undefined
      }
      mark_all_notifications_read: {
        Args: { user_id: string }
        Returns: undefined
      }
      mark_messages_as_read: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: undefined
      }
      mark_room_as_read: {
        Args: { p_room_id: string; p_user_id: string }
        Returns: undefined
      }
      refresh_materialized_views: { Args: never; Returns: undefined }
      search_users_for_dm: {
        Args: { p_limit?: number; p_search_query: string }
        Returns: {
          arbiter_category: string
          avatar_url: string
          email: string
          id: string
          name: string
        }[]
      }
      send_notification: {
        Args: {
          action_url_param?: string
          notification_message: string
          notification_title: string
          notification_type_param: Database["public"]["Enums"]["notification_type"]
          recipient_uuid: string
          related_uuid?: string
          sender_uuid: string
        }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
      validate_admin_session: {
        Args: { session_token_input: string }
        Returns: {
          admin_id: string
          email: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      action_type: "Tournament_assignment" | "URL"
      arbiter_level: "National" | "International" | "FIDE" | "Candidate"
      arbiter_role: "member" | "admin" | "superadmin"
      assignment_status: "Pending" | "Accepted" | "Declined" | "Completed"
      audit_action:
        | "vote_cast"
        | "vote_verified"
        | "receipt_generated"
        | "anomaly_detected"
        | "admin_action"
      candidate_status: "pending" | "approved" | "rejected" | "withdrawn"
      chat_type: "one_on_one" | "group" | "broadcast" | "event"
      document_type: "cv" | "credentials" | "manifesto" | "nomination" | "other"
      election_status: "draft" | "scheduled" | "active" | "closed" | "archived"
      election_type: "general" | "special" | "runoff"
      event_type:
        | "Tournament"
        | "Training"
        | "Meeting"
        | "Conference"
        | "Workshop"
      member_role: "owner" | "admin" | "member"
      message_type: "text" | "image" | "file" | "voice"
      notification_type:
        | "Assignment"
        | "Payment"
        | "Tournament"
        | "System"
        | "Committee"
      payment_status:
        | "pending"
        | "paid"
        | "overdue"
        | "cancelled"
        | "processing"
      tournament_status: "Scheduled" | "Ongoing" | "Completed" | "Cancelled"
      zone_type: "North" | "South" | "East" | "West" | "Central" | "FCT"
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
      action_type: ["Tournament_assignment", "URL"],
      arbiter_level: ["National", "International", "FIDE", "Candidate"],
      arbiter_role: ["member", "admin", "superadmin"],
      assignment_status: ["Pending", "Accepted", "Declined", "Completed"],
      audit_action: [
        "vote_cast",
        "vote_verified",
        "receipt_generated",
        "anomaly_detected",
        "admin_action",
      ],
      candidate_status: ["pending", "approved", "rejected", "withdrawn"],
      chat_type: ["one_on_one", "group", "broadcast", "event"],
      document_type: ["cv", "credentials", "manifesto", "nomination", "other"],
      election_status: ["draft", "scheduled", "active", "closed", "archived"],
      election_type: ["general", "special", "runoff"],
      event_type: [
        "Tournament",
        "Training",
        "Meeting",
        "Conference",
        "Workshop",
      ],
      member_role: ["owner", "admin", "member"],
      message_type: ["text", "image", "file", "voice"],
      notification_type: [
        "Assignment",
        "Payment",
        "Tournament",
        "System",
        "Committee",
      ],
      payment_status: ["pending", "paid", "overdue", "cancelled", "processing"],
      tournament_status: ["Scheduled", "Ongoing", "Completed", "Cancelled"],
      zone_type: ["North", "South", "East", "West", "Central", "FCT"],
    },
  },
} as const
