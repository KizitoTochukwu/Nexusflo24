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
          description: string | null
          exit_actions: Json
          exit_criteria: Json
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
          exit_actions?: Json
          exit_criteria?: Json
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
          exit_actions?: Json
          exit_criteria?: Json
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
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          location_type: string
          location_value: string | null
          max_days_ahead: number
          name: string
          notify_host: boolean
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
          location_type?: string
          location_value?: string | null
          max_days_ahead?: number
          name: string
          notify_host?: boolean
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
          location_type?: string
          location_value?: string | null
          max_days_ahead?: number
          name?: string
          notify_host?: boolean
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
          meeting_location: string | null
          meeting_url: string | null
          notes: string | null
          reschedule_token: string | null
          sms_consent: boolean
          sms_consent_source: string | null
          sms_consent_text: string | null
          sms_consent_timestamp: string | null
          sms_opt_out: boolean
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
          meeting_location?: string | null
          meeting_url?: string | null
          notes?: string | null
          reschedule_token?: string | null
          sms_consent?: boolean
          sms_consent_source?: string | null
          sms_consent_text?: string | null
          sms_consent_timestamp?: string | null
          sms_opt_out?: boolean
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
          meeting_location?: string | null
          meeting_url?: string | null
          notes?: string | null
          reschedule_token?: string | null
          sms_consent?: boolean
          sms_consent_source?: string | null
          sms_consent_text?: string | null
          sms_consent_timestamp?: string | null
          sms_opt_out?: boolean
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
      form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          id: string
          lead_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          form_id: string
          id?: string
          lead_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          lead_id?: string | null
          workspace_id?: string
        }
        Relationships: []
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
          campaign_name: string | null
          created_at: string
          email: string | null
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
          workspace_id: string
        }
        Insert: {
          ai_qualification?: Json | null
          assigned_owner_id?: string | null
          campaign_name?: string | null
          created_at?: string
          email?: string | null
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
          workspace_id: string
        }
        Update: {
          ai_qualification?: Json | null
          assigned_owner_id?: string | null
          campaign_name?: string | null
          created_at?: string
          email?: string | null
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
      message_credits: {
        Row: {
          email_balance: number
          email_used: number
          id: string
          sms_balance: number
          sms_used: number
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
          last_route: Json | null
          phone: string | null
          preferred_currency: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_route?: Json | null
          phone?: string | null
          preferred_currency?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_route?: Json | null
          phone?: string | null
          preferred_currency?: string
          updated_at?: string
        }
        Relationships: []
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
          body: string | null
          created_at: string
          direction: string
          error: string | null
          id: string
          lead_id: string | null
          message_type: string
          phone_number: string
          provider: string
          provider_message_id: string | null
          sender_profile_id: string | null
          status: string
          template_name: string | null
          wa_message_id: string | null
          workspace_id: string
        }
        Insert: {
          auto_templated?: boolean
          body?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message_type?: string
          phone_number: string
          provider?: string
          provider_message_id?: string | null
          sender_profile_id?: string | null
          status?: string
          template_name?: string | null
          wa_message_id?: string | null
          workspace_id: string
        }
        Update: {
          auto_templated?: boolean
          body?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          lead_id?: string | null
          message_type?: string
          phone_number?: string
          provider?: string
          provider_message_id?: string | null
          sender_profile_id?: string | null
          status?: string
          template_name?: string | null
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
          business_account_name: string | null
          connection_method: string
          created_at: string
          default_reengagement_template_id: string | null
          display_phone_number: string | null
          id: string
          is_active: boolean
          phone_number_id: string
          token_expires_at: string | null
          updated_at: string
          verified_name: string | null
          verify_token_encrypted: string
          waba_id: string | null
          workspace_id: string
        }
        Insert: {
          access_token_encrypted: string
          business_account_name?: string | null
          connection_method?: string
          created_at?: string
          default_reengagement_template_id?: string | null
          display_phone_number?: string | null
          id?: string
          is_active?: boolean
          phone_number_id: string
          token_expires_at?: string | null
          updated_at?: string
          verified_name?: string | null
          verify_token_encrypted: string
          waba_id?: string | null
          workspace_id: string
        }
        Update: {
          access_token_encrypted?: string
          business_account_name?: string | null
          connection_method?: string
          created_at?: string
          default_reengagement_template_id?: string | null
          display_phone_number?: string | null
          id?: string
          is_active?: boolean
          phone_number_id?: string
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
      whatsapp_templates: {
        Row: {
          body_preview: string
          category: string
          components: Json | null
          created_at: string
          created_by: string | null
          id: string
          language: string
          last_synced_at: string | null
          meta_template_id: string | null
          name: string
          notes: string | null
          status: string
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
          id?: string
          language?: string
          last_synced_at?: string | null
          meta_template_id?: string | null
          name: string
          notes?: string | null
          status?: string
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
          id?: string
          language?: string
          last_synced_at?: string | null
          meta_template_id?: string | null
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          variable_count?: number
          workspace_id?: string
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
          description: string | null
          enrollment_config: Json
          goal_node_id: string | null
          id: string
          name: string
          quiet_hours: Json
          status: string
          suppression_config: Json
          template_slug: string | null
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
          description?: string | null
          enrollment_config?: Json
          goal_node_id?: string | null
          id?: string
          name: string
          quiet_hours?: Json
          status?: string
          suppression_config?: Json
          template_slug?: string | null
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
          description?: string | null
          enrollment_config?: Json
          goal_node_id?: string | null
          id?: string
          name?: string
          quiet_hours?: Json
          status?: string
          suppression_config?: Json
          template_slug?: string | null
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
          updated_at: string
          workspace_id: string
        }
        Insert: {
          channel: string
          config_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          channel?: string
          config_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean
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
      assign_next_round_robin: {
        Args: { _workspace_id: string }
        Returns: string
      }
      decay_inactive_leads: { Args: never; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_booking_calendar_status: {
        Args: { p_booking_page_id: string }
        Returns: {
          calendar_id: string
          connected: boolean
          token_id: string
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
      get_public_site_custom_code: {
        Args: never
        Returns: {
          body_code: string
          body_enabled: boolean
          head_code: string
          head_enabled: boolean
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
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
    }
    Enums: {
      app_role: "admin" | "user"
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
      sender_channel: ["whatsapp", "sms", "email"],
      sender_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
