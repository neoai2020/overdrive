/**
 * AUTO-GENERATED from the live Supabase schema. Do NOT edit by hand.
 *
 * Refresh with:
 *   npm run types:gen
 *
 * The hand-written, ergonomic interfaces (Workspace, Offer, Campaign, ...)
 * live in ./database.ts and are what app code imports day-to-day. This file
 * is here as the source-of-truth Database<T> generic for supabase-js, and is
 * what you'd swap into createClient<Database>() once you want strict
 * column-level typing on every query.
 */

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
      ad_placements: {
        Row: {
          ad_id: string
          ad_set_id: string
          created_at: string
          id: string
          meta_ad_id: string | null
          pushed_at: string | null
          roas: number | null
          spend: number | null
          status: Database["public"]["Enums"]["placement_status"]
          workspace_id: string
        }
        Insert: {
          ad_id: string
          ad_set_id: string
          created_at?: string
          id?: string
          meta_ad_id?: string | null
          pushed_at?: string | null
          roas?: number | null
          spend?: number | null
          status?: Database["public"]["Enums"]["placement_status"]
          workspace_id: string
        }
        Update: {
          ad_id?: string
          ad_set_id?: string
          created_at?: string
          id?: string
          meta_ad_id?: string | null
          pushed_at?: string | null
          roas?: number | null
          spend?: number | null
          status?: Database["public"]["Enums"]["placement_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_placements_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_placements_ad_set_id_fkey"
            columns: ["ad_set_id"]
            isOneToOne: false
            referencedRelation: "ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_placements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_sets: {
        Row: {
          age_max: number
          age_min: number
          audience_config: Json | null
          audience_type: Database["public"]["Enums"]["adset_audience_type"]
          campaign_id: string
          created_at: string
          daily_budget: number | null
          id: string
          locations: string[] | null
          meta_adset_id: string | null
          name: string
          placement_mode: Database["public"]["Enums"]["adset_placement_mode"]
          placements: string[] | null
          pushed_at: string | null
          roas: number | null
          spend: number | null
          status: Database["public"]["Enums"]["adset_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          age_max?: number
          age_min?: number
          audience_config?: Json | null
          audience_type?: Database["public"]["Enums"]["adset_audience_type"]
          campaign_id: string
          created_at?: string
          daily_budget?: number | null
          id?: string
          locations?: string[] | null
          meta_adset_id?: string | null
          name: string
          placement_mode?: Database["public"]["Enums"]["adset_placement_mode"]
          placements?: string[] | null
          pushed_at?: string | null
          roas?: number | null
          spend?: number | null
          status?: Database["public"]["Enums"]["adset_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          age_max?: number
          age_min?: number
          audience_config?: Json | null
          audience_type?: Database["public"]["Enums"]["adset_audience_type"]
          campaign_id?: string
          created_at?: string
          daily_budget?: number | null
          id?: string
          locations?: string[] | null
          meta_adset_id?: string | null
          name?: string
          placement_mode?: Database["public"]["Enums"]["adset_placement_mode"]
          placements?: string[] | null
          pushed_at?: string | null
          roas?: number | null
          spend?: number | null
          status?: Database["public"]["Enums"]["adset_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_sets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_sets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_versions: {
        Row: {
          ad_id: string
          caption: string | null
          created_at: string
          hook: string | null
          id: string
          length_seconds: number | null
          metadata: Json | null
          script: string | null
          style: Database["public"]["Enums"]["ad_style"] | null
          talent_id: string | null
          thumbnail_url: string | null
          version_number: number
          video_url: string | null
          voice_id: string | null
        }
        Insert: {
          ad_id: string
          caption?: string | null
          created_at?: string
          hook?: string | null
          id?: string
          length_seconds?: number | null
          metadata?: Json | null
          script?: string | null
          style?: Database["public"]["Enums"]["ad_style"] | null
          talent_id?: string | null
          thumbnail_url?: string | null
          version_number?: number
          video_url?: string | null
          voice_id?: string | null
        }
        Update: {
          ad_id?: string
          caption?: string | null
          created_at?: string
          hook?: string | null
          id?: string
          length_seconds?: number | null
          metadata?: Json | null
          script?: string | null
          style?: Database["public"]["Enums"]["ad_style"] | null
          talent_id?: string | null
          thumbnail_url?: string | null
          version_number?: number
          video_url?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_versions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          batch_id: string | null
          created_at: string
          current_version_id: string | null
          id: string
          name: string | null
          offer_id: string | null
          status: Database["public"]["Enums"]["ad_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          current_version_id?: string | null
          id?: string
          name?: string | null
          offer_id?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          current_version_id?: string | null
          id?: string
          name?: string | null
          offer_id?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_batch_fk"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "ad_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          angle: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          credits_spent: number | null
          custom_angle: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          offer_id: string | null
          preset_id: string | null
          progress_pct: number | null
          progress_step: string | null
          run_mode: Database["public"]["Enums"]["batch_run_mode"]
          scoped_ad_set_id: string | null
          size: number
          status: Database["public"]["Enums"]["batch_status"]
          style_mix: string[]
          template_id: string | null
          workspace_id: string
        }
        Insert: {
          angle?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          credits_spent?: number | null
          custom_angle?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          offer_id?: string | null
          preset_id?: string | null
          progress_pct?: number | null
          progress_step?: string | null
          run_mode?: Database["public"]["Enums"]["batch_run_mode"]
          scoped_ad_set_id?: string | null
          size?: number
          status?: Database["public"]["Enums"]["batch_status"]
          style_mix?: string[]
          template_id?: string | null
          workspace_id: string
        }
        Update: {
          angle?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          credits_spent?: number | null
          custom_angle?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          offer_id?: string | null
          preset_id?: string | null
          progress_pct?: number | null
          progress_step?: string | null
          run_mode?: Database["public"]["Enums"]["batch_run_mode"]
          scoped_ad_set_id?: string | null
          size?: number
          status?: Database["public"]["Enums"]["batch_status"]
          style_mix?: string[]
          template_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_preset_fk"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_scoped_ad_set_id_fkey"
            columns: ["scoped_ad_set_id"]
            isOneToOne: false
            referencedRelation: "ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_template_fk"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          bid_strategy: Database["public"]["Enums"]["campaign_bid_strategy"]
          budget_type: Database["public"]["Enums"]["campaign_budget_type"]
          created_at: string
          daily_budget: number
          id: string
          integration_id: string | null
          meta_account_id: string | null
          meta_campaign_id: string | null
          name: string
          objective: Database["public"]["Enums"]["campaign_objective"]
          offer_id: string | null
          pushed_at: string | null
          roas: number | null
          spend: number | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bid_strategy?: Database["public"]["Enums"]["campaign_bid_strategy"]
          budget_type?: Database["public"]["Enums"]["campaign_budget_type"]
          created_at?: string
          daily_budget?: number
          id?: string
          integration_id?: string | null
          meta_account_id?: string | null
          meta_campaign_id?: string | null
          name: string
          objective?: Database["public"]["Enums"]["campaign_objective"]
          offer_id?: string | null
          pushed_at?: string | null
          roas?: number | null
          spend?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bid_strategy?: Database["public"]["Enums"]["campaign_bid_strategy"]
          budget_type?: Database["public"]["Enums"]["campaign_budget_type"]
          created_at?: string
          daily_budget?: number
          id?: string
          integration_id?: string | null
          meta_account_id?: string | null
          meta_campaign_id?: string | null
          name?: string
          objective?: Database["public"]["Enums"]["campaign_objective"]
          offer_id?: string | null
          pushed_at?: string | null
          roas?: number | null
          spend?: number | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_integration_fk"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          id: string
          metadata: Json | null
          reason: string
          related_id: string | null
          related_table: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          metadata?: Json | null
          reason: string
          related_id?: string | null
          related_table?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          metadata?: Json | null
          reason?: string
          related_id?: string | null
          related_table?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token: string | null
          config: Json
          connected_at: string
          display_name: string | null
          id: string
          last_used_at: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token: string | null
          status: Database["public"]["Enums"]["integration_status"]
          token_expires_at: string | null
          workspace_id: string
        }
        Insert: {
          access_token?: string | null
          config?: Json
          connected_at?: string
          display_name?: string | null
          id?: string
          last_used_at?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token?: string | null
          status?: Database["public"]["Enums"]["integration_status"]
          token_expires_at?: string | null
          workspace_id: string
        }
        Update: {
          access_token?: string | null
          config?: Json
          connected_at?: string
          display_name?: string | null
          id?: string
          last_used_at?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_token?: string | null
          status?: Database["public"]["Enums"]["integration_status"]
          token_expires_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          idempotency_key: string | null
          kind: Database["public"]["Enums"]["job_kind"]
          max_attempts: number
          next_attempt_at: string | null
          payload: Json | null
          progress_pct: number | null
          progress_step: string | null
          result: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          subject_id: string | null
          subject_table: string | null
          workspace_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          idempotency_key?: string | null
          kind: Database["public"]["Enums"]["job_kind"]
          max_attempts?: number
          next_attempt_at?: string | null
          payload?: Json | null
          progress_pct?: number | null
          progress_step?: string | null
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          subject_id?: string | null
          subject_table?: string | null
          workspace_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: Database["public"]["Enums"]["job_kind"]
          max_attempts?: number
          next_attempt_at?: string | null
          payload?: Json | null
          progress_pct?: number | null
          progress_step?: string | null
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          subject_id?: string | null
          subject_table?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          angles: Json | null
          avatar: Json | null
          competitors: Json | null
          created_at: string
          id: string
          last_researched_at: string | null
          name: string
          niche: string | null
          objections: Json | null
          price_text: string | null
          promise: string | null
          proof: string | null
          thumbnail_url: string | null
          updated_at: string
          url: string | null
          workspace_id: string
        }
        Insert: {
          angles?: Json | null
          avatar?: Json | null
          competitors?: Json | null
          created_at?: string
          id?: string
          last_researched_at?: string | null
          name: string
          niche?: string | null
          objections?: Json | null
          price_text?: string | null
          promise?: string | null
          proof?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
          workspace_id: string
        }
        Update: {
          angles?: Json | null
          avatar?: Json | null
          competitors?: Json | null
          created_at?: string
          id?: string
          last_researched_at?: string | null
          name?: string
          niche?: string | null
          objections?: Json | null
          price_text?: string | null
          promise?: string | null
          proof?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      presets: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          name: string
          usage_count: number
          workspace_id: string
        }
        Insert: {
          config: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          usage_count?: number
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          usage_count?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          default_length: number | null
          id: string
          is_system: boolean
          kind: Database["public"]["Enums"]["template_kind"] | null
          name: string
          niches: string[] | null
          structure: Json
          summary: string | null
          usage_count: number
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          default_length?: number | null
          id?: string
          is_system?: boolean
          kind?: Database["public"]["Enums"]["template_kind"] | null
          name: string
          niches?: string[] | null
          structure?: Json
          summary?: string | null
          usage_count?: number
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          default_length?: number | null
          id?: string
          is_system?: boolean
          kind?: Database["public"]["Enums"]["template_kind"] | null
          name?: string
          niches?: string[] | null
          structure?: Json
          summary?: string | null
          usage_count?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_files: {
        Row: {
          created_at: string
          extracted_text: string | null
          id: string
          kind: Database["public"]["Enums"]["voice_file_kind"]
          mime_type: string | null
          name: string
          niches: string[] | null
          notes: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["voice_file_kind"]
          mime_type?: string | null
          name: string
          niches?: string[] | null
          notes?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["voice_file_kind"]
          mime_type?: string | null
          name?: string
          niches?: string[] | null
          notes?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          error: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
          signature: string | null
        }
        Insert: {
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          received_at?: string
          signature?: string | null
        }
        Update: {
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          signature?: string | null
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          autopilot_default: boolean
          default_batch_size: number
          default_run_mode: Database["public"]["Enums"]["batch_run_mode"]
          default_style_mix: string[]
          notification_email: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          autopilot_default?: boolean
          default_batch_size?: number
          default_run_mode?: Database["public"]["Enums"]["batch_run_mode"]
          default_style_mix?: string[]
          notification_email?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          autopilot_default?: boolean
          default_batch_size?: number
          default_run_mode?: Database["public"]["Enums"]["batch_run_mode"]
          default_style_mix?: string[]
          notification_email?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
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
          credits_total: number
          credits_used: number
          id: string
          name: string
          plan: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_total?: number
          credits_used?: number
          id?: string
          name: string
          plan?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_total?: number
          credits_used?: number
          id?: string
          name?: string
          plan?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_workspace_id: { Args: never; Returns: string }
    }
    Enums: {
      ad_status:
        | "queued"
        | "generating"
        | "needs_review"
        | "ready"
        | "failed"
        | "archived"
      ad_style:
        | "ugc_talking_head"
        | "b_roll_vo"
        | "testimonial"
        | "before_after"
        | "pattern_interrupt"
      adset_audience_type:
        | "advantage_plus"
        | "lookalike"
        | "interests"
        | "custom"
      adset_placement_mode: "advantage_plus" | "manual"
      adset_status:
        | "draft"
        | "generating"
        | "review"
        | "live"
        | "paused"
        | "archived"
      batch_run_mode: "autopilot" | "review_checkpoints"
      batch_status:
        | "queued"
        | "generating"
        | "needs_review"
        | "ready"
        | "partial"
        | "failed"
        | "cancelled"
      campaign_bid_strategy: "highest_volume" | "cost_cap" | "roas_goal"
      campaign_budget_type: "cbo" | "abo"
      campaign_objective: "conversions" | "leads" | "traffic" | "engagement"
      campaign_status:
        | "draft"
        | "generating"
        | "review"
        | "live"
        | "paused"
        | "archived"
      integration_provider: "meta" | "tiktok"
      integration_status:
        | "connected"
        | "disconnected"
        | "token_expired"
        | "error"
      job_kind:
        | "generate_batch"
        | "analyze_offer"
        | "push_to_meta"
        | "refresh_meta_metrics"
        | "extract_voice_file"
      job_status: "queued" | "running" | "succeeded" | "failed" | "cancelled"
      placement_status: "staged" | "pushed" | "failed" | "paused"
      template_kind:
        | "ugc_story"
        | "ugc_authority"
        | "ugc_pattern_interrupt"
        | "b_roll_listicle"
        | "b_roll_transform"
      voice_file_kind:
        | "swipe"
        | "script"
        | "brand_voice"
        | "transcript"
        | "other"
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
      ad_status: [
        "queued",
        "generating",
        "needs_review",
        "ready",
        "failed",
        "archived",
      ],
      ad_style: [
        "ugc_talking_head",
        "b_roll_vo",
        "testimonial",
        "before_after",
        "pattern_interrupt",
      ],
      adset_audience_type: [
        "advantage_plus",
        "lookalike",
        "interests",
        "custom",
      ],
      adset_placement_mode: ["advantage_plus", "manual"],
      adset_status: [
        "draft",
        "generating",
        "review",
        "live",
        "paused",
        "archived",
      ],
      batch_run_mode: ["autopilot", "review_checkpoints"],
      batch_status: [
        "queued",
        "generating",
        "needs_review",
        "ready",
        "partial",
        "failed",
        "cancelled",
      ],
      campaign_bid_strategy: ["highest_volume", "cost_cap", "roas_goal"],
      campaign_budget_type: ["cbo", "abo"],
      campaign_objective: ["conversions", "leads", "traffic", "engagement"],
      campaign_status: [
        "draft",
        "generating",
        "review",
        "live",
        "paused",
        "archived",
      ],
      integration_provider: ["meta", "tiktok"],
      integration_status: [
        "connected",
        "disconnected",
        "token_expired",
        "error",
      ],
      job_kind: [
        "generate_batch",
        "analyze_offer",
        "push_to_meta",
        "refresh_meta_metrics",
        "extract_voice_file",
      ],
      job_status: ["queued", "running", "succeeded", "failed", "cancelled"],
      placement_status: ["staged", "pushed", "failed", "paused"],
      template_kind: [
        "ugc_story",
        "ugc_authority",
        "ugc_pattern_interrupt",
        "b_roll_listicle",
        "b_roll_transform",
      ],
      voice_file_kind: [
        "swipe",
        "script",
        "brand_voice",
        "transcript",
        "other",
      ],
    },
  },
} as const

