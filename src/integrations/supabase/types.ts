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
      ad_accounts: {
        Row: {
          connection_id: string | null
          created_at: string
          currency: string
          default_owner_id: string | null
          default_pipeline_id: string | null
          external_account_id: string
          id: string
          is_demo: boolean
          is_enabled: boolean
          last_sync_at: string | null
          name: string
          provider: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          currency?: string
          default_owner_id?: string | null
          default_pipeline_id?: string | null
          external_account_id: string
          id?: string
          is_demo?: boolean
          is_enabled?: boolean
          last_sync_at?: string | null
          name: string
          provider: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          currency?: string
          default_owner_id?: string | null
          default_pipeline_id?: string | null
          external_account_id?: string
          id?: string
          is_demo?: boolean
          is_enabled?: boolean
          last_sync_at?: string | null
          name?: string
          provider?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ad_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_accounts_default_pipeline_id_fkey"
            columns: ["default_pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_connections: {
        Row: {
          business_name: string | null
          created_at: string
          created_by: string | null
          credentials_encrypted: string | null
          external_business_id: string | null
          id: string
          is_demo: boolean
          last_error: string | null
          last_sync_at: string | null
          provider: string
          scopes: string[]
          status: string
          token_expires_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          created_by?: string | null
          credentials_encrypted?: string | null
          external_business_id?: string | null
          id?: string
          is_demo?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          provider: string
          scopes?: string[]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          created_by?: string | null
          credentials_encrypted?: string | null
          external_business_id?: string | null
          id?: string
          is_demo?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          provider?: string
          scopes?: string[]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_sync_logs: {
        Row: {
          connection_id: string | null
          finished_at: string | null
          id: string
          message: string | null
          provider: string
          records_synced: number
          started_at: string
          status: string
          technical_details: Json | null
          workspace_id: string
        }
        Insert: {
          connection_id?: string | null
          finished_at?: string | null
          id?: string
          message?: string | null
          provider: string
          records_synced?: number
          started_at?: string
          status: string
          technical_details?: Json | null
          workspace_id: string
        }
        Update: {
          connection_id?: string | null
          finished_at?: string | null
          id?: string
          message?: string | null
          provider?: string
          records_synced?: number
          started_at?: string
          status?: string
          technical_details?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ad_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_sync_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_allowlist: {
        Row: {
          added_by_user_id: string | null
          created_at: string
          email: string
          id: string
          notes: string | null
        }
        Insert: {
          added_by_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          notes?: string | null
        }
        Update: {
          added_by_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      ai_action_audit: {
        Row: {
          action_id: string | null
          action_type: string
          after_snapshot: Json | null
          before_snapshot: Json | null
          created_at: string
          id: string
          result: string
          target_id: string | null
          target_table: string | null
          undo_available: boolean
          undone_at: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action_id?: string | null
          action_type: string
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          created_at?: string
          id?: string
          result?: string
          target_id?: string | null
          target_table?: string | null
          undo_available?: boolean
          undone_at?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action_id?: string | null
          action_type?: string
          after_snapshot?: Json | null
          before_snapshot?: Json | null
          created_at?: string
          id?: string
          result?: string
          target_id?: string | null
          target_table?: string | null
          undo_available?: boolean
          undone_at?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_audit_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "ai_proposed_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          context: Json
          created_at: string
          id: string
          route: string | null
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          route?: string | null
          title?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          route?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          message_id: string
          rating: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id: string
          rating: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id?: string
          rating?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_lead_scores: {
        Row: {
          band: string | null
          calculated_at: string
          confidence: string
          created_at: string
          data_used: Json
          factors: Json
          id: string
          lead_id: string
          model: string | null
          rationale: string | null
          score: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          band?: string | null
          calculated_at?: string
          confidence?: string
          created_at?: string
          data_used?: Json
          factors?: Json
          id?: string
          lead_id: string
          model?: string | null
          rationale?: string | null
          score?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          band?: string | null
          calculated_at?: string
          confidence?: string
          created_at?: string
          data_used?: Json
          factors?: Json
          id?: string
          lead_id?: string
          model?: string | null
          rationale?: string | null
          score?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          capability: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          model: string | null
          role: string
          structured: Json
          tokens: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          capability?: string | null
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          model?: string | null
          role: string
          structured?: Json
          tokens?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          capability?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: string
          structured?: Json
          tokens?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_proposed_actions: {
        Row: {
          action_type: string
          changes: Json
          completed_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          conversation_id: string | null
          created_at: string
          error: string | null
          id: string
          message_id: string | null
          payload: Json
          status: string
          summary: string | null
          target_id: string | null
          target_table: string | null
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          action_type: string
          changes?: Json
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          message_id?: string | null
          payload?: Json
          status?: string
          summary?: string | null
          target_id?: string | null
          target_table?: string | null
          title: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          action_type?: string
          changes?: Json
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          message_id?: string | null
          payload?: Json
          status?: string
          summary?: string | null
          target_id?: string | null
          target_table?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_proposed_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_proposed_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          capability: string
          created_at: string
          error_code: string | null
          id: string
          model: string | null
          success: boolean
          tokens: number
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          capability: string
          created_at?: string
          error_code?: string | null
          id?: string
          model?: string | null
          success?: boolean
          tokens?: number
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          capability?: string
          created_at?: string
          error_code?: string | null
          id?: string
          model?: string | null
          success?: boolean
          tokens?: number
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      appointment_types: {
        Row: {
          availability_schedule_id: string | null
          booking_page_id: string | null
          buffer_after_minutes: number
          buffer_before_minutes: number
          cancel_cutoff_minutes: number
          capacity: number
          color: string
          created_at: string
          created_by: string | null
          description: string
          duration_minutes: number
          host_user_id: string | null
          id: string
          is_published: boolean
          kind: string
          location_type: string
          location_value: string | null
          max_days_ahead: number
          max_per_day: number | null
          max_reschedules: number
          min_notice_minutes: number
          name: string
          position: number
          questions: Json
          reminder_sequence: Json
          require_confirmation: boolean
          reschedule_cutoff_minutes: number
          slot_interval_minutes: number
          slug: string | null
          team_id: string | null
          timezone: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          availability_schedule_id?: string | null
          booking_page_id?: string | null
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          cancel_cutoff_minutes?: number
          capacity?: number
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          duration_minutes?: number
          host_user_id?: string | null
          id?: string
          is_published?: boolean
          kind?: string
          location_type?: string
          location_value?: string | null
          max_days_ahead?: number
          max_per_day?: number | null
          max_reschedules?: number
          min_notice_minutes?: number
          name: string
          position?: number
          questions?: Json
          reminder_sequence?: Json
          require_confirmation?: boolean
          reschedule_cutoff_minutes?: number
          slot_interval_minutes?: number
          slug?: string | null
          team_id?: string | null
          timezone?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          availability_schedule_id?: string | null
          booking_page_id?: string | null
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          cancel_cutoff_minutes?: number
          capacity?: number
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string
          duration_minutes?: number
          host_user_id?: string | null
          id?: string
          is_published?: boolean
          kind?: string
          location_type?: string
          location_value?: string | null
          max_days_ahead?: number
          max_per_day?: number | null
          max_reschedules?: number
          min_notice_minutes?: number
          name?: string
          position?: number
          questions?: Json
          reminder_sequence?: Json
          require_confirmation?: boolean
          reschedule_cutoff_minutes?: number
          slot_interval_minutes?: number
          slug?: string | null
          team_id?: string | null
          timezone?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_types_booking_page_id_fkey"
            columns: ["booking_page_id"]
            isOneToOne: false
            referencedRelation: "booking_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_types_schedule_fk"
            columns: ["availability_schedule_id"]
            isOneToOne: false
            referencedRelation: "availability_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_types_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "booking_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_types_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          automation_id: string
          created_at: string
          details: Json | null
          event_type: string
          id: string
          lead_id: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          lead_id?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          lead_id?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_smart_actions: {
        Row: {
          actions: Json
          condition_value: string
          created_at: string
          id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actions?: Json
          condition_value: string
          created_at?: string
          id?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actions?: Json
          condition_value?: string
          created_at?: string
          id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_smart_actions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_steps: {
        Row: {
          automation_id: string
          config: Json | null
          created_at: string
          id: string
          step_order: number
          step_type: string
          workspace_id: string
        }
        Insert: {
          automation_id: string
          config?: Json | null
          created_at?: string
          id?: string
          step_order?: number
          step_type?: string
          workspace_id: string
        }
        Update: {
          automation_id?: string
          config?: Json | null
          created_at?: string
          id?: string
          step_order?: number
          step_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_steps_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_steps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          created_at: string
          deduplication_key: string | null
          description: string | null
          enrollment_method: string | null
          enrollment_object_type: string | null
          exit_actions: Json
          exit_criteria: Json
          filter_groups: Json
          folder_id: string | null
          id: string
          last_run_at: string | null
          last_tested_at: string | null
          name: string
          reenrollment_config: Json
          run_count: number
          status: string
          trigger_config: Json | null
          trigger_event: string | null
          trigger_source: string | null
          trigger_summary: string | null
          trigger_type: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deduplication_key?: string | null
          description?: string | null
          enrollment_method?: string | null
          enrollment_object_type?: string | null
          exit_actions?: Json
          exit_criteria?: Json
          filter_groups?: Json
          folder_id?: string | null
          id?: string
          last_run_at?: string | null
          last_tested_at?: string | null
          name: string
          reenrollment_config?: Json
          run_count?: number
          status?: string
          trigger_config?: Json | null
          trigger_event?: string | null
          trigger_source?: string | null
          trigger_summary?: string | null
          trigger_type?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deduplication_key?: string | null
          description?: string | null
          enrollment_method?: string | null
          enrollment_object_type?: string | null
          exit_actions?: Json
          exit_criteria?: Json
          filter_groups?: Json
          folder_id?: string | null
          id?: string
          last_run_at?: string | null
          last_tested_at?: string | null
          name?: string
          reenrollment_config?: Json
          run_count?: number
          status?: string
          trigger_config?: Json | null
          trigger_event?: string | null
          trigger_source?: string | null
          trigger_summary?: string | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_overrides: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          is_unavailable: boolean
          label: string | null
          override_date: string
          schedule_id: string
          start_time: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_unavailable?: boolean
          label?: string | null
          override_date: string
          schedule_id: string
          start_time?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_unavailable?: boolean
          label?: string | null
          override_date?: string
          schedule_id?: string
          start_time?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_overrides_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "availability_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_overrides_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          created_at: string
          end_time: string
          id: string
          schedule_id: string
          start_time: string
          weekday: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          schedule_id: string
          start_time: string
          weekday: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          schedule_id?: string
          start_time?: string
          weekday?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "availability_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_schedules: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          timezone: string
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          timezone?: string
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          timezone?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_schedules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content: string
          created_at: string
          excerpt: string
          facebook_post_id: string | null
          facebook_share_error: string | null
          facebook_shared_at: string | null
          featured: boolean
          id: string
          image_url: string | null
          instagram_post_id: string | null
          instagram_share_error: string | null
          instagram_shared_at: string | null
          linkedin_post_id: string | null
          linkedin_share_error: string | null
          linkedin_shared_at: string | null
          published_at: string | null
          read_time: string
          scheduled_for: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          facebook_post_id?: string | null
          facebook_share_error?: string | null
          facebook_shared_at?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          instagram_post_id?: string | null
          instagram_share_error?: string | null
          instagram_shared_at?: string | null
          linkedin_post_id?: string | null
          linkedin_share_error?: string | null
          linkedin_shared_at?: string | null
          published_at?: string | null
          read_time?: string
          scheduled_for?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          facebook_post_id?: string | null
          facebook_share_error?: string | null
          facebook_shared_at?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          instagram_post_id?: string | null
          instagram_share_error?: string | null
          instagram_shared_at?: string | null
          linkedin_post_id?: string | null
          linkedin_share_error?: string | null
          linkedin_shared_at?: string | null
          published_at?: string | null
          read_time?: string
          scheduled_for?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_attendees: {
        Row: {
          answers: Json
          booking_id: string
          created_at: string
          email: string
          id: string
          lead_id: string | null
          name: string
          phone: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          answers?: Json
          booking_id: string
          created_at?: string
          email: string
          id?: string
          lead_id?: string | null
          name: string
          phone?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          answers?: Json
          booking_id?: string
          created_at?: string
          email?: string
          id?: string
          lead_id?: string | null
          name?: string
          phone?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_attendees_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_attendees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_events: {
        Row: {
          actor_user_id: string | null
          booking_id: string | null
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          payload: Json
          source: string
          workspace_id: string
        }
        Insert: {
          actor_user_id?: string | null
          booking_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          idempotency_key: string
          payload?: Json
          source?: string
          workspace_id: string
        }
        Update: {
          actor_user_id?: string | null
          booking_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          payload?: Json
          source?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_pages: {
        Row: {
          availability: Json
          brand_color: string | null
          buffer_minutes: number
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          google_calendar_id: string | null
          google_token_id: string | null
          host_avatar_url: string | null
          host_display_name: string | null
          id: string
          intro_text: string | null
          is_published: boolean
          location_type: string
          location_value: string | null
          logo_url: string | null
          max_days_ahead: number
          name: string
          notify_guest_whatsapp: boolean
          notify_host: boolean
          notify_host_whatsapp: boolean
          slug: string | null
          status: string
          timezone: string
          updated_at: string
          user_id: string
          whatsapp_confirmation_template_id: string | null
          whatsapp_confirmation_variables: Json | null
          workspace_id: string
        }
        Insert: {
          availability?: Json
          brand_color?: string | null
          buffer_minutes?: number
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          google_calendar_id?: string | null
          google_token_id?: string | null
          host_avatar_url?: string | null
          host_display_name?: string | null
          id?: string
          intro_text?: string | null
          is_published?: boolean
          location_type?: string
          location_value?: string | null
          logo_url?: string | null
          max_days_ahead?: number
          name: string
          notify_guest_whatsapp?: boolean
          notify_host?: boolean
          notify_host_whatsapp?: boolean
          slug?: string | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id: string
          whatsapp_confirmation_template_id?: string | null
          whatsapp_confirmation_variables?: Json | null
          workspace_id: string
        }
        Update: {
          availability?: Json
          brand_color?: string | null
          buffer_minutes?: number
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          google_calendar_id?: string | null
          google_token_id?: string | null
          host_avatar_url?: string | null
          host_display_name?: string | null
          id?: string
          intro_text?: string | null
          is_published?: boolean
          location_type?: string
          location_value?: string | null
          logo_url?: string | null
          max_days_ahead?: number
          name?: string
          notify_guest_whatsapp?: boolean
          notify_host?: boolean
          notify_host_whatsapp?: boolean
          slug?: string | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          whatsapp_confirmation_template_id?: string | null
          whatsapp_confirmation_variables?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_pages_google_token_id_fkey"
            columns: ["google_token_id"]
            isOneToOne: false
            referencedRelation: "google_calendar_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_pages_whatsapp_confirmation_template_id_fkey"
            columns: ["whatsapp_confirmation_template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_pages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reminders: {
        Row: {
          attempts: number
          audience: string
          booking_id: string
          channel: string
          created_at: string
          id: string
          offset_minutes: number
          provider_response: Json | null
          send_at: string
          sent_at: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attempts?: number
          audience?: string
          booking_id: string
          channel: string
          created_at?: string
          id?: string
          offset_minutes: number
          provider_response?: Json | null
          send_at: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attempts?: number
          audience?: string
          booking_id?: string
          channel?: string
          created_at?: string
          id?: string
          offset_minutes?: number
          provider_response?: Json | null
          send_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_reminders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reminders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_team_members: {
        Row: {
          availability_schedule_id: string | null
          created_at: string
          id: string
          is_paused: boolean
          is_required: boolean
          max_per_day: number | null
          priority: number
          team_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          availability_schedule_id?: string | null
          created_at?: string
          id?: string
          is_paused?: boolean
          is_required?: boolean
          max_per_day?: number | null
          priority?: number
          team_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          availability_schedule_id?: string | null
          created_at?: string
          id?: string
          is_paused?: boolean
          is_required?: boolean
          max_per_day?: number | null
          priority?: number
          team_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_team_members_availability_schedule_id_fkey"
            columns: ["availability_schedule_id"]
            isOneToOne: false
            referencedRelation: "availability_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "booking_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_team_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_teams: {
        Row: {
          assignment_method: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignment_method?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignment_method?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          answers: Json
          appointment_type_id: string | null
          booking_page_id: string
          cancel_reason: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          end_time: string
          google_event_id: string | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          host_user_id: string | null
          id: string
          internal_notes: string | null
          lead_id: string | null
          meeting_location: string | null
          meeting_url: string | null
          notes: string | null
          reminder_sent_at: string | null
          reschedule_count: number
          reschedule_token: string | null
          sms_consent: boolean
          sms_consent_source: string | null
          sms_consent_text: string | null
          sms_consent_timestamp: string | null
          sms_opt_out: boolean
          source: string
          start_time: string
          status: string
          status_actor_id: string | null
          status_changed_at: string | null
          updated_at: string
          utm: Json
          workspace_id: string
        }
        Insert: {
          answers?: Json
          appointment_type_id?: string | null
          booking_page_id: string
          cancel_reason?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          end_time: string
          google_event_id?: string | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          host_user_id?: string | null
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          meeting_location?: string | null
          meeting_url?: string | null
          notes?: string | null
          reminder_sent_at?: string | null
          reschedule_count?: number
          reschedule_token?: string | null
          sms_consent?: boolean
          sms_consent_source?: string | null
          sms_consent_text?: string | null
          sms_consent_timestamp?: string | null
          sms_opt_out?: boolean
          source?: string
          start_time: string
          status?: string
          status_actor_id?: string | null
          status_changed_at?: string | null
          updated_at?: string
          utm?: Json
          workspace_id: string
        }
        Update: {
          answers?: Json
          appointment_type_id?: string | null
          booking_page_id?: string
          cancel_reason?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          end_time?: string
          google_event_id?: string | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          host_user_id?: string | null
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          meeting_location?: string | null
          meeting_url?: string | null
          notes?: string | null
          reminder_sent_at?: string | null
          reschedule_count?: number
          reschedule_token?: string | null
          sms_consent?: boolean
          sms_consent_source?: string | null
          sms_consent_text?: string | null
          sms_consent_timestamp?: string | null
          sms_opt_out?: boolean
          source?: string
          start_time?: string
          status?: string
          status_actor_id?: string | null
          status_changed_at?: string | null
          updated_at?: string
          utm?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_booking_page_id_fkey"
            columns: ["booking_page_id"]
            isOneToOne: false
            referencedRelation: "booking_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_messages: {
        Row: {
          campaign_id: string
          channel: string
          clicked: boolean
          created_at: string
          delivery_status: string
          error: string | null
          id: string
          lead_id: string | null
          opened: boolean
          replied: boolean
          workspace_id: string
        }
        Insert: {
          campaign_id: string
          channel?: string
          clicked?: boolean
          created_at?: string
          delivery_status?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          opened?: boolean
          replied?: boolean
          workspace_id: string
        }
        Update: {
          campaign_id?: string
          channel?: string
          clicked?: boolean
          created_at?: string
          delivery_status?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          opened?: boolean
          replied?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_filter: Json | null
          campaign_mode: string
          click_rate: number
          conversion_rate: number
          created_at: string
          fallback_settings: Json | null
          id: string
          message_content: Json | null
          name: string
          objective: string
          open_rate: number
          scheduled_at: string | null
          sent_count: number
          status: string
          trigger_config: Json | null
          type: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          audience_filter?: Json | null
          campaign_mode?: string
          click_rate?: number
          conversion_rate?: number
          created_at?: string
          fallback_settings?: Json | null
          id?: string
          message_content?: Json | null
          name: string
          objective?: string
          open_rate?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          trigger_config?: Json | null
          type?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          audience_filter?: Json | null
          campaign_mode?: string
          click_rate?: number
          conversion_rate?: number
          created_at?: string
          fallback_settings?: Json | null
          id?: string
          message_content?: Json | null
          name?: string
          objective?: string
          open_rate?: number
          scheduled_at?: string | null
          sent_count?: number
          status?: string
          trigger_config?: Json | null
          type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_events: {
        Row: {
          contact_id: string | null
          created_at: string
          customer_id: string | null
          event_type: string
          id: string
          order_id: string | null
          payload: Json
          product_id: string | null
          store_id: string | null
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          payload?: Json
          product_id?: string | null
          store_id?: string | null
          workspace_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          customer_id?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json
          product_id?: string | null
          store_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "shop_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_usage: {
        Row: {
          channel: Database["public"]["Enums"]["sender_channel"]
          cost_cents: number
          country: string | null
          created_at: string
          credits_deducted: number
          id: string
          message_id: string | null
          sender_profile_id: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["sender_channel"]
          cost_cents?: number
          country?: string | null
          created_at?: string
          credits_deducted?: number
          id?: string
          message_id?: string | null
          sender_profile_id?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["sender_channel"]
          cost_cents?: number
          country?: string | null
          created_at?: string
          credits_deducted?: number
          id?: string
          message_id?: string | null
          sender_profile_id?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_usage_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "sender_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_line1: string | null
          annual_revenue: number | null
          archived_at: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          description: string | null
          domain: string | null
          email: string | null
          id: string
          industry: string | null
          last_activity_at: string | null
          lifecycle_stage: string
          linkedin_url: string | null
          logo_url: string | null
          name: string
          owner_user_id: string | null
          phone: string | null
          postal_code: string | null
          size_band: string | null
          state: string | null
          tags: string[]
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          address_line1?: string | null
          annual_revenue?: number | null
          archived_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          lifecycle_stage?: string
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          phone?: string | null
          postal_code?: string | null
          size_band?: string | null
          state?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          address_line1?: string | null
          annual_revenue?: number | null
          archived_at?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          lifecycle_stage?: string
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          phone?: string | null
          postal_code?: string | null
          size_band?: string | null
          state?: string | null
          tags?: string[]
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_duplicate_candidates: {
        Row: {
          confidence: number
          conflicting_fields: Json
          contact_id: string
          created_at: string
          duplicate_contact_id: string
          id: string
          match_reason: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          confidence?: number
          conflicting_fields?: Json
          contact_id: string
          created_at?: string
          duplicate_contact_id: string
          id?: string
          match_reason: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          confidence?: number
          conflicting_fields?: Json
          contact_id?: string
          created_at?: string
          duplicate_contact_id?: string
          id?: string
          match_reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_duplicate_candidates_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_duplicate_candidates_duplicate_contact_id_fkey"
            columns: ["duplicate_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_duplicate_candidates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_identities: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          identity_type: string
          identity_value: string
          raw_value: string | null
          updated_at: string
          verified: boolean
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          identity_type: string
          identity_value: string
          raw_value?: string | null
          updated_at?: string
          verified?: boolean
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          identity_type?: string
          identity_value?: string
          raw_value?: string | null
          updated_at?: string
          verified?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_identities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_identities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_merge_log: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          merged_contact_id: string
          merged_snapshot: Json
          moved_counts: Json
          reason: string | null
          surviving_contact_id: string
          workspace_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          merged_contact_id: string
          merged_snapshot?: Json
          moved_counts?: Json
          reason?: string | null
          surviving_contact_id: string
          workspace_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          merged_contact_id?: string
          merged_snapshot?: Json
          moved_counts?: Json
          reason?: string | null
          surviving_contact_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_merge_log_surviving_contact_id_fkey"
            columns: ["surviving_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_merge_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_source_map: {
        Row: {
          conflict_state: string | null
          contact_id: string
          created_at: string
          id: string
          match_confidence: number
          match_method: string
          migration_version: string | null
          source_record_id: string
          source_table: string
          workspace_id: string
        }
        Insert: {
          conflict_state?: string | null
          contact_id: string
          created_at?: string
          id?: string
          match_confidence?: number
          match_method: string
          migration_version?: string | null
          source_record_id: string
          source_table: string
          workspace_id: string
        }
        Update: {
          conflict_state?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          match_confidence?: number
          match_method?: string
          migration_version?: string | null
          source_record_id?: string
          source_table?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_source_map_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_source_map_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          company_id: string | null
          company_name: string | null
          consent_email: boolean
          consent_sms: boolean
          consent_status: string
          consent_updated_at: string | null
          consent_whatsapp: boolean
          conversion_reason: string | null
          conversion_source: string | null
          converted_at: string | null
          created_at: string
          created_by: string | null
          email: string | null
          external_source_id: string | null
          first_name: string | null
          first_touch: Json
          first_touch_at: string | null
          full_name: string | null
          id: string
          job_title: string | null
          last_activity_at: string | null
          last_name: string | null
          last_touch: Json
          last_touch_at: string | null
          lead_status: string | null
          lifecycle_stage: string
          merged_into_id: string | null
          notes: string | null
          origin_lead_id: string | null
          owner_user_id: string | null
          phone: string | null
          score: number
          score_updated_at: string | null
          source: string | null
          tags: string[]
          temperature: string
          updated_at: string
          whatsapp_number: string | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          company_id?: string | null
          company_name?: string | null
          consent_email?: boolean
          consent_sms?: boolean
          consent_status?: string
          consent_updated_at?: string | null
          consent_whatsapp?: boolean
          conversion_reason?: string | null
          conversion_source?: string | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          external_source_id?: string | null
          first_name?: string | null
          first_touch?: Json
          first_touch_at?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          last_touch?: Json
          last_touch_at?: string | null
          lead_status?: string | null
          lifecycle_stage?: string
          merged_into_id?: string | null
          notes?: string | null
          origin_lead_id?: string | null
          owner_user_id?: string | null
          phone?: string | null
          score?: number
          score_updated_at?: string | null
          source?: string | null
          tags?: string[]
          temperature?: string
          updated_at?: string
          whatsapp_number?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          company_id?: string | null
          company_name?: string | null
          consent_email?: boolean
          consent_sms?: boolean
          consent_status?: string
          consent_updated_at?: string | null
          consent_whatsapp?: boolean
          conversion_reason?: string | null
          conversion_source?: string | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          external_source_id?: string | null
          first_name?: string | null
          first_touch?: Json
          first_touch_at?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          last_touch?: Json
          last_touch_at?: string | null
          lead_status?: string | null
          lifecycle_stage?: string
          merged_into_id?: string | null
          notes?: string | null
          origin_lead_id?: string | null
          owner_user_id?: string | null
          phone?: string | null
          score?: number
          score_updated_at?: string | null
          source?: string | null
          tags?: string[]
          temperature?: string
          updated_at?: string
          whatsapp_number?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_origin_lead_id_fkey"
            columns: ["origin_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_adjustment_ledger: {
        Row: {
          actor_user_id: string | null
          adjustment_type: string
          category: string
          correlation_id: string
          created_at: string
          id: string
          new_balance: number | null
          previous_balance: number | null
          quantity: number
          reason: string
          related_transaction: string | null
          source: string
          workspace_id: string
        }
        Insert: {
          actor_user_id?: string | null
          adjustment_type: string
          category: string
          correlation_id?: string
          created_at?: string
          id?: string
          new_balance?: number | null
          previous_balance?: number | null
          quantity: number
          reason: string
          related_transaction?: string | null
          source?: string
          workspace_id: string
        }
        Update: {
          actor_user_id?: string | null
          adjustment_type?: string
          category?: string
          correlation_id?: string
          created_at?: string
          id?: string
          new_balance?: number | null
          previous_balance?: number | null
          quantity?: number
          reason?: string
          related_transaction?: string | null
          source?: string
          workspace_id?: string
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          channel: Database["public"]["Enums"]["sender_channel"]
          country: string | null
          created_at: string
          credits: number
          currency: string
          id: string
          is_active: boolean
          name: string
          price_cents: number
          sort_order: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["sender_channel"]
          country?: string | null
          created_at?: string
          credits: number
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["sender_channel"]
          country?: string | null
          created_at?: string
          credits?: number
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      credit_pricing_rules: {
        Row: {
          channel: Database["public"]["Enums"]["sender_channel"]
          country: string | null
          created_at: string
          credits_per_message: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["sender_channel"]
          country?: string | null
          created_at?: string
          credits_per_message?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["sender_channel"]
          country?: string | null
          created_at?: string
          credits_per_message?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          amount_minor: number | null
          channel: string
          created_at: string
          currency: string
          id: string
          reason: string
          reference_id: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          amount_minor?: number | null
          channel: string
          created_at?: string
          currency?: string
          id?: string
          reason: string
          reference_id?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          amount_minor?: number | null
          channel?: string
          created_at?: string
          currency?: string
          id?: string
          reason?: string
          reference_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_type: string
          actor_label: string | null
          actor_user_id: string | null
          created_at: string
          description: string | null
          external_event_id: string | null
          id: string
          meta: Json
          occurred_at: string
          record_id: string
          record_type: string
          related_id: string | null
          related_type: string | null
          source: string
          status: string | null
          title: string | null
          workspace_id: string
        }
        Insert: {
          activity_type: string
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          description?: string | null
          external_event_id?: string | null
          id?: string
          meta?: Json
          occurred_at?: string
          record_id: string
          record_type: string
          related_id?: string | null
          related_type?: string | null
          source?: string
          status?: string | null
          title?: string | null
          workspace_id: string
        }
        Update: {
          activity_type?: string
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          description?: string | null
          external_event_id?: string | null
          id?: string
          meta?: Json
          occurred_at?: string
          record_id?: string
          record_type?: string
          related_id?: string | null
          related_type?: string | null
          source?: string
          status?: string | null
          title?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_audit_log: {
        Row: {
          action: string
          actor_label: string | null
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          record_id: string | null
          record_type: string
          workspace_id: string
        }
        Insert: {
          action: string
          actor_label?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          record_id?: string | null
          record_type: string
          workspace_id: string
        }
        Update: {
          action?: string
          actor_label?: string | null
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          record_id?: string | null
          record_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_custom_field_defs: {
        Row: {
          created_at: string
          default_value: Json | null
          field_key: string
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          label: string
          options: Json
          record_type: string
          sort_order: number
          updated_at: string
          validation: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          default_value?: Json | null
          field_key: string
          field_type: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          label: string
          options?: Json
          record_type: string
          sort_order?: number
          updated_at?: string
          validation?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          default_value?: Json | null
          field_key?: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          label?: string
          options?: Json
          record_type?: string
          sort_order?: number
          updated_at?: string
          validation?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_custom_field_defs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_custom_field_values: {
        Row: {
          created_at: string
          field_id: string
          id: string
          record_id: string
          record_type: string
          updated_at: string
          value: Json | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          record_id: string
          record_type: string
          updated_at?: string
          value?: Json | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          record_id?: string
          record_type?: string
          updated_at?: string
          value?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crm_custom_field_defs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_custom_field_values_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deal_stage_history: {
        Row: {
          change_source: string
          changed_by: string | null
          created_at: string
          deal_id: string
          entered_at: string
          exited_at: string | null
          from_stage_id: string | null
          id: string
          to_stage_id: string | null
          workspace_id: string
        }
        Insert: {
          change_source?: string
          changed_by?: string | null
          created_at?: string
          deal_id: string
          entered_at?: string
          exited_at?: string | null
          from_stage_id?: string | null
          id?: string
          to_stage_id?: string | null
          workspace_id: string
        }
        Update: {
          change_source?: string
          changed_by?: string | null
          created_at?: string
          deal_id?: string
          entered_at?: string
          exited_at?: string | null
          from_stage_id?: string | null
          id?: string
          to_stage_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_stage_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          amount: number
          closed_at: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          lost_reason: string | null
          name: string
          owner_user_id: string | null
          pipeline_id: string
          position: number
          probability: number | null
          source: string | null
          stage_id: string | null
          status: string
          tags: string[]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          amount?: number
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          name: string
          owner_user_id?: string | null
          pipeline_id: string
          position?: number
          probability?: number | null
          source?: string | null
          stage_id?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          closed_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          name?: string
          owner_user_id?: string | null
          pipeline_id?: string
          position?: number
          probability?: number | null
          source?: string | null
          stage_id?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_files: {
        Row: {
          archived_at: string | null
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          record_id: string
          record_type: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          record_id: string
          record_type: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          record_id?: string
          record_type?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          archived_at: string | null
          author_user_id: string | null
          body: string
          body_html: string | null
          created_at: string
          edit_history: Json
          edited_at: string | null
          id: string
          is_internal: boolean
          is_pinned: boolean
          record_id: string
          record_type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          author_user_id?: string | null
          body: string
          body_html?: string | null
          created_at?: string
          edit_history?: Json
          edited_at?: string | null
          id?: string
          is_internal?: boolean
          is_pinned?: boolean
          record_id: string
          record_type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          author_user_id?: string | null
          body?: string
          body_html?: string | null
          created_at?: string
          edit_history?: Json
          edited_at?: string | null
          id?: string
          is_internal?: boolean
          is_pinned?: boolean
          record_id?: string
          record_type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          pipeline_id: string
          position: number
          probability: number
          stage_type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          pipeline_id: string
          position?: number
          probability?: number
          stage_type?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          pipeline_id?: string
          position?: number
          probability?: number
          stage_type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_pipeline_stages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          position: number
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          position?: number
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_reconciliation_runs: {
        Row: {
          ambiguous_count: number
          counts_after: Json
          counts_before: Json
          created_at: string
          created_count: number
          details: Json
          failed_count: number
          id: string
          linked_count: number
          migration_version: string
          phase: string
          unresolved_count: number
          updated_count: number
          workspace_id: string
        }
        Insert: {
          ambiguous_count?: number
          counts_after?: Json
          counts_before?: Json
          created_at?: string
          created_count?: number
          details?: Json
          failed_count?: number
          id?: string
          linked_count?: number
          migration_version: string
          phase: string
          unresolved_count?: number
          updated_count?: number
          workspace_id: string
        }
        Update: {
          ambiguous_count?: number
          counts_after?: Json
          counts_before?: Json
          created_at?: string
          created_count?: number
          details?: Json
          failed_count?: number
          id?: string
          linked_count?: number
          migration_version?: string
          phase?: string
          unresolved_count?: number
          updated_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_reconciliation_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_saved_views: {
        Row: {
          columns: Json
          created_at: string
          filters: Json
          id: string
          is_default: boolean
          name: string
          record_type: string
          sort: Json
          updated_at: string
          user_id: string
          visibility: string
          workspace_id: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          filters?: Json
          id?: string
          is_default?: boolean
          name: string
          record_type?: string
          sort?: Json
          updated_at?: string
          user_id: string
          visibility?: string
          workspace_id: string
        }
        Update: {
          columns?: Json
          created_at?: string
          filters?: Json
          id?: string
          is_default?: boolean
          name?: string
          record_type?: string
          sort?: Json
          updated_at?: string
          user_id?: string
          visibility?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_saved_views_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          completed_at: string | null
          completed_by: string | null
          completion_note: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          dedupe_key: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          priority: string
          reminder_at: string | null
          source_execution_id: string | null
          source_workflow_id: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          dedupe_key?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          reminder_at?: string | null
          source_execution_id?: string | null
          source_workflow_id?: string | null
          status?: string
          task_type?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_note?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          dedupe_key?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: string
          reminder_at?: string | null
          source_execution_id?: string | null
          source_workflow_id?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rates: {
        Row: {
          base: string
          id: string
          quote: string
          rate: number
          updated_at: string
        }
        Insert: {
          base?: string
          id?: string
          quote: string
          rate: number
          updated_at?: string
        }
        Update: {
          base?: string
          id?: string
          quote?: string
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          body: string | null
          created_at: string
          direction: string
          error: string | null
          from_email: string | null
          id: string
          lead_id: string | null
          provider_message_id: string | null
          sender_profile_id: string | null
          status: string
          subject: string | null
          to_email: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          from_email?: string | null
          id?: string
          lead_id?: string | null
          provider_message_id?: string | null
          sender_profile_id?: string | null
          status?: string
          subject?: string | null
          to_email: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          from_email?: string | null
          id?: string
          lead_id?: string | null
          provider_message_id?: string | null
          sender_profile_id?: string | null
          status?: string
          subject?: string | null
          to_email?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "sender_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_senders: {
        Row: {
          created_at: string
          dkim_status: string | null
          dmarc_status: string | null
          domain: string | null
          from_email: string | null
          from_name: string | null
          id: string
          provider: string
          reply_to: string | null
          sender_profile_id: string
          spf_status: string | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          created_at?: string
          dkim_status?: string | null
          dmarc_status?: string | null
          domain?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          provider?: string
          reply_to?: string | null
          sender_profile_id: string
          spf_status?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          created_at?: string
          dkim_status?: string | null
          dmarc_status?: string | null
          domain?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          provider?: string
          reply_to?: string | null
          sender_profile_id?: string
          spf_status?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_senders_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: true
            referencedRelation: "sender_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          api_key_encrypted: string
          created_at: string | null
          from_email: string | null
          from_name: string | null
          id: string
          is_active: boolean | null
          provider: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          provider: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          provider?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          checked_at: string
          confidence: number | null
          contact_id: string | null
          created_at: string
          email: string
          id: string
          provider: string
          raw: Json | null
          result: string
          workspace_id: string
        }
        Insert: {
          checked_at?: string
          confidence?: number | null
          contact_id?: string | null
          created_at?: string
          email: string
          id?: string
          provider: string
          raw?: Json | null
          result: string
          workspace_id: string
        }
        Update: {
          checked_at?: string
          confidence?: number | null
          contact_id?: string | null
          created_at?: string
          email?: string
          id?: string
          provider?: string
          raw?: Json | null
          result?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_verifications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_verifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      form_rate_limit: {
        Row: {
          created_at: string
          form_id: string
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          contact_id: string | null
          created_at: string
          data: Json
          form_id: string
          id: string
          idempotency_key: string | null
          lead_id: string | null
          processed_at: string | null
          processing_error: string | null
          processing_status: string
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          data?: Json
          form_id: string
          id?: string
          idempotency_key?: string | null
          lead_id?: string | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          workspace_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          idempotency_key?: string | null
          lead_id?: string | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          schema: Json
          settings: Json
          slug: string | null
          status: string
          submission_count: number
          theme: Json
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          schema?: Json
          settings?: Json
          slug?: string | null
          status?: string
          submission_count?: number
          theme?: Json
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          schema?: Json
          settings?: Json
          slug?: string | null
          status?: string
          submission_count?: number
          theme?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      funnel_steps: {
        Row: {
          conversion_rate: number
          created_at: string
          funnel_id: string
          id: string
          page_content: Json | null
          step_order: number
          step_type: string
          workspace_id: string
        }
        Insert: {
          conversion_rate?: number
          created_at?: string
          funnel_id: string
          id?: string
          page_content?: Json | null
          step_order?: number
          step_type?: string
          workspace_id: string
        }
        Update: {
          conversion_rate?: number
          created_at?: string
          funnel_id?: string
          id?: string
          page_content?: Json | null
          step_order?: number
          step_type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_steps_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_steps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_visits: {
        Row: {
          converted: boolean
          created_at: string
          device_type: string | null
          funnel_id: string
          id: string
          lead_id: string | null
          step_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          workspace_id: string
        }
        Insert: {
          converted?: boolean
          created_at?: string
          device_type?: string | null
          funnel_id: string
          id?: string
          lead_id?: string | null
          step_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id: string
        }
        Update: {
          converted?: boolean
          created_at?: string
          device_type?: string | null
          funnel_id?: string
          id?: string
          lead_id?: string | null
          step_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_visits_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_visits_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "funnel_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_visits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          objective: string
          slug: string | null
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          objective?: string
          slug?: string | null
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          objective?: string
          slug?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string
          created_at: string
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string
          created_at?: string
          id?: string
          refresh_token: string
          token_expires_at?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string
          created_at?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      icp_versions: {
        Row: {
          change_source: string
          created_at: string
          created_by: string | null
          icp_id: string
          id: string
          snapshot: Json
          version: number
          workspace_id: string
        }
        Insert: {
          change_source?: string
          created_at?: string
          created_by?: string | null
          icp_id: string
          id?: string
          snapshot: Json
          version: number
          workspace_id: string
        }
        Update: {
          change_source?: string
          created_at?: string
          created_by?: string | null
          icp_id?: string
          id?: string
          snapshot?: Json
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "icp_versions_icp_id_fkey"
            columns: ["icp_id"]
            isOneToOne: false
            referencedRelation: "ideal_customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icp_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ideal_customer_profiles: {
        Row: {
          ai_rationale: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          business_types: string[]
          buying_signals: string[]
          company_sizes: string[]
          countries: string[]
          created_at: string
          created_by: string | null
          disqualifiers: string[]
          excluded_companies: string[]
          excluded_industries: string[]
          growth_stages: string[]
          id: string
          industries: string[]
          is_active: boolean
          job_functions: string[]
          job_titles: string[]
          name: string
          offer_id: string | null
          optional_criteria: Json
          pain_points: string[]
          regions: string[]
          required_criteria: Json
          revenue_max: number | null
          revenue_min: number | null
          seniority_levels: string[]
          sub_industries: string[]
          technologies: string[]
          updated_at: string
          version: number
          workspace_id: string
        }
        Insert: {
          ai_rationale?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          business_types?: string[]
          buying_signals?: string[]
          company_sizes?: string[]
          countries?: string[]
          created_at?: string
          created_by?: string | null
          disqualifiers?: string[]
          excluded_companies?: string[]
          excluded_industries?: string[]
          growth_stages?: string[]
          id?: string
          industries?: string[]
          is_active?: boolean
          job_functions?: string[]
          job_titles?: string[]
          name: string
          offer_id?: string | null
          optional_criteria?: Json
          pain_points?: string[]
          regions?: string[]
          required_criteria?: Json
          revenue_max?: number | null
          revenue_min?: number | null
          seniority_levels?: string[]
          sub_industries?: string[]
          technologies?: string[]
          updated_at?: string
          version?: number
          workspace_id: string
        }
        Update: {
          ai_rationale?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          business_types?: string[]
          buying_signals?: string[]
          company_sizes?: string[]
          countries?: string[]
          created_at?: string
          created_by?: string | null
          disqualifiers?: string[]
          excluded_companies?: string[]
          excluded_industries?: string[]
          growth_stages?: string[]
          id?: string
          industries?: string[]
          is_active?: boolean
          job_functions?: string[]
          job_titles?: string[]
          name?: string
          offer_id?: string | null
          optional_criteria?: Json
          pain_points?: string[]
          regions?: string[]
          required_criteria?: Json
          revenue_max?: number | null
          revenue_min?: number | null
          seniority_levels?: string[]
          sub_industries?: string[]
          technologies?: string[]
          updated_at?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideal_customer_profiles_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "prospecting_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideal_customer_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          role: string
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          role?: string
          status?: string
          token?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          role?: string
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          meta: Json | null
          type: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          meta?: Json | null
          type: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          meta?: Json | null
          type?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_folder_leads: {
        Row: {
          created_at: string
          folder_id: string
          id: string
          lead_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          id?: string
          lead_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          id?: string
          lead_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_folder_leads_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "lead_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_folder_leads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_folder_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_routing_rules: {
        Row: {
          created_at: string
          folder_id: string
          id: string
          is_active: boolean
          match_field: string
          match_value: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          id?: string
          is_active?: boolean
          match_field: string
          match_value: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          id?: string
          is_active?: boolean
          match_field?: string
          match_value?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_routing_rules_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "lead_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_routing_rules_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_score_history: {
        Row: {
          created_at: string
          delta: number
          id: string
          lead_id: string
          new_score: number
          previous_score: number
          reason: string | null
          ref_id: string | null
          ref_type: string | null
          source: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          lead_id: string
          new_score?: number
          previous_score?: number
          reason?: string | null
          ref_id?: string | null
          ref_type?: string | null
          source?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          lead_id?: string
          new_score?: number
          previous_score?: number
          reason?: string | null
          ref_id?: string | null
          ref_type?: string | null
          source?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_score_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_score_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scoring_settings: {
        Row: {
          bands: Json
          created_at: string
          custom_labels: Json
          decay: Json
          rules: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bands?: Json
          created_at?: string
          custom_labels?: Json
          decay?: Json
          rules?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bands?: Json
          created_at?: string
          custom_labels?: Json
          decay?: Json
          rules?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      lead_tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          lead_id: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          lead_id: string
          title: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          lead_id?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_qualification: Json | null
          assigned_owner_id: string | null
          attribution: Json
          campaign_name: string | null
          contact_id: string | null
          created_at: string
          email: string | null
          external_source_id: string | null
          full_name: string | null
          funnel_name: string | null
          id: string
          last_activity_at: string | null
          notes: string | null
          phone: string | null
          pipeline_stage: string
          score: number | null
          sms_consent: boolean
          sms_consent_source: string | null
          sms_consent_text: string | null
          sms_consent_timestamp: string | null
          sms_opt_out: boolean
          social_handles: Json | null
          source: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          wa_opt_in_at: string | null
          workspace_id: string
        }
        Insert: {
          ai_qualification?: Json | null
          assigned_owner_id?: string | null
          attribution?: Json
          campaign_name?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string | null
          external_source_id?: string | null
          full_name?: string | null
          funnel_name?: string | null
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_stage?: string
          score?: number | null
          sms_consent?: boolean
          sms_consent_source?: string | null
          sms_consent_text?: string | null
          sms_consent_timestamp?: string | null
          sms_opt_out?: boolean
          social_handles?: Json | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          wa_opt_in_at?: string | null
          workspace_id: string
        }
        Update: {
          ai_qualification?: Json | null
          assigned_owner_id?: string | null
          attribution?: Json
          campaign_name?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string | null
          external_source_id?: string | null
          full_name?: string | null
          funnel_name?: string | null
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_stage?: string
          score?: number | null
          sms_consent?: boolean
          sms_consent_source?: string | null
          sms_consent_text?: string | null
          sms_consent_timestamp?: string | null
          sms_opt_out?: boolean
          social_handles?: Json | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          wa_opt_in_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_action_approvals: {
        Row: {
          args_digest: string | null
          client_key: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string
          expires_at: string | null
          id: string
          requested_by: string | null
          risk_level: string
          summary: string | null
          tool_name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          args_digest?: string | null
          client_key?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          expires_at?: string | null
          id?: string
          requested_by?: string | null
          risk_level?: string
          summary?: string | null
          tool_name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          args_digest?: string | null
          client_key?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          expires_at?: string | null
          id?: string
          requested_by?: string | null
          risk_level?: string
          summary?: string | null
          tool_name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_action_approvals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_connections: {
        Row: {
          client_key: string
          client_name: string | null
          created_at: string
          created_by: string | null
          id: string
          last_seen_at: string | null
          oauth_client_id: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_key: string
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_seen_at?: string | null
          oauth_client_id?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_key?: string
          client_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_seen_at?: string | null
          oauth_client_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_rate_limits: {
        Row: {
          created_at: string
          id: string
          request_count: number
          updated_at: string
          user_id: string
          window_start: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id: string
          window_start: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id?: string
          window_start?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      mcp_tool_activity: {
        Row: {
          approval_status: string
          client_key: string | null
          created_at: string
          duration_ms: number | null
          error_code: string | null
          execution_status: string
          id: string
          oauth_client_id: string | null
          risk_level: string
          summary: string | null
          tool_name: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          approval_status?: string
          client_key?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          execution_status?: string
          id?: string
          oauth_client_id?: string | null
          risk_level?: string
          summary?: string | null
          tool_name: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          approval_status?: string
          client_key?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          execution_status?: string
          id?: string
          oauth_client_id?: string | null
          risk_level?: string
          summary?: string | null
          tool_name?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      mcp_tool_permissions: {
        Row: {
          access_level: string
          created_at: string
          id: string
          permission_group: string
          require_approval: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          id?: string
          permission_group: string
          require_approval?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          id?: string
          permission_group?: string
          require_approval?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_tool_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_credits: {
        Row: {
          email_balance: number
          email_used: number
          id: string
          sms_balance: number
          sms_used: number
          unlimited: boolean
          updated_at: string
          whatsapp_balance: number
          whatsapp_used: number
          workspace_id: string
        }
        Insert: {
          email_balance?: number
          email_used?: number
          id?: string
          sms_balance?: number
          sms_used?: number
          unlimited?: boolean
          updated_at?: string
          whatsapp_balance?: number
          whatsapp_used?: number
          workspace_id: string
        }
        Update: {
          email_balance?: number
          email_used?: number
          id?: string
          sms_balance?: number
          sms_used?: number
          unlimited?: boolean
          updated_at?: string
          whatsapp_balance?: number
          whatsapp_used?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_credits_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_settings: {
        Row: {
          app_id: string | null
          app_secret_encrypted: string | null
          connection_method: string
          created_at: string
          fb_user_id: string | null
          fb_user_name: string | null
          id: string
          ig_user_id: string | null
          ig_username: string | null
          is_active: boolean
          page_access_token_encrypted: string | null
          page_id: string | null
          page_name: string | null
          token_expires_at: string | null
          updated_at: string
          verify_token_encrypted: string | null
          workspace_id: string
        }
        Insert: {
          app_id?: string | null
          app_secret_encrypted?: string | null
          connection_method?: string
          created_at?: string
          fb_user_id?: string | null
          fb_user_name?: string | null
          id?: string
          ig_user_id?: string | null
          ig_username?: string | null
          is_active?: boolean
          page_access_token_encrypted?: string | null
          page_id?: string | null
          page_name?: string | null
          token_expires_at?: string | null
          updated_at?: string
          verify_token_encrypted?: string | null
          workspace_id: string
        }
        Update: {
          app_id?: string | null
          app_secret_encrypted?: string | null
          connection_method?: string
          created_at?: string
          fb_user_id?: string | null
          fb_user_name?: string | null
          id?: string
          ig_user_id?: string | null
          ig_username?: string | null
          is_active?: boolean
          page_access_token_encrypted?: string | null
          page_id?: string | null
          page_name?: string | null
          token_expires_at?: string | null
          updated_at?: string
          verify_token_encrypted?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      nexusintel_companies: {
        Row: {
          business_model: string | null
          created_at: string
          id: string
          industry: string | null
          lead_score: number | null
          location: string | null
          name: string | null
          next_action: string | null
          recommended_offer: string | null
          services: string | null
          size: string | null
          status: string
          summary: string | null
          target_customers: string | null
          updated_at: string
          urgency: string | null
          user_id: string
          website_url: string
          workspace_id: string
        }
        Insert: {
          business_model?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          lead_score?: number | null
          location?: string | null
          name?: string | null
          next_action?: string | null
          recommended_offer?: string | null
          services?: string | null
          size?: string | null
          status?: string
          summary?: string | null
          target_customers?: string | null
          updated_at?: string
          urgency?: string | null
          user_id: string
          website_url: string
          workspace_id: string
        }
        Update: {
          business_model?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          lead_score?: number | null
          location?: string | null
          name?: string | null
          next_action?: string | null
          recommended_offer?: string | null
          services?: string | null
          size?: string | null
          status?: string
          summary?: string | null
          target_customers?: string | null
          updated_at?: string
          urgency?: string | null
          user_id?: string
          website_url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexusintel_companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      nexusintel_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          provider: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          provider: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexusintel_integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      nexusintel_notes: {
        Row: {
          company_id: string
          created_at: string
          id: string
          note: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          note: string
          user_id: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          note?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexusintel_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "nexusintel_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexusintel_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      nexusintel_outreach_history: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          id: string
          message: string | null
          sent_at: string | null
          status: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          channel: string
          company_id: string
          created_at?: string
          id?: string
          message?: string | null
          sent_at?: string | null
          status?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          id?: string
          message?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexusintel_outreach_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "nexusintel_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexusintel_outreach_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      nexusintel_reports: {
        Row: {
          analysis_depth: string | null
          company_id: string | null
          created_at: string
          crm_deal_score: number | null
          id: string
          report_json: Json
          report_title: string | null
          user_id: string
          user_offer: string | null
          workspace_id: string
        }
        Insert: {
          analysis_depth?: string | null
          company_id?: string | null
          created_at?: string
          crm_deal_score?: number | null
          id?: string
          report_json: Json
          report_title?: string | null
          user_id: string
          user_offer?: string | null
          workspace_id: string
        }
        Update: {
          analysis_depth?: string | null
          company_id?: string | null
          created_at?: string
          crm_deal_score?: number | null
          id?: string
          report_json?: Json
          report_title?: string | null
          user_id?: string
          user_offer?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexusintel_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "nexusintel_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexusintel_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      nexusintel_tasks: {
        Row: {
          company_id: string
          created_at: string
          due_date: string | null
          id: string
          status: string
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          status?: string
          title: string
          user_id: string
          workspace_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexusintel_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "nexusintel_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexusintel_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      nexusintel_usage: {
        Row: {
          monthly_report_limit: number
          period_start: string
          plan: string
          reports_used: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          monthly_report_limit?: number
          period_start?: string
          plan?: string
          reports_used?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          monthly_report_limit?: number
          period_start?: string
          plan?: string
          reports_used?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexusintel_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          meta: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_connection_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          provider: string
          redirect_to: string
          state: string
          used_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          provider: string
          redirect_to: string
          state: string
          used_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          provider?: string
          redirect_to?: string
          state?: string
          used_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_connection_states_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payload: Json | null
          type: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payload?: Json | null
          type: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payload?: Json | null
          type?: string
        }
        Relationships: []
      }
      platform_access_reviews: {
        Row: {
          assignment_id: string | null
          created_at: string
          id: string
          note: string | null
          outcome: string
          reviewer_user_id: string
          subject_user_id: string
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          outcome: string
          reviewer_user_id: string
          subject_user_id: string
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          outcome?: string
          reviewer_user_id?: string
          subject_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_access_reviews_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "platform_staff_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          after_summary: Json | null
          before_summary: Json | null
          correlation_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          reason: string | null
          result: string
          workspace_id: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_summary?: Json | null
          before_summary?: Json | null
          correlation_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          reason?: string | null
          result?: string
          workspace_id?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_summary?: Json | null
          before_summary?: Json | null
          correlation_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          reason?: string | null
          result?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      platform_permissions: {
        Row: {
          category: string
          created_at: string
          description: string
          key: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          key: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          key?: string
        }
        Relationships: []
      }
      platform_plan_versions: {
        Row: {
          annual_price: number
          created_at: string
          created_by: string | null
          currency: string
          entitlements: Json
          id: string
          is_current: boolean
          limits: Json
          monthly_price: number
          overage_policy: string | null
          plan_id: string
          trial_days: number
          version: number
        }
        Insert: {
          annual_price?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          entitlements?: Json
          id?: string
          is_current?: boolean
          limits?: Json
          monthly_price?: number
          overage_policy?: string | null
          plan_id: string
          trial_days?: number
          version?: number
        }
        Update: {
          annual_price?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          entitlements?: Json
          id?: string
          is_current?: boolean
          limits?: Json
          monthly_price?: number
          overage_policy?: string | null
          plan_id?: string
          trial_days?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "platform_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_role_permissions: {
        Row: {
          permission_key: string
          role: Database["public"]["Enums"]["platform_role"]
        }
        Insert: {
          permission_key: string
          role: Database["public"]["Enums"]["platform_role"]
        }
        Update: {
          permission_key?: string
          role?: Database["public"]["Enums"]["platform_role"]
        }
        Relationships: [
          {
            foreignKeyName: "platform_role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "platform_permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      platform_staff_assignments: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          reason: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["platform_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_support_access_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          read_only: boolean
          reason: string
          staff_user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          expires_at: string
          id?: string
          read_only?: boolean
          reason: string
          staff_user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          read_only?: boolean
          reason?: string
          staff_user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      processed_automation_events: {
        Row: {
          event_key: string
          event_payload: Json | null
          external_event_id: string
          id: string
          processed_at: string
          status: string
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          event_key: string
          event_payload?: Json | null
          external_event_id: string
          id?: string
          processed_at?: string
          status?: string
          workflow_id: string
          workspace_id: string
        }
        Update: {
          event_key?: string
          event_payload?: Json | null
          external_event_id?: string
          id?: string
          processed_at?: string
          status?: string
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processed_automation_events_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhook_events: {
        Row: {
          account_id: string | null
          event_id: string
          event_type: string | null
          id: string
          processed_at: string
          source: string
        }
        Insert: {
          account_id?: string | null
          event_id: string
          event_type?: string | null
          id?: string
          processed_at?: string
          source?: string
        }
        Update: {
          account_id?: string | null
          event_id?: string
          event_type?: string | null
          id?: string
          processed_at?: string
          source?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_route: Json | null
          phone: string | null
          preferred_currency: string
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_route?: Json | null
          phone?: string | null
          preferred_currency?: string
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_route?: Json | null
          phone?: string | null
          preferred_currency?: string
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prospect_companies: {
        Row: {
          archived_at: string | null
          city: string | null
          company_type: string | null
          country: string | null
          created_at: string
          created_by: string | null
          crm_company_id: string | null
          data_freshness_at: string | null
          data_source: string
          description: string | null
          domain: string | null
          employee_count: number | null
          employee_range: string | null
          excluded_reason: string | null
          fit_breakdown: Json
          fit_explanation: string | null
          fit_score: number | null
          icp_id: string | null
          id: string
          industry: string | null
          list_id: string | null
          name: string
          region: string | null
          reported_issue: string | null
          revenue_estimate: number | null
          signals: Json
          source_reference: string | null
          status: string
          sub_industry: string | null
          technologies: string[]
          updated_at: string
          website_url: string | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          city?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          data_freshness_at?: string | null
          data_source?: string
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          employee_range?: string | null
          excluded_reason?: string | null
          fit_breakdown?: Json
          fit_explanation?: string | null
          fit_score?: number | null
          icp_id?: string | null
          id?: string
          industry?: string | null
          list_id?: string | null
          name: string
          region?: string | null
          reported_issue?: string | null
          revenue_estimate?: number | null
          signals?: Json
          source_reference?: string | null
          status?: string
          sub_industry?: string | null
          technologies?: string[]
          updated_at?: string
          website_url?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          city?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          data_freshness_at?: string | null
          data_source?: string
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          employee_range?: string | null
          excluded_reason?: string | null
          fit_breakdown?: Json
          fit_explanation?: string | null
          fit_score?: number | null
          icp_id?: string | null
          id?: string
          industry?: string | null
          list_id?: string | null
          name?: string
          region?: string | null
          reported_issue?: string | null
          revenue_estimate?: number | null
          signals?: Json
          source_reference?: string | null
          status?: string
          sub_industry?: string | null
          technologies?: string[]
          updated_at?: string
          website_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_companies_crm_company_id_fkey"
            columns: ["crm_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_companies_icp_id_fkey"
            columns: ["icp_id"]
            isOneToOne: false
            referencedRelation: "ideal_customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_companies_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "prospect_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_contacts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          company_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          crm_contact_id: string | null
          data_freshness_at: string | null
          data_source: string
          department: string | null
          do_not_contact: boolean
          email: string | null
          email_confidence: number | null
          email_status: string
          email_verified_at: string | null
          first_name: string | null
          full_name: string
          id: string
          job_title: string | null
          last_name: string | null
          linkedin_url: string | null
          notes: string | null
          phone: string | null
          seniority: string | null
          source_reference: string | null
          status: string
          tags: string[]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          crm_contact_id?: string | null
          data_freshness_at?: string | null
          data_source?: string
          department?: string | null
          do_not_contact?: boolean
          email?: string | null
          email_confidence?: number | null
          email_status?: string
          email_verified_at?: string | null
          first_name?: string | null
          full_name: string
          id?: string
          job_title?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          seniority?: string | null
          source_reference?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          crm_contact_id?: string | null
          data_freshness_at?: string | null
          data_source?: string
          department?: string | null
          do_not_contact?: boolean
          email?: string | null
          email_confidence?: number | null
          email_status?: string
          email_verified_at?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          notes?: string | null
          phone?: string | null
          seniority?: string | null
          source_reference?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_contacts_crm_contact_id_fkey"
            columns: ["crm_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_lists: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icp_id: string | null
          id: string
          name: string
          offer_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icp_id?: string | null
          id?: string
          name: string
          offer_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icp_id?: string | null
          id?: string
          name?: string
          offer_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_lists_icp_id_fkey"
            columns: ["icp_id"]
            isOneToOne: false
            referencedRelation: "ideal_customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_lists_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "prospecting_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_lists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_research_findings: {
        Row: {
          company_id: string | null
          confidence: number | null
          contact_id: string | null
          created_at: string
          finding: string
          id: string
          offer_id: string | null
          relevance: string | null
          retrieved_at: string
          source_title: string | null
          source_url: string | null
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          confidence?: number | null
          contact_id?: string | null
          created_at?: string
          finding: string
          id?: string
          offer_id?: string | null
          relevance?: string | null
          retrieved_at?: string
          source_title?: string | null
          source_url?: string | null
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          confidence?: number | null
          contact_id?: string | null
          created_at?: string
          finding?: string
          id?: string
          offer_id?: string | null
          relevance?: string | null
          retrieved_at?: string
          source_title?: string | null
          source_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_research_findings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_research_findings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_research_findings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "prospecting_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_research_findings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_sources: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          id: string
          provider: string
          raw: Json | null
          result_status: string
          retrieved_at: string
          source_title: string | null
          source_url: string | null
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          provider: string
          raw?: Json | null
          result_status?: string
          retrieved_at?: string
          source_title?: string | null
          source_url?: string | null
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          provider?: string
          raw?: Json | null
          result_status?: string
          retrieved_at?: string
          source_title?: string | null
          source_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_sources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_sources_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_audit_events: {
        Row: {
          action: string
          created_at: string
          detail: Json
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          booking_url: string | null
          create_crm_lead: boolean
          created_at: string
          created_by: string | null
          crm_pipeline_id: string | null
          crm_stage_id: string | null
          daily_limit: number
          from_email: string | null
          from_name: string | null
          icp_id: string | null
          id: string
          launched_at: string | null
          list_id: string | null
          mailbox_id: string | null
          max_spacing_seconds: number
          min_spacing_seconds: number
          name: string
          offer_id: string | null
          paused_at: string | null
          paused_reason: string | null
          reply_to: string | null
          send_days: number[]
          send_window_end: number
          send_window_start: number
          status: string
          timezone: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          booking_url?: string | null
          create_crm_lead?: boolean
          created_at?: string
          created_by?: string | null
          crm_pipeline_id?: string | null
          crm_stage_id?: string | null
          daily_limit?: number
          from_email?: string | null
          from_name?: string | null
          icp_id?: string | null
          id?: string
          launched_at?: string | null
          list_id?: string | null
          mailbox_id?: string | null
          max_spacing_seconds?: number
          min_spacing_seconds?: number
          name: string
          offer_id?: string | null
          paused_at?: string | null
          paused_reason?: string | null
          reply_to?: string | null
          send_days?: number[]
          send_window_end?: number
          send_window_start?: number
          status?: string
          timezone?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          booking_url?: string | null
          create_crm_lead?: boolean
          created_at?: string
          created_by?: string | null
          crm_pipeline_id?: string | null
          crm_stage_id?: string | null
          daily_limit?: number
          from_email?: string | null
          from_name?: string | null
          icp_id?: string | null
          id?: string
          launched_at?: string | null
          list_id?: string | null
          mailbox_id?: string | null
          max_spacing_seconds?: number
          min_spacing_seconds?: number
          name?: string
          offer_id?: string | null
          paused_at?: string | null
          paused_reason?: string | null
          reply_to?: string | null
          send_days?: number[]
          send_window_end?: number
          send_window_start?: number
          status?: string
          timezone?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_campaigns_icp_id_fkey"
            columns: ["icp_id"]
            isOneToOne: false
            referencedRelation: "ideal_customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "prospect_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_campaigns_mailbox_id_fkey"
            columns: ["mailbox_id"]
            isOneToOne: false
            referencedRelation: "prospecting_mailboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_campaigns_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "prospecting_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_enrolments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          campaign_id: string
          company_id: string | null
          contact_id: string
          created_at: string
          crm_company_id: string | null
          crm_contact_id: string | null
          crm_deal_id: string | null
          current_step: number
          id: string
          next_send_at: string | null
          replied_at: string | null
          reply_classification: string | null
          status: string
          stop_reason: string | null
          stopped_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_id: string
          company_id?: string | null
          contact_id: string
          created_at?: string
          crm_company_id?: string | null
          crm_contact_id?: string | null
          crm_deal_id?: string | null
          current_step?: number
          id?: string
          next_send_at?: string | null
          replied_at?: string | null
          reply_classification?: string | null
          status?: string
          stop_reason?: string | null
          stopped_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_id?: string
          company_id?: string | null
          contact_id?: string
          created_at?: string
          crm_company_id?: string | null
          crm_contact_id?: string | null
          crm_deal_id?: string | null
          current_step?: number
          id?: string
          next_send_at?: string | null
          replied_at?: string | null
          reply_classification?: string | null
          status?: string
          stop_reason?: string | null
          stopped_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_enrolments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "prospecting_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_enrolments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "prospect_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_enrolments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_enrolments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string
          job_type: string
          last_error: string | null
          next_retry_at: string | null
          payload: Json
          progress: number
          result: Json | null
          retry_count: number
          started_at: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key: string
          job_type: string
          last_error?: string | null
          next_retry_at?: string | null
          payload?: Json
          progress?: number
          result?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string
          job_type?: string
          last_error?: string | null
          next_retry_at?: string | null
          payload?: Json
          progress?: number
          result?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_mailboxes: {
        Row: {
          access_token: string | null
          archived_at: string | null
          connected_at: string
          created_at: string
          created_by: string | null
          daily_limit: number
          display_name: string | null
          email: string
          id: string
          last_checked_at: string | null
          last_error: string | null
          provider: string
          refresh_token: string | null
          scopes: string[]
          status: string
          token_expires_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          access_token?: string | null
          archived_at?: string | null
          connected_at?: string
          created_at?: string
          created_by?: string | null
          daily_limit?: number
          display_name?: string | null
          email: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          provider: string
          refresh_token?: string | null
          scopes?: string[]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          access_token?: string | null
          archived_at?: string | null
          connected_at?: string
          created_at?: string
          created_by?: string | null
          daily_limit?: number
          display_name?: string | null
          email?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          provider?: string
          refresh_token?: string | null
          scopes?: string[]
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      prospecting_offers: {
        Row: {
          archived_at: string | null
          booking_url: string | null
          call_to_action: string | null
          competitors: string[]
          countries_served: string[]
          created_at: string
          created_by: string | null
          currency: string
          customer_examples: string | null
          customer_problem: string | null
          id: string
          key_benefits: string[]
          name: string
          notes: string | null
          pricing_model: string | null
          proof_points: string | null
          short_description: string | null
          status: string
          typical_contract_value: number | null
          updated_at: string
          value_proposition: string | null
          website_analysed_at: string | null
          website_analysis_pages: Json
          website_analysis_status: string
          website_analysis_summary: string | null
          website_url: string | null
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          booking_url?: string | null
          call_to_action?: string | null
          competitors?: string[]
          countries_served?: string[]
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_examples?: string | null
          customer_problem?: string | null
          id?: string
          key_benefits?: string[]
          name: string
          notes?: string | null
          pricing_model?: string | null
          proof_points?: string | null
          short_description?: string | null
          status?: string
          typical_contract_value?: number | null
          updated_at?: string
          value_proposition?: string | null
          website_analysed_at?: string | null
          website_analysis_pages?: Json
          website_analysis_status?: string
          website_analysis_summary?: string | null
          website_url?: string | null
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          booking_url?: string | null
          call_to_action?: string | null
          competitors?: string[]
          countries_served?: string[]
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_examples?: string | null
          customer_problem?: string | null
          id?: string
          key_benefits?: string[]
          name?: string
          notes?: string | null
          pricing_model?: string | null
          proof_points?: string | null
          short_description?: string | null
          status?: string
          typical_contract_value?: number | null
          updated_at?: string
          value_proposition?: string | null
          website_analysed_at?: string | null
          website_analysis_pages?: Json
          website_analysis_status?: string
          website_analysis_summary?: string | null
          website_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_offers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_outbound_emails: {
        Row: {
          attempts: number
          body_html: string
          campaign_id: string
          contact_id: string | null
          created_at: string
          enrolment_id: string
          error: string | null
          evidence: Json
          id: string
          idempotency_key: string
          provider_message_id: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          step_id: string | null
          step_number: number
          subject: string
          to_email: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attempts?: number
          body_html?: string
          campaign_id: string
          contact_id?: string | null
          created_at?: string
          enrolment_id: string
          error?: string | null
          evidence?: Json
          id?: string
          idempotency_key: string
          provider_message_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          step_id?: string | null
          step_number?: number
          subject?: string
          to_email: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attempts?: number
          body_html?: string
          campaign_id?: string
          contact_id?: string | null
          created_at?: string
          enrolment_id?: string
          error?: string | null
          evidence?: Json
          id?: string
          idempotency_key?: string
          provider_message_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          step_id?: string | null
          step_number?: number
          subject?: string
          to_email?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_outbound_emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "prospecting_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_outbound_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_outbound_emails_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "prospecting_enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_outbound_emails_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "prospecting_sequence_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_outbound_emails_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_plan_limits: {
        Row: {
          created_at: string
          exports_enabled: boolean
          max_campaigns: number
          max_mailboxes: number
          monthly_ai_ops: number
          monthly_discoveries: number
          monthly_emails: number
          monthly_verifications: number
          plan: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          exports_enabled?: boolean
          max_campaigns?: number
          max_mailboxes?: number
          monthly_ai_ops?: number
          monthly_discoveries?: number
          monthly_emails?: number
          monthly_verifications?: number
          plan: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          exports_enabled?: boolean
          max_campaigns?: number
          max_mailboxes?: number
          monthly_ai_ops?: number
          monthly_discoveries?: number
          monthly_emails?: number
          monthly_verifications?: number
          plan?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      prospecting_provider_connections: {
        Row: {
          capability: string
          config: Json
          created_at: string
          created_by: string | null
          id: string
          last_checked_at: string | null
          last_error: string | null
          provider: string
          scope: string
          secret_name: string | null
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          capability: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          provider: string
          scope?: string
          secret_name?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          capability?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          provider?: string
          scope?: string
          secret_name?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_provider_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_replies: {
        Row: {
          body_text: string
          campaign_id: string | null
          classification: string | null
          classification_confidence: number | null
          classification_reason: string | null
          contact_id: string | null
          corrected_at: string | null
          corrected_by: string | null
          corrected_classification: string | null
          created_at: string
          created_by: string | null
          crm_contact_id: string | null
          crm_deal_id: string | null
          crm_synced_at: string | null
          enrolment_id: string | null
          from_email: string
          handled: boolean
          id: string
          mailbox_id: string | null
          outbound_email_id: string | null
          received_at: string
          source: string
          subject: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body_text?: string
          campaign_id?: string | null
          classification?: string | null
          classification_confidence?: number | null
          classification_reason?: string | null
          contact_id?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          corrected_classification?: string | null
          created_at?: string
          created_by?: string | null
          crm_contact_id?: string | null
          crm_deal_id?: string | null
          crm_synced_at?: string | null
          enrolment_id?: string | null
          from_email: string
          handled?: boolean
          id?: string
          mailbox_id?: string | null
          outbound_email_id?: string | null
          received_at?: string
          source?: string
          subject?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body_text?: string
          campaign_id?: string | null
          classification?: string | null
          classification_confidence?: number | null
          classification_reason?: string | null
          contact_id?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          corrected_classification?: string | null
          created_at?: string
          created_by?: string | null
          crm_contact_id?: string | null
          crm_deal_id?: string | null
          crm_synced_at?: string | null
          enrolment_id?: string | null
          from_email?: string
          handled?: boolean
          id?: string
          mailbox_id?: string | null
          outbound_email_id?: string | null
          received_at?: string
          source?: string
          subject?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_replies_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "prospecting_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_replies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_replies_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "prospecting_enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_replies_mailbox_id_fkey"
            columns: ["mailbox_id"]
            isOneToOne: false
            referencedRelation: "prospecting_mailboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_replies_outbound_email_id_fkey"
            columns: ["outbound_email_id"]
            isOneToOne: false
            referencedRelation: "prospecting_outbound_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_send_lease: {
        Row: {
          id: string
          last_result: Json | null
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          id: string
          last_result?: Json | null
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          last_result?: Json | null
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prospecting_sequence_steps: {
        Row: {
          ai_generated: boolean
          body_template: string
          campaign_id: string
          created_at: string
          delay_days: number
          evidence: Json
          id: string
          step_number: number
          subject_template: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_generated?: boolean
          body_template?: string
          campaign_id: string
          created_at?: string
          delay_days?: number
          evidence?: Json
          id?: string
          step_number: number
          subject_template?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_generated?: boolean
          body_template?: string
          campaign_id?: string
          created_at?: string
          delay_days?: number
          evidence?: Json
          id?: string
          step_number?: number
          subject_template?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_sequence_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "prospecting_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospecting_sequence_steps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_suppressions: {
        Row: {
          created_at: string
          created_by: string | null
          domain: string | null
          email: string | null
          id: string
          reason: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          email?: string | null
          id?: string
          reason?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain?: string | null
          email?: string | null
          id?: string
          reason?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_suppressions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_usage_events: {
        Row: {
          created_at: string
          error_category: string | null
          id: string
          model: string | null
          operation: string
          prompt_version: string | null
          provider: string | null
          related_id: string | null
          related_table: string | null
          status: string
          tokens: number | null
          units: number
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          error_category?: string | null
          id?: string
          model?: string | null
          operation: string
          prompt_version?: string | null
          provider?: string | null
          related_id?: string | null
          related_table?: string | null
          status?: string
          tokens?: number | null
          units?: number
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          error_category?: string | null
          id?: string
          model?: string | null
          operation?: string
          prompt_version?: string | null
          provider?: string | null
          related_id?: string | null
          related_table?: string | null
          status?: string
          tokens?: number | null
          units?: number
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_usage_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_workspace_controls: {
        Row: {
          created_at: string
          enabled: boolean
          limit_overrides: Json
          suspended: boolean
          suspension_reason: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          limit_overrides?: Json
          suspended?: boolean
          suspension_reason?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          limit_overrides?: Json
          suspended?: boolean
          suspension_reason?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_workspace_controls_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string | null
          referrer_user_id: string
          reward_credits: number
          status: string
          workspace_id: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referrer_user_id: string
          reward_credits?: number
          status?: string
          workspace_id?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referrer_user_id?: string
          reward_credits?: number
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      regional_prices: {
        Row: {
          active: boolean
          amount_minor: number
          billing_cycle: string
          created_at: string
          currency: string
          id: string
          paystack_plan_code: string | null
          plan_key: string
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_minor: number
          billing_cycle: string
          created_at?: string
          currency: string
          id?: string
          paystack_plan_code?: string | null
          plan_key: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_minor?: number
          billing_cycle?: string
          created_at?: string
          currency?: string
          id?: string
          paystack_plan_code?: string | null
          plan_key?: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      roi_calculator_settings: {
        Row: {
          booking_url: string
          created_at: string
          high_admin_thresholds: Json
          high_opportunity_thresholds: Json
          id: string
          updated_at: string
        }
        Insert: {
          booking_url?: string
          created_at?: string
          high_admin_thresholds?: Json
          high_opportunity_thresholds?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          booking_url?: string
          created_at?: string
          high_admin_thresholds?: Json
          high_opportunity_thresholds?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      roi_calculator_submissions: {
        Row: {
          average_customer_value: number
          business_name: string | null
          business_type: string | null
          consent: boolean
          contact_id: string | null
          conversion_rate: number
          created_at: string
          currency: string
          email: string
          estimated_annual_opportunity: number
          estimated_current_customers: number
          estimated_current_revenue: number
          estimated_manual_admin_cost: number
          estimated_missed_leads: number
          estimated_monthly_opportunity: number
          estimated_recoverable_customers: number
          estimated_recoverable_revenue: number
          full_name: string
          id: string
          lead_status: string | null
          leads_per_month: number
          manual_follow_up_hours: number
          missed_follow_up_percentage: number
          monthly_software_cost: number
          phone: string | null
          preferred_contact_method: string | null
          recommendation: string | null
          source: string | null
          staff_cost_per_hour: number
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          workspace_id: string | null
        }
        Insert: {
          average_customer_value?: number
          business_name?: string | null
          business_type?: string | null
          consent?: boolean
          contact_id?: string | null
          conversion_rate?: number
          created_at?: string
          currency?: string
          email: string
          estimated_annual_opportunity?: number
          estimated_current_customers?: number
          estimated_current_revenue?: number
          estimated_manual_admin_cost?: number
          estimated_missed_leads?: number
          estimated_monthly_opportunity?: number
          estimated_recoverable_customers?: number
          estimated_recoverable_revenue?: number
          full_name: string
          id?: string
          lead_status?: string | null
          leads_per_month?: number
          manual_follow_up_hours?: number
          missed_follow_up_percentage?: number
          monthly_software_cost?: number
          phone?: string | null
          preferred_contact_method?: string | null
          recommendation?: string | null
          source?: string | null
          staff_cost_per_hour?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          workspace_id?: string | null
        }
        Update: {
          average_customer_value?: number
          business_name?: string | null
          business_type?: string | null
          consent?: boolean
          contact_id?: string | null
          conversion_rate?: number
          created_at?: string
          currency?: string
          email?: string
          estimated_annual_opportunity?: number
          estimated_current_customers?: number
          estimated_current_revenue?: number
          estimated_manual_admin_cost?: number
          estimated_missed_leads?: number
          estimated_monthly_opportunity?: number
          estimated_recoverable_customers?: number
          estimated_recoverable_revenue?: number
          full_name?: string
          id?: string
          lead_status?: string | null
          leads_per_month?: number
          manual_follow_up_hours?: number
          missed_follow_up_percentage?: number
          monthly_software_cost?: number
          phone?: string | null
          preferred_contact_method?: string | null
          recommendation?: string | null
          source?: string | null
          staff_cost_per_hour?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      sales_closer_settings: {
        Row: {
          booking_page_id: string | null
          channels: string[]
          created_at: string
          escalation_enabled: boolean
          follow_up_delay_hours: number
          follow_up_enabled: boolean
          id: string
          is_enabled: boolean
          max_follow_ups: number
          mode: string
          system_prompt: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          booking_page_id?: string | null
          channels?: string[]
          created_at?: string
          escalation_enabled?: boolean
          follow_up_delay_hours?: number
          follow_up_enabled?: boolean
          id?: string
          is_enabled?: boolean
          max_follow_ups?: number
          mode?: string
          system_prompt?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          booking_page_id?: string | null
          channels?: string[]
          created_at?: string
          escalation_enabled?: boolean
          follow_up_delay_hours?: number
          follow_up_enabled?: boolean
          id?: string
          is_enabled?: boolean
          max_follow_ups?: number
          mode?: string
          system_prompt?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_closer_settings_booking_page_id_fkey"
            columns: ["booking_page_id"]
            isOneToOne: false
            referencedRelation: "booking_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_closer_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_conversations: {
        Row: {
          ai_generated: boolean
          ai_model: string | null
          channel: string
          created_at: string
          direction: string
          id: string
          intent: string | null
          intent_confidence: number | null
          lead_id: string
          message_body: string
          meta: Json | null
          status: string
          workspace_id: string
        }
        Insert: {
          ai_generated?: boolean
          ai_model?: string | null
          channel?: string
          created_at?: string
          direction?: string
          id?: string
          intent?: string | null
          intent_confidence?: number | null
          lead_id: string
          message_body: string
          meta?: Json | null
          status?: string
          workspace_id: string
        }
        Update: {
          ai_generated?: boolean
          ai_model?: string | null
          channel?: string
          created_at?: string
          direction?: string
          id?: string
          intent?: string | null
          intent_confidence?: number | null
          lead_id?: string
          message_body?: string
          meta?: Json | null
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          automation_id: string | null
          created_at: string
          error: string | null
          id: string
          lead_id: string
          payload: Json | null
          run_at: string
          status: string
          step_index: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          automation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          lead_id: string
          payload?: Json | null
          run_at: string
          status?: string
          step_index: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          automation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          lead_id?: string
          payload?: Json | null
          run_at?: string
          status?: string
          step_index?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payment_accounts: {
        Row: {
          charges_enabled: boolean
          connected_at: string | null
          connected_by: string | null
          country: string | null
          created_at: string
          default_currency: string | null
          details_submitted: boolean
          disconnected_at: string | null
          id: string
          last_synced_at: string | null
          livemode: boolean
          payouts_enabled: boolean
          provider: string
          stripe_account_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          charges_enabled?: boolean
          connected_at?: string | null
          connected_by?: string | null
          country?: string | null
          created_at?: string
          default_currency?: string | null
          details_submitted?: boolean
          disconnected_at?: string | null
          id?: string
          last_synced_at?: string | null
          livemode?: boolean
          payouts_enabled?: boolean
          provider?: string
          stripe_account_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          charges_enabled?: boolean
          connected_at?: string | null
          connected_by?: string | null
          country?: string | null
          created_at?: string
          default_currency?: string | null
          details_submitted?: boolean
          disconnected_at?: string | null
          id?: string
          last_synced_at?: string | null
          livemode?: boolean
          payouts_enabled?: boolean
          provider?: string
          stripe_account_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_payment_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sender_profiles: {
        Row: {
          address: string
          approved_at: string | null
          approved_by: string | null
          channel: Database["public"]["Enums"]["sender_channel"]
          created_at: string
          display_name: string
          id: string
          is_default: boolean
          label: string
          metadata: Json
          rejection_reason: string | null
          status: Database["public"]["Enums"]["sender_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          address: string
          approved_at?: string | null
          approved_by?: string | null
          channel: Database["public"]["Enums"]["sender_channel"]
          created_at?: string
          display_name: string
          id?: string
          is_default?: boolean
          label: string
          metadata?: Json
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["sender_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          address?: string
          approved_at?: string | null
          approved_by?: string | null
          channel?: Database["public"]["Enums"]["sender_channel"]
          created_at?: string
          display_name?: string
          id?: string
          is_default?: boolean
          label?: string
          metadata?: Json
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["sender_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sender_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          unit_amount: number
          variant_id: string | null
          workspace_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          unit_amount: number
          variant_id?: string | null
          workspace_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          unit_amount?: number
          variant_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "shop_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "shop_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_cart_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_carts: {
        Row: {
          abandoned_at: string | null
          converted_order_id: string | null
          created_at: string
          currency: string
          discount_code: string | null
          email: string | null
          id: string
          status: string
          store_id: string
          token: string
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          abandoned_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          currency?: string
          discount_code?: string | null
          email?: string | null
          id?: string
          status?: string
          store_id: string
          token: string
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          abandoned_at?: string | null
          converted_order_id?: string | null
          created_at?: string
          currency?: string
          discount_code?: string | null
          email?: string | null
          id?: string
          status?: string
          store_id?: string
          token?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_carts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_collection_products: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          position: number
          product_id: string
          workspace_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          position?: number
          product_id: string
          workspace_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "shop_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_collection_products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_public: boolean
          name: string
          position: number
          slug: string
          store_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          name: string
          position?: number
          slug: string
          store_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          name?: string
          position?: number
          slug?: string
          store_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_collections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_collections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_communities: {
        Row: {
          access_type: string
          cover_url: string | null
          created_at: string
          description: string | null
          guidelines: string | null
          id: string
          member_count: number
          name: string
          product_id: string | null
          slug: string
          status: string
          store_id: string
          tagline: string | null
          updated_at: string
          visibility: string
          workspace_id: string
        }
        Insert: {
          access_type?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          guidelines?: string | null
          id?: string
          member_count?: number
          name: string
          product_id?: string | null
          slug: string
          status?: string
          store_id: string
          tagline?: string | null
          updated_at?: string
          visibility?: string
          workspace_id: string
        }
        Update: {
          access_type?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          guidelines?: string | null
          id?: string
          member_count?: number
          name?: string
          product_id?: string | null
          slug?: string
          status?: string
          store_id?: string
          tagline?: string | null
          updated_at?: string
          visibility?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_communities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_communities_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_communities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_community_comments: {
        Row: {
          author_name: string | null
          author_user_id: string | null
          body: string
          community_id: string
          created_at: string
          id: string
          post_id: string
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          workspace_id: string
        }
        Insert: {
          author_name?: string | null
          author_user_id?: string | null
          body: string
          community_id: string
          created_at?: string
          id?: string
          post_id: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          workspace_id: string
        }
        Update: {
          author_name?: string | null
          author_user_id?: string | null
          body?: string
          community_id?: string
          created_at?: string
          id?: string
          post_id?: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_community_comments_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "shop_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "shop_community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_community_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_community_members: {
        Row: {
          avatar_url: string | null
          community_id: string
          display_name: string | null
          email: string | null
          id: string
          joined_at: string
          last_seen_at: string | null
          order_id: string | null
          role: string
          status: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          community_id: string
          display_name?: string | null
          email?: string | null
          id?: string
          joined_at?: string
          last_seen_at?: string | null
          order_id?: string | null
          role?: string
          status?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          community_id?: string
          display_name?: string | null
          email?: string | null
          id?: string
          joined_at?: string
          last_seen_at?: string | null
          order_id?: string | null
          role?: string
          status?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "shop_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_community_members_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_community_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_community_post_likes: {
        Row: {
          community_id: string
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_community_post_likes_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "shop_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "shop_community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_community_posts: {
        Row: {
          author_name: string | null
          author_user_id: string | null
          body: string
          comment_count: number
          community_id: string
          created_at: string
          id: string
          is_pinned: boolean
          like_count: number
          media_url: string | null
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          space_id: string | null
          title: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_name?: string | null
          author_user_id?: string | null
          body: string
          comment_count?: number
          community_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          like_count?: number
          media_url?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          space_id?: string | null
          title?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          author_name?: string | null
          author_user_id?: string | null
          body?: string
          comment_count?: number
          community_id?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          like_count?: number
          media_url?: string | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          space_id?: string | null
          title?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "shop_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_community_posts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "shop_community_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_community_posts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_community_spaces: {
        Row: {
          community_id: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          position: number
          slug: string
          workspace_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          position?: number
          slug: string
          workspace_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          slug?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_community_spaces_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "shop_communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_community_spaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_customers: {
        Row: {
          contact_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_order_at: string | null
          marketing_opt_in: boolean
          phone: string | null
          store_id: string
          stripe_customer_id: string | null
          total_orders: number
          total_spent: number
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          last_order_at?: string | null
          marketing_opt_in?: boolean
          phone?: string | null
          store_id: string
          stripe_customer_id?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_order_at?: string | null
          marketing_opt_in?: boolean
          phone?: string | null
          store_id?: string
          stripe_customer_id?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_customers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_customers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_discounts: {
        Row: {
          applies_to_product_ids: string[]
          code: string
          created_at: string
          currency: string | null
          description: string | null
          discount_type: string
          ends_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          min_subtotal: number | null
          redemption_count: number
          starts_at: string | null
          store_id: string
          updated_at: string
          value: number
          workspace_id: string
        }
        Insert: {
          applies_to_product_ids?: string[]
          code: string
          created_at?: string
          currency?: string | null
          description?: string | null
          discount_type?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          min_subtotal?: number | null
          redemption_count?: number
          starts_at?: string | null
          store_id: string
          updated_at?: string
          value: number
          workspace_id: string
        }
        Update: {
          applies_to_product_ids?: string[]
          code?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          discount_type?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          min_subtotal?: number | null
          redemption_count?: number
          starts_at?: string | null
          store_id?: string
          updated_at?: string
          value?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_discounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_discounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_entitlements: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          granted_at: string
          id: string
          kind: string
          metadata: Json
          order_id: string | null
          product_id: string | null
          resource_label: string | null
          resource_ref: string
          revoke_reason: string | null
          revoked_at: string | null
          source: string
          status: string
          store_id: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          kind?: string
          metadata?: Json
          order_id?: string | null
          product_id?: string | null
          resource_label?: string | null
          resource_ref: string
          revoke_reason?: string | null
          revoked_at?: string | null
          source?: string
          status?: string
          store_id: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          kind?: string
          metadata?: Json
          order_id?: string | null
          product_id?: string | null
          resource_label?: string | null
          resource_ref?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          source?: string
          status?: string
          store_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_entitlements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_fulfilment_items: {
        Row: {
          created_at: string
          fulfilment_id: string
          id: string
          order_item_id: string
          quantity: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          fulfilment_id: string
          id?: string
          order_item_id: string
          quantity?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          fulfilment_id?: string
          id?: string
          order_item_id?: string
          quantity?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_fulfilment_items_fulfilment_id_fkey"
            columns: ["fulfilment_id"]
            isOneToOne: false
            referencedRelation: "shop_fulfilments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_fulfilment_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "shop_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_fulfilment_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_fulfilments: {
        Row: {
          carrier: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          notified_at: string | null
          order_id: string
          status: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          notified_at?: string | null
          order_id: string
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          notified_at?: string | null
          order_id?: string
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_fulfilments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_fulfilments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_inventory_movements: {
        Row: {
          created_at: string
          delta: number
          id: string
          product_id: string
          reason: string
          reference: string | null
          variant_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          product_id: string
          reason: string
          reference?: string | null
          variant_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          product_id?: string
          reason?: string
          reference?: string | null
          variant_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "shop_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_inventory_movements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_items: {
        Row: {
          created_at: string
          fulfilled_quantity: number
          id: string
          metadata: Json
          name: string
          order_id: string
          product_id: string | null
          product_type: string
          quantity: number
          requires_shipping: boolean
          sku: string | null
          total_amount: number
          unit_amount: number
          variant_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          fulfilled_quantity?: number
          id?: string
          metadata?: Json
          name: string
          order_id: string
          product_id?: string | null
          product_type?: string
          quantity?: number
          requires_shipping?: boolean
          sku?: string | null
          total_amount?: number
          unit_amount?: number
          variant_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          fulfilled_quantity?: number
          id?: string
          metadata?: Json
          name?: string
          order_id?: string
          product_id?: string | null
          product_type?: string
          quantity?: number
          requires_shipping?: boolean
          sku?: string | null
          total_amount?: number
          unit_amount?: number
          variant_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "shop_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_status_history: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          source: string
          to_status: string
          workspace_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          source?: string
          to_status: string
          workspace_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          source?: string
          to_status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_status_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          billing_address: Json
          cancelled_at: string | null
          contact_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          discount_amount: number
          discount_code: string | null
          email: string
          fulfilment_status: string
          full_name: string | null
          id: string
          notes: string | null
          order_number: string
          paid_at: string | null
          phone: string | null
          refunded_amount: number
          shipping_address: Json
          shipping_amount: number
          shipping_rate_id: string | null
          status: string
          store_id: string
          stripe_account_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          subtotal_amount: number
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          billing_address?: Json
          cancelled_at?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_amount?: number
          discount_code?: string | null
          email: string
          fulfilment_status?: string
          full_name?: string | null
          id?: string
          notes?: string | null
          order_number: string
          paid_at?: string | null
          phone?: string | null
          refunded_amount?: number
          shipping_address?: Json
          shipping_amount?: number
          shipping_rate_id?: string | null
          status?: string
          store_id: string
          stripe_account_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          billing_address?: Json
          cancelled_at?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_amount?: number
          discount_code?: string | null
          email?: string
          fulfilment_status?: string
          full_name?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          phone?: string | null
          refunded_amount?: number
          shipping_address?: Json
          shipping_amount?: number
          shipping_rate_id?: string | null
          status?: string
          store_id?: string
          stripe_account_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          subtotal_amount?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "shop_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_orders_shipping_rate_id_fkey"
            columns: ["shipping_rate_id"]
            isOneToOne: false
            referencedRelation: "shop_shipping_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_orders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          position: number
          product_id: string
          storage_path: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          position?: number
          product_id: string
          storage_path: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          position?: number
          product_id?: string
          storage_path?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_product_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_media: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          position: number
          product_id: string
          url: string
          workspace_id: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id: string
          url: string
          workspace_id: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_product_media_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_prices: {
        Row: {
          amount: number
          billing_interval: string | null
          billing_type: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          product_id: string
          stripe_price_id: string | null
          updated_at: string
          variant_id: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          billing_interval?: string | null
          billing_type?: string
          created_at?: string
          currency: string
          id?: string
          is_active?: boolean
          product_id: string
          stripe_price_id?: string | null
          updated_at?: string
          variant_id?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          billing_interval?: string | null
          billing_type?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          product_id?: string
          stripe_price_id?: string | null
          updated_at?: string
          variant_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_product_prices_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "shop_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_product_prices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_variants: {
        Row: {
          created_at: string
          id: string
          inventory_quantity: number
          is_active: boolean
          name: string
          options: Json
          position: number
          price_amount: number | null
          product_id: string
          sku: string | null
          updated_at: string
          weight_grams: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_quantity?: number
          is_active?: boolean
          name: string
          options?: Json
          position?: number
          price_amount?: number | null
          product_id: string
          sku?: string | null
          updated_at?: string
          weight_grams?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_quantity?: number
          is_active?: boolean
          name?: string
          options?: Json
          position?: number
          price_amount?: number | null
          product_id?: string
          sku?: string | null
          updated_at?: string
          weight_grams?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_product_variants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          academy_course_slug: string | null
          access_duration_days: number | null
          allow_backorder: boolean
          appointment_type_id: string | null
          billing_interval: string | null
          billing_type: string
          booking_page_id: string | null
          button_text: string
          compare_at_amount: number | null
          created_at: string
          currency: string
          deliverables: string | null
          description: string | null
          download_expiry_days: number | null
          download_limit: number | null
          id: string
          inventory_quantity: number
          low_stock_threshold: number | null
          metadata: Json
          name: string
          onboarding_instructions: string | null
          price_amount: number
          product_type: string
          requires_shipping: boolean
          seo_description: string | null
          seo_title: string | null
          shipping_class: string | null
          short_description: string | null
          sku: string | null
          slug: string
          status: string
          store_id: string
          tags: string[]
          tax_category: string
          track_inventory: boolean
          trial_days: number | null
          updated_at: string
          visibility: string
          weight_grams: number | null
          workspace_id: string
        }
        Insert: {
          academy_course_slug?: string | null
          access_duration_days?: number | null
          allow_backorder?: boolean
          appointment_type_id?: string | null
          billing_interval?: string | null
          billing_type?: string
          booking_page_id?: string | null
          button_text?: string
          compare_at_amount?: number | null
          created_at?: string
          currency?: string
          deliverables?: string | null
          description?: string | null
          download_expiry_days?: number | null
          download_limit?: number | null
          id?: string
          inventory_quantity?: number
          low_stock_threshold?: number | null
          metadata?: Json
          name: string
          onboarding_instructions?: string | null
          price_amount?: number
          product_type?: string
          requires_shipping?: boolean
          seo_description?: string | null
          seo_title?: string | null
          shipping_class?: string | null
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: string
          store_id: string
          tags?: string[]
          tax_category?: string
          track_inventory?: boolean
          trial_days?: number | null
          updated_at?: string
          visibility?: string
          weight_grams?: number | null
          workspace_id: string
        }
        Update: {
          academy_course_slug?: string | null
          access_duration_days?: number | null
          allow_backorder?: boolean
          appointment_type_id?: string | null
          billing_interval?: string | null
          billing_type?: string
          booking_page_id?: string | null
          button_text?: string
          compare_at_amount?: number | null
          created_at?: string
          currency?: string
          deliverables?: string | null
          description?: string | null
          download_expiry_days?: number | null
          download_limit?: number | null
          id?: string
          inventory_quantity?: number
          low_stock_threshold?: number | null
          metadata?: Json
          name?: string
          onboarding_instructions?: string | null
          price_amount?: number
          product_type?: string
          requires_shipping?: boolean
          seo_description?: string | null
          seo_title?: string | null
          shipping_class?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: string
          store_id?: string
          tags?: string[]
          tax_category?: string
          track_inventory?: boolean
          trial_days?: number | null
          updated_at?: string
          visibility?: string
          weight_grams?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_products_booking_page_id_fkey"
            columns: ["booking_page_id"]
            isOneToOne: false
            referencedRelation: "booking_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_shipping_rates: {
        Row: {
          amount: number
          created_at: string
          delivery_estimate: string | null
          free_over_amount: number | null
          id: string
          is_active: boolean
          name: string
          rate_type: string
          shipping_class: string | null
          updated_at: string
          workspace_id: string
          zone_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          delivery_estimate?: string | null
          free_over_amount?: number | null
          id?: string
          is_active?: boolean
          name: string
          rate_type?: string
          shipping_class?: string | null
          updated_at?: string
          workspace_id: string
          zone_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          delivery_estimate?: string | null
          free_over_amount?: number | null
          id?: string
          is_active?: boolean
          name?: string
          rate_type?: string
          shipping_class?: string | null
          updated_at?: string
          workspace_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_shipping_rates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_shipping_rates_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "shop_shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_shipping_zones: {
        Row: {
          countries: string[]
          created_at: string
          id: string
          is_active: boolean
          name: string
          regions: string[]
          store_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          countries?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          regions?: string[]
          store_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          countries?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          regions?: string[]
          store_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_shipping_zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_shipping_zones_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_store_branding: {
        Row: {
          accent_color: string
          cover_url: string | null
          created_at: string
          font_family: string
          footer_text: string | null
          id: string
          logo_url: string | null
          navigation: Json
          primary_color: string
          seo_description: string | null
          seo_title: string | null
          social_links: Json
          store_id: string
          tagline: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accent_color?: string
          cover_url?: string | null
          created_at?: string
          font_family?: string
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          navigation?: Json
          primary_color?: string
          seo_description?: string | null
          seo_title?: string | null
          social_links?: Json
          store_id: string
          tagline?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accent_color?: string
          cover_url?: string | null
          created_at?: string
          font_family?: string
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          navigation?: Json
          primary_color?: string
          seo_description?: string | null
          seo_title?: string | null
          social_links?: Json
          store_id?: string
          tagline?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_store_branding_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_store_branding_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_store_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          store_id: string
          updated_at: string
          verified_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          store_id: string
          updated_at?: string
          verified_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          store_id?: string
          updated_at?: string
          verified_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_store_domains_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_store_domains_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_stores: {
        Row: {
          business_address: Json
          business_email: string | null
          business_name: string | null
          business_phone: string | null
          countries_served: string[]
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          is_primary: boolean
          name: string
          platform_fee_bps: number
          policies: Json
          product_types: string[]
          published_at: string | null
          setup_completed_at: string | null
          setup_step: number
          slug: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          business_address?: Json
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          countries_served?: string[]
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_primary?: boolean
          name: string
          platform_fee_bps?: number
          policies?: Json
          product_types?: string[]
          published_at?: string | null
          setup_completed_at?: string | null
          setup_step?: number
          slug: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          business_address?: Json
          business_email?: string | null
          business_name?: string | null
          business_phone?: string | null
          countries_served?: string[]
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          platform_fee_bps?: number
          policies?: Json
          product_types?: string[]
          published_at?: string | null
          setup_completed_at?: string | null
          setup_step?: number
          slug?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_stores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failure_reason: string | null
          fee_amount: number
          id: string
          order_id: string | null
          status: string
          store_id: string
          stripe_object_id: string | null
          type: string
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          failure_reason?: string | null
          fee_amount?: number
          id?: string
          order_id?: string | null
          status?: string
          store_id: string
          stripe_object_id?: string | null
          type: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          fee_amount?: number
          id?: string
          order_id?: string | null
          status?: string
          store_id?: string
          stripe_object_id?: string | null
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "shop_stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      site_custom_code: {
        Row: {
          body_code: string
          body_enabled: boolean
          head_code: string
          head_enabled: boolean
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_code?: string
          body_enabled?: boolean
          head_code?: string
          head_enabled?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_code?: string
          body_enabled?: boolean
          head_code?: string
          head_enabled?: boolean
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      smart_lists: {
        Row: {
          created_at: string
          filters: Json
          icon: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          icon?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          icon?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_lists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          contact_id: string | null
          created_at: string
          direction: string
          error: string | null
          from_number: string | null
          id: string
          message: string
          provider: string
          provider_message_id: string | null
          sender_profile_id: string | null
          status: string
          to_number: string
          workspace_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          from_number?: string | null
          id?: string
          message: string
          provider: string
          provider_message_id?: string | null
          sender_profile_id?: string | null
          status?: string
          to_number: string
          workspace_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          from_number?: string | null
          id?: string
          message?: string
          provider?: string
          provider_message_id?: string | null
          sender_profile_id?: string | null
          status?: string
          to_number?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "sender_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_senders: {
        Row: {
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          monthly_fee_cents: number
          phone_number: string | null
          sender_profile_id: string
          sender_type: string
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          monthly_fee_cents?: number
          phone_number?: string | null
          sender_profile_id: string
          sender_type?: string
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          monthly_fee_cents?: number
          phone_number?: string | null
          sender_profile_id?: string
          sender_type?: string
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_senders_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: true
            referencedRelation: "sender_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_settings: {
        Row: {
          account_sid: string | null
          auth_token_encrypted: string
          created_at: string
          from_number: string | null
          id: string
          is_active: boolean
          provider: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_sid?: string | null
          auth_token_encrypted: string
          created_at?: string
          from_number?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_sid?: string | null
          auth_token_encrypted?: string
          created_at?: string
          from_number?: string | null
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      social_keyword_triggers: {
        Row: {
          automation_id: string
          created_at: string
          id: string
          is_active: boolean
          keyword: string
          match_mode: string
          platform: string
          post_id: string | null
          trigger_source: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
          match_mode?: string
          platform: string
          post_id?: string | null
          trigger_source: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
          match_mode?: string
          platform?: string
          post_id?: string | null
          trigger_source?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      social_messages: {
        Row: {
          body: string | null
          channel_type: string
          created_at: string
          direction: string
          error: string | null
          external_id: string | null
          id: string
          lead_id: string | null
          parent_comment_id: string | null
          platform: string
          post_id: string | null
          sender_id: string | null
          sender_username: string | null
          status: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          channel_type: string
          created_at?: string
          direction: string
          error?: string | null
          external_id?: string | null
          id?: string
          lead_id?: string | null
          parent_comment_id?: string | null
          platform: string
          post_id?: string | null
          sender_id?: string | null
          sender_username?: string | null
          status?: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          channel_type?: string
          created_at?: string
          direction?: string
          error?: string | null
          external_id?: string | null
          id?: string
          lead_id?: string | null
          parent_comment_id?: string | null
          platform?: string
          post_id?: string | null
          sender_id?: string | null
          sender_username?: string | null
          status?: string
          workspace_id?: string
        }
        Relationships: []
      }
      social_share_log: {
        Row: {
          blog_post_id: string
          created_at: string
          error: string | null
          external_id: string | null
          id: string
          platform: string
          status: string
        }
        Insert: {
          blog_post_id: string
          created_at?: string
          error?: string | null
          external_id?: string | null
          id?: string
          platform: string
          status?: string
        }
        Update: {
          blog_post_id?: string
          created_at?: string
          error?: string | null
          external_id?: string | null
          id?: string
          platform?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_share_log_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      store_bundles: {
        Row: {
          badge: string | null
          best_for: string | null
          created_at: string
          delivery_estimate: string | null
          description: string | null
          id: string
          includes: Json
          is_published: boolean
          name: string
          position: number
          price_pence: number
          product_slugs: Json
          saving_pence: number
          slug: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          best_for?: string | null
          created_at?: string
          delivery_estimate?: string | null
          description?: string | null
          id?: string
          includes?: Json
          is_published?: boolean
          name: string
          position?: number
          price_pence?: number
          product_slugs?: Json
          saving_pence?: number
          slug: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          best_for?: string | null
          created_at?: string
          delivery_estimate?: string | null
          description?: string | null
          id?: string
          includes?: Json
          is_published?: boolean
          name?: string
          position?: number
          price_pence?: number
          product_slugs?: Json
          saving_pence?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_published: boolean
          name: string
          position: number
          slug: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          name: string
          position?: number
          slug: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          name?: string
          position?: number
          slug?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_order_items: {
        Row: {
          bundle_slug: string | null
          configuration: Json
          created_at: string
          id: string
          kind: string
          name: string
          order_id: string
          plan_slug: string | null
          product_slug: string | null
          quantity: number
          unit_price_pence: number
        }
        Insert: {
          bundle_slug?: string | null
          configuration?: Json
          created_at?: string
          id?: string
          kind?: string
          name: string
          order_id: string
          plan_slug?: string | null
          product_slug?: string | null
          quantity?: number
          unit_price_pence?: number
        }
        Update: {
          bundle_slug?: string | null
          configuration?: Json
          created_at?: string
          id?: string
          kind?: string
          name?: string
          order_id?: string
          plan_slug?: string | null
          product_slug?: string | null
          quantity?: number
          unit_price_pence?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          business_name: string | null
          created_at: string
          currency: string
          email: string
          full_name: string | null
          id: string
          industry: string | null
          monthly_total_pence: number
          notes: string | null
          paid_at: string | null
          phone: string | null
          plan_slug: string | null
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          subtotal_pence: number
          total_pence: number
          updated_at: string
          user_id: string | null
          website: string | null
          workspace_id: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          currency?: string
          email: string
          full_name?: string | null
          id?: string
          industry?: string | null
          monthly_total_pence?: number
          notes?: string | null
          paid_at?: string | null
          phone?: string | null
          plan_slug?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          subtotal_pence?: number
          total_pence?: number
          updated_at?: string
          user_id?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          currency?: string
          email?: string
          full_name?: string | null
          id?: string
          industry?: string | null
          monthly_total_pence?: number
          notes?: string | null
          paid_at?: string | null
          phone?: string | null
          plan_slug?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          subtotal_pence?: number
          total_pence?: number
          updated_at?: string
          user_id?: string | null
          website?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      store_plans: {
        Row: {
          billing_interval: string
          created_at: string
          description: string | null
          features: Json
          id: string
          is_published: boolean
          name: string
          position: number
          price_pence: number
          price_prefix: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_published?: boolean
          name: string
          position?: number
          price_pence?: number
          price_prefix?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_published?: boolean
          name?: string
          position?: number
          price_pence?: number
          price_prefix?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_problems: {
        Row: {
          category_slug: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_published: boolean
          position: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category_slug?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          position?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category_slug?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          position?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_products: {
        Row: {
          badge: string | null
          base_price_pence: number
          best_for: Json
          category_slug: string
          config_schema: Json
          created_at: string
          deliverables: Json
          delivery_days: number | null
          delivery_estimate: string | null
          id: string
          industries: Json
          integrations: Json
          is_popular: boolean
          is_published: boolean
          level: string
          managed_support: boolean
          name: string
          outcome: string
          position: number
          problem_slugs: Json
          problem_statement: string | null
          slug: string
          summary: string | null
          tags: Json
          updated_at: string
          workflow: Json
        }
        Insert: {
          badge?: string | null
          base_price_pence?: number
          best_for?: Json
          category_slug: string
          config_schema?: Json
          created_at?: string
          deliverables?: Json
          delivery_days?: number | null
          delivery_estimate?: string | null
          id?: string
          industries?: Json
          integrations?: Json
          is_popular?: boolean
          is_published?: boolean
          level?: string
          managed_support?: boolean
          name: string
          outcome: string
          position?: number
          problem_slugs?: Json
          problem_statement?: string | null
          slug: string
          summary?: string | null
          tags?: Json
          updated_at?: string
          workflow?: Json
        }
        Update: {
          badge?: string | null
          base_price_pence?: number
          best_for?: Json
          category_slug?: string
          config_schema?: Json
          created_at?: string
          deliverables?: Json
          delivery_days?: number | null
          delivery_estimate?: string | null
          id?: string
          industries?: Json
          integrations?: Json
          is_popular?: boolean
          is_published?: boolean
          level?: string
          managed_support?: boolean
          name?: string
          outcome?: string
          position?: number
          problem_slugs?: Json
          problem_statement?: string | null
          slug?: string
          summary?: string | null
          tags?: Json
          updated_at?: string
          workflow?: Json
        }
        Relationships: []
      }
      store_project_updates: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string
          id: string
          project_id: string
          title: string
          update_type: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          project_id: string
          title: string
          update_type?: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          project_id?: string
          title?: string
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "store_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      store_projects: {
        Row: {
          approval_requested_at: string | null
          approved_at: string | null
          bundle_slug: string | null
          configuration: Json
          created_at: string
          go_live_at: string | null
          id: string
          name: string
          onboarding_completed_at: string | null
          onboarding_data: Json
          order_id: string | null
          order_item_id: string | null
          product_slug: string | null
          progress: number
          status: string
          updated_at: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          approval_requested_at?: string | null
          approved_at?: string | null
          bundle_slug?: string | null
          configuration?: Json
          created_at?: string
          go_live_at?: string | null
          id?: string
          name: string
          onboarding_completed_at?: string | null
          onboarding_data?: Json
          order_id?: string | null
          order_item_id?: string | null
          product_slug?: string | null
          progress?: number
          status?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          approval_requested_at?: string | null
          approved_at?: string | null
          bundle_slug?: string | null
          configuration?: Json
          created_at?: string
          go_live_at?: string | null
          id?: string
          name?: string
          onboarding_completed_at?: string | null
          onboarding_data?: Json
          order_id?: string | null
          order_item_id?: string | null
          product_slug?: string | null
          progress?: number
          status?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_projects_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_projects_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "store_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      store_requests: {
        Row: {
          answers: Json
          bundle_slug: string | null
          business_name: string | null
          created_at: string
          currency: string
          email: string | null
          estimated_price_pence: number | null
          full_name: string | null
          id: string
          industry: string | null
          message: string | null
          phone: string | null
          plan_slug: string | null
          product_slug: string | null
          request_type: string
          status: string
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          answers?: Json
          bundle_slug?: string | null
          business_name?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          estimated_price_pence?: number | null
          full_name?: string | null
          id?: string
          industry?: string | null
          message?: string | null
          phone?: string | null
          plan_slug?: string | null
          product_slug?: string | null
          request_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          answers?: Json
          bundle_slug?: string | null
          business_name?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          estimated_price_pence?: number | null
          full_name?: string | null
          id?: string
          industry?: string | null
          message?: string | null
          phone?: string | null
          plan_slug?: string | null
          product_slug?: string | null
          request_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      store_reviews: {
        Row: {
          author_name: string
          body: string | null
          business_name: string | null
          created_at: string
          id: string
          is_published: boolean
          is_verified: boolean
          product_slug: string
          project_id: string | null
          rating: number
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          author_name: string
          body?: string | null
          business_name?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          is_verified?: boolean
          product_slug: string
          project_id?: string | null
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          author_name?: string
          body?: string | null
          business_name?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          is_verified?: boolean
          product_slug?: string
          project_id?: string | null
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "store_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_minor: number | null
          billing_cycle: string | null
          cancel_at_period_end: boolean
          created_at: string
          currency: string
          current_period_end: string | null
          id: string
          plan: string
          price_id: string | null
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          amount_minor?: number | null
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          price_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          amount_minor?: number | null
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          price_id?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string
          config: Json
          created_at: string
          description: string | null
          id: string
          is_premium: boolean
          name: string
          popularity: number
          tags: string[] | null
          thumbnail_url: string | null
        }
        Insert: {
          category: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          name: string
          popularity?: number
          tags?: string[] | null
          thumbnail_url?: string | null
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_premium?: boolean
          name?: string
          popularity?: number
          tags?: string[] | null
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          answers: Json
          checklist_dismissed: boolean
          checklist_minimized: boolean
          completed: boolean
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          skipped_steps: Json
          tour_completed: boolean
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          answers?: Json
          checklist_dismissed?: boolean
          checklist_minimized?: boolean
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          skipped_steps?: Json
          tour_completed?: boolean
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          answers?: Json
          checklist_dismissed?: boolean
          checklist_minimized?: boolean
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          skipped_steps?: Json
          tour_completed?: boolean
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      wallet_settings: {
        Row: {
          auto_topup_enabled: boolean
          auto_topup_min_balance: number
          auto_topup_package_id: string | null
          created_at: string
          low_balance_threshold: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          auto_topup_enabled?: boolean
          auto_topup_min_balance?: number
          auto_topup_package_id?: string | null
          created_at?: string
          low_balance_threshold?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          auto_topup_enabled?: boolean
          auto_topup_min_balance?: number
          auto_topup_package_id?: string | null
          created_at?: string
          low_balance_threshold?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_settings_auto_topup_package_id_fkey"
            columns: ["auto_topup_package_id"]
            isOneToOne: false
            referencedRelation: "credit_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_accounts: {
        Row: {
          business_name: string | null
          connected_at: string
          connected_by: string | null
          connection_method: string
          created_at: string
          display_phone_number: string | null
          id: string
          phone_number_id: string | null
          updated_at: string
          verification_status: string | null
          verified_name: string | null
          waba_id: string | null
          workspace_id: string
        }
        Insert: {
          business_name?: string | null
          connected_at?: string
          connected_by?: string | null
          connection_method?: string
          created_at?: string
          display_phone_number?: string | null
          id?: string
          phone_number_id?: string | null
          updated_at?: string
          verification_status?: string | null
          verified_name?: string | null
          waba_id?: string | null
          workspace_id: string
        }
        Update: {
          business_name?: string | null
          connected_at?: string
          connected_by?: string | null
          connection_method?: string
          created_at?: string
          display_phone_number?: string | null
          id?: string
          phone_number_id?: string | null
          updated_at?: string
          verification_status?: string | null
          verified_name?: string | null
          waba_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          auto_templated: boolean
          automation_id: string | null
          automation_run_id: string | null
          body: string | null
          campaign_id: string | null
          compliance_note: string | null
          contact_id: string | null
          created_at: string
          credit_charged: boolean
          delivered_at: string | null
          direction: string
          error: string | null
          error_code: number | null
          error_details: string | null
          error_title: string | null
          failed_at: string | null
          fbtrace_id: string | null
          id: string
          language_code: string | null
          last_status_at: string | null
          lead_id: string | null
          message_type: string
          phone_number: string
          provider: string
          provider_message_id: string | null
          read_at: string | null
          sender_ownership: string | null
          sender_phone_number_id: string | null
          sender_profile_id: string | null
          sent_at: string | null
          status: string
          submitted_at: string | null
          template_name: string | null
          wa_message_id: string | null
          waba_id: string | null
          workspace_id: string
        }
        Insert: {
          auto_templated?: boolean
          automation_id?: string | null
          automation_run_id?: string | null
          body?: string | null
          campaign_id?: string | null
          compliance_note?: string | null
          contact_id?: string | null
          created_at?: string
          credit_charged?: boolean
          delivered_at?: string | null
          direction?: string
          error?: string | null
          error_code?: number | null
          error_details?: string | null
          error_title?: string | null
          failed_at?: string | null
          fbtrace_id?: string | null
          id?: string
          language_code?: string | null
          last_status_at?: string | null
          lead_id?: string | null
          message_type?: string
          phone_number: string
          provider?: string
          provider_message_id?: string | null
          read_at?: string | null
          sender_ownership?: string | null
          sender_phone_number_id?: string | null
          sender_profile_id?: string | null
          sent_at?: string | null
          status?: string
          submitted_at?: string | null
          template_name?: string | null
          wa_message_id?: string | null
          waba_id?: string | null
          workspace_id: string
        }
        Update: {
          auto_templated?: boolean
          automation_id?: string | null
          automation_run_id?: string | null
          body?: string | null
          campaign_id?: string | null
          compliance_note?: string | null
          contact_id?: string | null
          created_at?: string
          credit_charged?: boolean
          delivered_at?: string | null
          direction?: string
          error?: string | null
          error_code?: number | null
          error_details?: string | null
          error_title?: string | null
          failed_at?: string | null
          fbtrace_id?: string | null
          id?: string
          language_code?: string | null
          last_status_at?: string | null
          lead_id?: string | null
          message_type?: string
          phone_number?: string
          provider?: string
          provider_message_id?: string | null
          read_at?: string | null
          sender_ownership?: string | null
          sender_phone_number_id?: string | null
          sender_profile_id?: string | null
          sent_at?: string | null
          status?: string
          submitted_at?: string | null
          template_name?: string | null
          wa_message_id?: string | null
          waba_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "sender_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_provider_health: {
        Row: {
          api_version: string | null
          app_subscribed: boolean | null
          callback_verified_at: string | null
          created_at: string
          display_phone_number: string | null
          last_checked_at: string | null
          last_delivered_callback_at: string | null
          last_error: string | null
          last_failed_callback_at: string | null
          last_read_callback_at: string | null
          last_sent_callback_at: string | null
          last_template_sync_at: string | null
          last_webhook_at: string | null
          messages_field_subscribed: boolean | null
          phone_number_id: string | null
          phone_registration_state: string | null
          token_configured: boolean
          token_expires_at: string | null
          token_type: string | null
          updated_at: string
          verified_name: string | null
          waba_id: string | null
          workspace_id: string
        }
        Insert: {
          api_version?: string | null
          app_subscribed?: boolean | null
          callback_verified_at?: string | null
          created_at?: string
          display_phone_number?: string | null
          last_checked_at?: string | null
          last_delivered_callback_at?: string | null
          last_error?: string | null
          last_failed_callback_at?: string | null
          last_read_callback_at?: string | null
          last_sent_callback_at?: string | null
          last_template_sync_at?: string | null
          last_webhook_at?: string | null
          messages_field_subscribed?: boolean | null
          phone_number_id?: string | null
          phone_registration_state?: string | null
          token_configured?: boolean
          token_expires_at?: string | null
          token_type?: string | null
          updated_at?: string
          verified_name?: string | null
          waba_id?: string | null
          workspace_id: string
        }
        Update: {
          api_version?: string | null
          app_subscribed?: boolean | null
          callback_verified_at?: string | null
          created_at?: string
          display_phone_number?: string | null
          last_checked_at?: string | null
          last_delivered_callback_at?: string | null
          last_error?: string | null
          last_failed_callback_at?: string | null
          last_read_callback_at?: string | null
          last_sent_callback_at?: string | null
          last_template_sync_at?: string | null
          last_webhook_at?: string | null
          messages_field_subscribed?: boolean | null
          phone_number_id?: string | null
          phone_registration_state?: string | null
          token_configured?: boolean
          token_expires_at?: string | null
          token_type?: string | null
          updated_at?: string
          verified_name?: string | null
          waba_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      whatsapp_senders: {
        Row: {
          address: string | null
          approved_sender_name: string | null
          business_name: string | null
          category: string | null
          created_at: string
          id: string
          meta_business_id: string | null
          phone_number: string | null
          provider: string
          sender_profile_id: string
          twilio_wa_sender_sid: string | null
          updated_at: string
          verification_status: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          approved_sender_name?: string | null
          business_name?: string | null
          category?: string | null
          created_at?: string
          id?: string
          meta_business_id?: string | null
          phone_number?: string | null
          provider?: string
          sender_profile_id: string
          twilio_wa_sender_sid?: string | null
          updated_at?: string
          verification_status?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          approved_sender_name?: string | null
          business_name?: string | null
          category?: string | null
          created_at?: string
          id?: string
          meta_business_id?: string | null
          phone_number?: string | null
          provider?: string
          sender_profile_id?: string
          twilio_wa_sender_sid?: string | null
          updated_at?: string
          verification_status?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_senders_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: true
            referencedRelation: "sender_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          access_token_encrypted: string
          assume_opt_in: boolean
          business_account_name: string | null
          connection_method: string
          created_at: string
          default_reengagement_template_id: string | null
          display_phone_number: string | null
          id: string
          is_active: boolean
          phone_number_id: string
          tier_limit: number
          token_expires_at: string | null
          updated_at: string
          verified_name: string | null
          verify_token_encrypted: string
          waba_id: string | null
          workspace_id: string
        }
        Insert: {
          access_token_encrypted: string
          assume_opt_in?: boolean
          business_account_name?: string | null
          connection_method?: string
          created_at?: string
          default_reengagement_template_id?: string | null
          display_phone_number?: string | null
          id?: string
          is_active?: boolean
          phone_number_id: string
          tier_limit?: number
          token_expires_at?: string | null
          updated_at?: string
          verified_name?: string | null
          verify_token_encrypted: string
          waba_id?: string | null
          workspace_id: string
        }
        Update: {
          access_token_encrypted?: string
          assume_opt_in?: boolean
          business_account_name?: string | null
          connection_method?: string
          created_at?: string
          default_reengagement_template_id?: string | null
          display_phone_number?: string | null
          id?: string
          is_active?: boolean
          phone_number_id?: string
          tier_limit?: number
          token_expires_at?: string | null
          updated_at?: string
          verified_name?: string | null
          verify_token_encrypted?: string
          waba_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_default_reengagement_template_id_fkey"
            columns: ["default_reengagement_template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_status_events: {
        Row: {
          conversation_id: string | null
          created_at: string
          error_code: number | null
          error_details: string | null
          error_message: string | null
          error_title: string | null
          fbtrace_id: string | null
          id: string
          message_id: string | null
          meta_timestamp: string | null
          pricing: Json | null
          raw: Json | null
          recipient_id: string | null
          status: string
          wamid: string
          workspace_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          error_code?: number | null
          error_details?: string | null
          error_message?: string | null
          error_title?: string | null
          fbtrace_id?: string | null
          id?: string
          message_id?: string | null
          meta_timestamp?: string | null
          pricing?: Json | null
          raw?: Json | null
          recipient_id?: string | null
          status: string
          wamid: string
          workspace_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          error_code?: number | null
          error_details?: string | null
          error_message?: string | null
          error_title?: string | null
          fbtrace_id?: string | null
          id?: string
          message_id?: string | null
          meta_timestamp?: string | null
          pricing?: Json | null
          raw?: Json | null
          recipient_id?: string | null
          status?: string
          wamid?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_status_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body_preview: string
          category: string
          components: Json | null
          created_at: string
          created_by: string | null
          header_media_url: string | null
          id: string
          language: string
          last_synced_at: string | null
          meta_template_id: string | null
          name: string
          notes: string | null
          provider: string
          status: string
          twilio_content_sid: string | null
          twilio_variable_sample: Json | null
          updated_at: string
          variable_count: number
          workspace_id: string
        }
        Insert: {
          body_preview?: string
          category?: string
          components?: Json | null
          created_at?: string
          created_by?: string | null
          header_media_url?: string | null
          id?: string
          language?: string
          last_synced_at?: string | null
          meta_template_id?: string | null
          name: string
          notes?: string | null
          provider?: string
          status?: string
          twilio_content_sid?: string | null
          twilio_variable_sample?: Json | null
          updated_at?: string
          variable_count?: number
          workspace_id: string
        }
        Update: {
          body_preview?: string
          category?: string
          components?: Json | null
          created_at?: string
          created_by?: string | null
          header_media_url?: string | null
          id?: string
          language?: string
          last_synced_at?: string | null
          meta_template_id?: string | null
          name?: string
          notes?: string | null
          provider?: string
          status?: string
          twilio_content_sid?: string | null
          twilio_variable_sample?: Json | null
          updated_at?: string
          variable_count?: number
          workspace_id?: string
        }
        Relationships: []
      }
      whatsapp_webhook_events: {
        Row: {
          event_key: string
          event_type: string | null
          id: string
          message_count: number
          payload_redacted: Json | null
          phone_number_id: string | null
          processed_at: string | null
          processing_error: string | null
          received_at: string
          signature_valid: boolean
          status_count: number
          workspace_id: string | null
        }
        Insert: {
          event_key: string
          event_type?: string | null
          id?: string
          message_count?: number
          payload_redacted?: Json | null
          phone_number_id?: string | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
          signature_valid?: boolean
          status_count?: number
          workspace_id?: string | null
        }
        Update: {
          event_key?: string
          event_type?: string | null
          id?: string
          message_count?: number
          payload_redacted?: Json | null
          phone_number_id?: string | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
          signature_valid?: boolean
          status_count?: number
          workspace_id?: string | null
        }
        Relationships: []
      }
      workflow_enrollments: {
        Row: {
          branch_path: Json
          completed_at: string | null
          current_node_id: string | null
          exit_reason: string | null
          id: string
          is_test: boolean
          last_step_at: string | null
          lead_id: string
          meta: Json
          started_at: string
          status: string
          steps_executed: number
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          branch_path?: Json
          completed_at?: string | null
          current_node_id?: string | null
          exit_reason?: string | null
          id?: string
          is_test?: boolean
          last_step_at?: string | null
          lead_id: string
          meta?: Json
          started_at?: string
          status?: string
          steps_executed?: number
          workflow_id: string
          workspace_id: string
        }
        Update: {
          branch_path?: Json
          completed_at?: string | null
          current_node_id?: string | null
          exit_reason?: string | null
          id?: string
          is_test?: boolean
          last_step_at?: string | null
          lead_id?: string
          meta?: Json
          started_at?: string
          status?: string
          steps_executed?: number
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_enrollments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_enrollments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_logs: {
        Row: {
          created_at: string
          details: Json
          enrollment_id: string | null
          event_type: string
          id: string
          lead_id: string | null
          level: string
          message: string | null
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          enrollment_id?: string | null
          event_type: string
          id?: string
          lead_id?: string | null
          level?: string
          message?: string | null
          workflow_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          enrollment_id?: string | null
          event_type?: string
          id?: string
          lead_id?: string | null
          level?: string
          message?: string | null
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_logs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "workflow_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_logs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          branch: string
          config: Json
          id: string
          node_type: string
          parent_node_id: string | null
          step_order: number
          sub_type: string | null
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          branch?: string
          config?: Json
          id: string
          node_type: string
          parent_node_id?: string | null
          step_order?: number
          sub_type?: string | null
          workflow_id: string
          workspace_id: string
        }
        Update: {
          branch?: string
          config?: Json
          id?: string
          node_type?: string
          parent_node_id?: string | null
          step_order?: number
          sub_type?: string | null
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_nodes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_nodes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          branch_taken: string | null
          details: Json
          enrollment_id: string
          error: string | null
          id: string
          is_test: boolean
          lead_id: string
          node_id: string
          node_type: string
          ran_at: string
          status: string
          workflow_id: string
          workspace_id: string
        }
        Insert: {
          branch_taken?: string | null
          details?: Json
          enrollment_id: string
          error?: string | null
          id?: string
          is_test?: boolean
          lead_id: string
          node_id: string
          node_type: string
          ran_at?: string
          status?: string
          workflow_id: string
          workspace_id: string
        }
        Update: {
          branch_taken?: string | null
          details?: Json
          enrollment_id?: string
          error?: string | null
          id?: string
          is_test?: boolean
          lead_id?: string
          node_id?: string
          node_type?: string
          ran_at?: string
          status?: string
          workflow_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "workflow_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          canvas_json: Json
          category: string
          created_at: string
          description: string | null
          enrollment_config: Json
          id: string
          is_featured: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          canvas_json?: Json
          category?: string
          created_at?: string
          description?: string | null
          enrollment_config?: Json
          id?: string
          is_featured?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          canvas_json?: Json
          category?: string
          created_at?: string
          description?: string | null
          enrollment_config?: Json
          id?: string
          is_featured?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          canvas_json: Json
          created_at: string
          daily_send_cap: number
          deduplication_key: string | null
          description: string | null
          enrollment_config: Json
          enrollment_method: string
          enrollment_object_type: string
          filter_groups: Json
          folder_id: string | null
          goal_node_id: string | null
          id: string
          last_tested_at: string | null
          name: string
          quiet_hours: Json
          reenrollment_config: Json
          status: string
          suppression_config: Json
          template_slug: string | null
          trigger_config: Json
          trigger_event: string | null
          trigger_source: string | null
          trigger_summary: string | null
          unenrollment_triggers: Json
          updated_at: string
          user_id: string
          version: number
          workspace_id: string
        }
        Insert: {
          canvas_json?: Json
          created_at?: string
          daily_send_cap?: number
          deduplication_key?: string | null
          description?: string | null
          enrollment_config?: Json
          enrollment_method?: string
          enrollment_object_type?: string
          filter_groups?: Json
          folder_id?: string | null
          goal_node_id?: string | null
          id?: string
          last_tested_at?: string | null
          name: string
          quiet_hours?: Json
          reenrollment_config?: Json
          status?: string
          suppression_config?: Json
          template_slug?: string | null
          trigger_config?: Json
          trigger_event?: string | null
          trigger_source?: string | null
          trigger_summary?: string | null
          unenrollment_triggers?: Json
          updated_at?: string
          user_id: string
          version?: number
          workspace_id: string
        }
        Update: {
          canvas_json?: Json
          created_at?: string
          daily_send_cap?: number
          deduplication_key?: string | null
          description?: string | null
          enrollment_config?: Json
          enrollment_method?: string
          enrollment_object_type?: string
          filter_groups?: Json
          folder_id?: string | null
          goal_node_id?: string | null
          id?: string
          last_tested_at?: string | null
          name?: string
          quiet_hours?: Json
          reenrollment_config?: Json
          status?: string
          suppression_config?: Json
          template_slug?: string | null
          trigger_config?: Json
          trigger_event?: string | null
          trigger_source?: string | null
          trigger_summary?: string | null
          unenrollment_triggers?: Json
          updated_at?: string
          user_id?: string
          version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_activity: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          meta: Json | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          meta?: Json | null
          user_id: string
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          meta?: Json | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_activity_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_assignment_state: {
        Row: {
          last_assigned_user_id: string | null
          round_robin_enabled: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          last_assigned_user_id?: string | null
          round_robin_enabled?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          last_assigned_user_id?: string | null
          round_robin_enabled?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_assignment_state_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_branding: {
        Row: {
          brand_color: string | null
          brand_name: string | null
          created_at: string
          custom_domain: string | null
          icon_url: string | null
          id: string
          logo_url: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand_color?: string | null
          brand_name?: string | null
          created_at?: string
          custom_domain?: string | null
          icon_url?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand_color?: string | null
          brand_name?: string | null
          created_at?: string
          custom_domain?: string | null
          icon_url?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_branding_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_channel_settings: {
        Row: {
          channel: string
          config_encrypted: string
          created_at: string
          id: string
          is_active: boolean
          provider: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          channel: string
          config_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          channel?: string
          config_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_channel_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_domains: {
        Row: {
          created_at: string
          domain_name: string
          id: string
          resend_domain_id: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          domain_name: string
          id?: string
          resend_domain_id: string
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          domain_name?: string
          id?: string
          resend_domain_id?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_domains_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          token?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_tracking_pixels: {
        Row: {
          created_at: string
          ga4_enabled: boolean
          ga4_measurement_id: string | null
          gtm_enabled: boolean
          gtm_id: string | null
          meta_enabled: boolean
          meta_pixel_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          ga4_enabled?: boolean
          ga4_measurement_id?: string | null
          gtm_enabled?: boolean
          gtm_id?: string | null
          meta_enabled?: boolean
          meta_pixel_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          ga4_enabled?: boolean
          ga4_measurement_id?: string | null
          gtm_enabled?: boolean
          gtm_id?: string | null
          meta_enabled?: boolean
          meta_pixel_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_tracking_pixels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          demo_mode_enabled: boolean
          demo_seed_variant: string
          hot_lead_notify_phone: string | null
          hot_lead_sms_enabled: boolean
          hot_lead_whatsapp_enabled: boolean
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_mode_enabled?: boolean
          demo_seed_variant?: string
          hot_lead_notify_phone?: string | null
          hot_lead_sms_enabled?: boolean
          hot_lead_whatsapp_enabled?: boolean
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_mode_enabled?: boolean
          demo_seed_variant?: string
          hot_lead_notify_phone?: string | null
          hot_lead_sms_enabled?: boolean
          hot_lead_whatsapp_enabled?: boolean
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_funnel_workspace_id: {
        Args: { p_funnel_id: string }
        Returns: string
      }
      add_message_credit: {
        Args: {
          _amount: number
          _channel: string
          _reason?: string
          _reference_id?: string
          _workspace_id: string
        }
        Returns: Json
      }
      assign_next_round_robin: {
        Args: { _workspace_id: string }
        Returns: string
      }
      can_fulfil_orders: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      can_manage_commerce: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      can_moderate_community: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      claim_community_memberships: { Args: never; Returns: number }
      claim_shop_entitlements: { Args: never; Returns: number }
      claim_shop_orders: { Args: never; Returns: number }
      client_finder_entitlements: {
        Args: { _workspace_id: string }
        Returns: Json
      }
      client_finder_report: {
        Args: { _from: string; _to: string; _workspace_id: string }
        Returns: Json
      }
      convert_lead_to_contact: { Args: { _lead_id: string }; Returns: string }
      crm_create_contact_from_conversation: {
        Args: {
          _channel: string
          _email?: string
          _full_name: string
          _identifier: string
          _workspace_id: string
        }
        Returns: Json
      }
      crm_ensure_pipeline_stages: {
        Args: { _pipeline_id: string }
        Returns: number
      }
      crm_find_contact_by_phone: {
        Args: { _phone: string; _workspace_id: string }
        Returns: string
      }
      crm_link_conversation_contact: {
        Args: {
          _channel: string
          _contact_id: string
          _identifier: string
          _workspace_id: string
        }
        Returns: number
      }
      crm_metric_snapshot: {
        Args: { _from?: string; _to?: string; _workspace_id: string }
        Returns: Json
      }
      crm_normalize_email: { Args: { _email: string }; Returns: string }
      crm_normalize_phone: { Args: { _phone: string }; Returns: string }
      crm_resolve_message_contacts: {
        Args: { _workspace_id: string }
        Returns: number
      }
      crm_upsert_contact: {
        Args: {
          _attribution?: Json
          _email?: string
          _external_source_id?: string
          _full_name?: string
          _phone?: string
          _source?: string
          _source_record_id?: string
          _source_table?: string
          _workspace_id: string
        }
        Returns: string
      }
      decay_inactive_leads: { Args: never; Returns: number }
      deduct_message_credit: {
        Args: {
          _amount?: number
          _channel: string
          _reason?: string
          _reference_id?: string
          _workspace_id: string
        }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_default_pipeline: {
        Args: { _workspace_id: string }
        Returns: string
      }
      ensure_onboarding_pipeline: {
        Args: { p_stage_names: string[]; p_workspace_id: string }
        Returns: string
      }
      get_booking_calendar_status: {
        Args: { p_booking_page_id: string }
        Returns: {
          calendar_id: string
          connected: boolean
          token_id: string
        }[]
      }
      get_my_shop_entitlements: {
        Args: never
        Returns: {
          expires_at: string
          granted_at: string
          id: string
          kind: string
          order_id: string
          product_id: string
          resource_label: string
          resource_ref: string
          status: string
          store_name: string
          store_slug: string
        }[]
      }
      get_my_shop_purchases: {
        Args: never
        Returns: {
          created_at: string
          currency: string
          fulfilment_status: string
          id: string
          item_count: number
          order_number: string
          status: string
          store_logo_url: string
          store_name: string
          store_slug: string
          stripe_subscription_id: string
          total_amount: number
        }[]
      }
      get_public_appointment_types: {
        Args: { p_page_id: string }
        Returns: {
          capacity: number
          color: string
          description: string
          duration_minutes: number
          id: string
          kind: string
          location_type: string
          location_value: string
          name: string
          questions: Json
        }[]
      }
      get_public_blog_post: {
        Args: { p_slug: string }
        Returns: {
          author: string
          category: string
          content: string
          created_at: string
          excerpt: string
          featured: boolean
          id: string
          image_url: string
          published_at: string
          read_time: string
          slug: string
          title: string
          updated_at: string
        }[]
      }
      get_public_blog_posts: {
        Args: never
        Returns: {
          author: string
          category: string
          created_at: string
          excerpt: string
          featured: boolean
          id: string
          image_url: string
          published_at: string
          read_time: string
          slug: string
          title: string
        }[]
      }
      get_public_booking_page: {
        Args: { p_slug: string }
        Returns: {
          buffer_minutes: number
          color: string
          description: string
          duration_minutes: number
          id: string
          location_type: string
          location_value: string
          max_days_ahead: number
          name: string
          slug: string
          status: string
        }[]
      }
      get_public_booking_slug: {
        Args: { p_id: string }
        Returns: {
          slug: string
          status: string
        }[]
      }
      get_public_communities: {
        Args: { p_store_slug: string }
        Returns: {
          access_type: string
          cover_url: string
          description: string
          id: string
          member_count: number
          name: string
          product_id: string
          product_slug: string
          slug: string
          tagline: string
        }[]
      }
      get_public_form: {
        Args: { p_slug: string }
        Returns: {
          created_at: string
          description: string
          id: string
          name: string
          schema: Json
          settings: Json
          slug: string
          status: string
          submission_count: number
          theme: Json
          updated_at: string
          workspace_id: string
        }[]
      }
      get_public_funnel_by_slug: {
        Args: { p_slug: string }
        Returns: {
          id: string
          name: string
          slug: string
          status: string
          workspace_id: string
        }[]
      }
      get_public_funnel_steps: {
        Args: { p_funnel_id: string }
        Returns: {
          id: string
          page_content: Json
          step_order: number
          step_type: string
        }[]
      }
      get_public_shop_order: {
        Args: { p_email?: string; p_order_id: string }
        Returns: {
          created_at: string
          currency: string
          discount_amount: number
          email: string
          files: Json
          fulfilment_status: string
          full_name: string
          id: string
          items: Json
          order_number: string
          refunded_amount: number
          shipping_address: Json
          shipping_amount: number
          status: string
          store_name: string
          store_slug: string
          stripe_subscription_id: string
          subtotal_amount: number
          tax_amount: number
          total_amount: number
        }[]
      }
      get_public_site_custom_code: {
        Args: never
        Returns: {
          body_code: string
          body_enabled: boolean
          head_code: string
          head_enabled: boolean
        }[]
      }
      get_public_store: {
        Args: { p_slug: string }
        Returns: {
          accent_color: string
          business_email: string
          business_name: string
          business_phone: string
          countries_served: string[]
          cover_url: string
          currency: string
          description: string
          font_family: string
          footer_text: string
          id: string
          logo_url: string
          name: string
          navigation: Json
          policies: Json
          primary_color: string
          seo_description: string
          seo_title: string
          slug: string
          social_links: Json
          tagline: string
          workspace_id: string
        }[]
      }
      get_public_store_collections: {
        Args: { p_store_slug: string }
        Returns: {
          description: string
          id: string
          image_url: string
          name: string
          slug: string
        }[]
      }
      get_public_store_product: {
        Args: { p_product_slug: string; p_store_slug: string }
        Returns: {
          allow_backorder: boolean
          billing_interval: string
          billing_type: string
          booking_page_id: string
          button_text: string
          compare_at_amount: number
          currency: string
          deliverables: string
          description: string
          id: string
          inventory_quantity: number
          media: Json
          name: string
          onboarding_instructions: string
          price_amount: number
          product_type: string
          requires_shipping: boolean
          seo_description: string
          seo_title: string
          short_description: string
          slug: string
          store_id: string
          track_inventory: boolean
          trial_days: number
          variants: Json
        }[]
      }
      get_public_store_products: {
        Args: { p_collection_slug?: string; p_store_slug: string }
        Returns: {
          billing_interval: string
          billing_type: string
          button_text: string
          compare_at_amount: number
          currency: string
          id: string
          image_url: string
          name: string
          price_amount: number
          product_type: string
          short_description: string
          slug: string
          tags: string[]
        }[]
      }
      get_roi_calculator_settings: {
        Args: never
        Returns: {
          booking_url: string
          high_admin_thresholds: Json
          high_opportunity_thresholds: Json
        }[]
      }
      get_workspace_public_pixels: {
        Args: { p_workspace_id: string }
        Returns: {
          ga4_enabled: boolean
          ga4_measurement_id: string
          gtm_enabled: boolean
          gtm_id: string
          meta_enabled: boolean
          meta_pixel_id: string
        }[]
      }
      has_platform_permission: {
        Args: { _key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_shop_entitlement: {
        Args: { _kind: string; _resource_ref: string }
        Returns: boolean
      }
      increment_automation_run: {
        Args: { _automation_id: string }
        Returns: undefined
      }
      is_community_member: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_email_in_admin_allowlist: {
        Args: { _email: string }
        Returns: boolean
      }
      is_platform_staff: { Args: { _user_id: string }; Returns: boolean }
      is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      log_automation_events: {
        Args: { _entries: Json; _workspace_id: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      my_platform_permissions: {
        Args: never
        Returns: {
          permission_key: string
        }[]
      }
      pick_booking_host: {
        Args: { _end: string; _start: string; _team_id: string }
        Returns: string
      }
      platform_automation_health: { Args: { _since: string }; Returns: Json }
      platform_client_finder_health: { Args: never; Returns: Json }
      platform_communications_metrics: {
        Args: { _since: string }
        Returns: Json
      }
      platform_community_moderation: {
        Args: { _limit?: number }
        Returns: Json
      }
      platform_failed_runs: { Args: { _limit?: number }; Returns: Json }
      platform_fulfilment_overview: { Args: never; Returns: Json }
      platform_health_jobs: { Args: never; Returns: Json }
      platform_integration_health: { Args: never; Returns: Json }
      platform_overview_metrics: { Args: { _since?: string }; Returns: Json }
      platform_sender_queue: { Args: never; Returns: Json }
      platform_staff_last_sign_in: {
        Args: never
        Returns: {
          last_sign_in_at: string
          user_id: string
        }[]
      }
      platform_users_list: {
        Args: {
          _limit?: number
          _offset?: number
          _search?: string
          _status?: string
        }
        Returns: Json
      }
      platform_whatsapp_health: { Args: never; Returns: Json }
      platform_workspaces_list: {
        Args: { _limit?: number; _offset?: number; _search?: string }
        Returns: Json
      }
      publish_due_blog_posts: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      sync_admin_role: { Args: never; Returns: undefined }
      user_workspace_ids: { Args: { _user_id: string }; Returns: string[] }
      verify_workspace_api_key: {
        Args: { _key_hash: string }
        Returns: {
          key_id: string
          scopes: string[]
          workspace_id: string
        }[]
      }
      workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: string
      }
    }
    Enums: {
      account_status:
        | "invited"
        | "active"
        | "suspended"
        | "deactivated"
        | "deletion_pending"
        | "anonymised"
      app_role: "admin" | "user"
      platform_role:
        | "super_admin"
        | "operations_admin"
        | "billing_admin"
        | "support_agent"
        | "content_admin"
        | "compliance_admin"
        | "technical_admin"
        | "analyst"
      sender_channel: "whatsapp" | "sms" | "email"
      sender_status: "pending" | "approved" | "rejected" | "suspended"
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
      account_status: [
        "invited",
        "active",
        "suspended",
        "deactivated",
        "deletion_pending",
        "anonymised",
      ],
      app_role: ["admin", "user"],
      platform_role: [
        "super_admin",
        "operations_admin",
        "billing_admin",
        "support_agent",
        "content_admin",
        "compliance_admin",
        "technical_admin",
        "analyst",
      ],
      sender_channel: ["whatsapp", "sms", "email"],
      sender_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
