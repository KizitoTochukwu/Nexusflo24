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
          description: string | null
          id: string
          last_run_at: string | null
          name: string
          run_count: number
          status: string
          trigger_config: Json | null
          trigger_type: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          run_count?: number
          status?: string
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          run_count?: number
          status?: string
          trigger_config?: Json | null
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
      booking_pages: {
        Row: {
          availability: Json
          buffer_minutes: number
          color: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          google_calendar_id: string | null
          google_token_id: string | null
          id: string
          max_days_ahead: number
          name: string
          slug: string | null
          status: string
          timezone: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          availability?: Json
          buffer_minutes?: number
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          google_calendar_id?: string | null
          google_token_id?: string | null
          id?: string
          max_days_ahead?: number
          name: string
          slug?: string | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          availability?: Json
          buffer_minutes?: number
          color?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          google_calendar_id?: string | null
          google_token_id?: string | null
          id?: string
          max_days_ahead?: number
          name?: string
          slug?: string | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
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
            foreignKeyName: "booking_pages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_page_id: string
          created_at: string
          end_time: string
          google_event_id: string | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          lead_id: string | null
          notes: string | null
          reschedule_token: string | null
          start_time: string
          status: string
          workspace_id: string
        }
        Insert: {
          booking_page_id: string
          created_at?: string
          end_time: string
          google_event_id?: string | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          reschedule_token?: string | null
          start_time: string
          status?: string
          workspace_id: string
        }
        Update: {
          booking_page_id?: string
          created_at?: string
          end_time?: string
          google_event_id?: string | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          reschedule_token?: string | null
          start_time?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
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
      leads: {
        Row: {
          ai_qualification: Json | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_activity_at: string | null
          notes: string | null
          phone: string | null
          score: number | null
          source: string | null
          status: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ai_qualification?: Json | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          phone?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ai_qualification?: Json | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_activity_at?: string | null
          notes?: string | null
          phone?: string | null
          score?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
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
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_jobs: {
        Row: {
          automation_id: string
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
          automation_id: string
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
          automation_id?: string
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
            foreignKeyName: "scheduled_jobs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
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
      sms_logs: {
        Row: {
          created_at: string
          error: string | null
          from_number: string | null
          id: string
          message: string
          provider: string
          provider_message_id: string | null
          status: string
          to_number: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          from_number?: string | null
          id?: string
          message: string
          provider: string
          provider_message_id?: string | null
          status?: string
          to_number: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          from_number?: string | null
          id?: string
          message?: string
          provider?: string
          provider_message_id?: string | null
          status?: string
          to_number?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      subscriptions: {
        Row: {
          billing_cycle: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          price_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          price_id?: string | null
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
      whatsapp_messages: {
        Row: {
          body: string | null
          created_at: string
          direction: string
          error: string | null
          id: string
          lead_id: string | null
          message_type: string
          phone_number: string
          status: string
          wa_message_id: string | null
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message_type?: string
          phone_number: string
          status?: string
          wa_message_id?: string | null
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message_type?: string
          phone_number?: string
          status?: string
          wa_message_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      whatsapp_settings: {
        Row: {
          access_token_encrypted: string
          created_at: string
          id: string
          is_active: boolean
          phone_number_id: string
          updated_at: string
          verify_token_encrypted: string
          workspace_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean
          phone_number_id: string
          updated_at?: string
          verify_token_encrypted: string
          workspace_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean
          phone_number_id?: string
          updated_at?: string
          verify_token_encrypted?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_workspace_id_fkey"
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
      workspaces: {
        Row: {
          created_at: string
          demo_mode_enabled: boolean
          demo_seed_variant: string
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_mode_enabled?: boolean
          demo_seed_variant?: string
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_mode_enabled?: boolean
          demo_seed_variant?: string
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
      decay_inactive_leads: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_automation_run: {
        Args: { _automation_id: string }
        Returns: undefined
      }
      is_email_in_admin_allowlist: {
        Args: { _email: string }
        Returns: boolean
      }
      is_workspace_admin: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      sync_admin_role: { Args: never; Returns: undefined }
      user_workspace_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
