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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      available_periods: {
        Row: {
          created_at: string | null
          end_date: string
          id: number
          period_identifier: string
          period_type: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: never
          period_identifier: string
          period_type: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: never
          period_identifier?: string
          period_type?: string
          start_date?: string
        }
        Relationships: []
      }
      badge_types: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: number
          name: string
          rarity: string | null
          slug: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name: string
          rarity?: string | null
          slug: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: number
          name?: string
          rarity?: string | null
          slug?: string
        }
        Relationships: []
      }
      beer_styles: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      beers: {
        Row: {
          abv: number | null
          brewery_id: number | null
          created_at: string | null
          description: string | null
          featured_image: string | null
          ibu: number | null
          id: number
          title: string
          updated_at: string | null
        }
        Insert: {
          abv?: number | null
          brewery_id?: number | null
          created_at?: string | null
          description?: string | null
          featured_image?: string | null
          ibu?: number | null
          id: number
          title: string
          updated_at?: string | null
        }
        Update: {
          abv?: number | null
          brewery_id?: number | null
          created_at?: string | null
          description?: string | null
          featured_image?: string | null
          ibu?: number | null
          id?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beers_brewery_id_fkey"
            columns: ["brewery_id"]
            isOneToOne: false
            referencedRelation: "breweries"
            referencedColumns: ["id"]
          },
        ]
      }
      beers_beer_styles: {
        Row: {
          beer_id: number
          beer_style_id: number
          created_at: string | null
          id: number
        }
        Insert: {
          beer_id: number
          beer_style_id: number
          created_at?: string | null
          id?: never
        }
        Update: {
          beer_id?: number
          beer_style_id?: number
          created_at?: string | null
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "beers_beer_styles_beer_id_fkey"
            columns: ["beer_id"]
            isOneToOne: false
            referencedRelation: "beers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beers_beer_styles_beer_style_id_fkey"
            columns: ["beer_style_id"]
            isOneToOne: false
            referencedRelation: "beer_styles"
            referencedColumns: ["id"]
          },
        ]
      }
      beers_establishments: {
        Row: {
          added_at: string | null
          beer_id: number
          created_at: string | null
          establishment_id: number
          id: number
        }
        Insert: {
          added_at?: string | null
          beer_id: number
          created_at?: string | null
          establishment_id: number
          id?: never
        }
        Update: {
          added_at?: string | null
          beer_id?: number
          created_at?: string | null
          establishment_id?: number
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "beers_establishments_beer_id_fkey"
            columns: ["beer_id"]
            isOneToOne: false
            referencedRelation: "beers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beers_establishments_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      breweries: {
        Row: {
          country: string | null
          created_at: string | null
          id: number
          title: string
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          id: number
          title: string
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          id?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          beer_id: number | null
          content: string | null
          created_at: string
          customer_id: string
          establishment_id: number | null
          hidden: boolean
          id: number
          news_id: number | null
          quest_id: number | null
        }
        Insert: {
          beer_id?: number | null
          content?: string | null
          created_at?: string
          customer_id: string
          establishment_id?: number | null
          hidden?: boolean
          id?: number
          news_id?: number | null
          quest_id?: number | null
        }
        Update: {
          beer_id?: number | null
          content?: string | null
          created_at?: string
          customer_id?: string
          establishment_id?: number | null
          hidden?: boolean
          id?: number
          news_id?: number | null
          quest_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_beer_id_fkey"
            columns: ["beer_id"]
            isOneToOne: false
            referencedRelation: "beers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "comments_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      constants: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      coupon_distribution_logs: {
        Row: {
          badge_id: number | null
          coupon_amount: number | null
          coupon_establishment_id: number | null
          coupon_expires_at: string | null
          coupon_id: number | null
          coupon_percentage: number | null
          coupon_template_id: number | null
          customer_id: string
          distributed_at: string | null
          distributed_by: string | null
          distribution_type: string
          id: number
          notes: string | null
          period_identifier: string | null
          rank: number | null
          status: string | null
          tier_id: number | null
          tier_name: string | null
          user_badge_id: number | null
          xp_at_distribution: number | null
        }
        Insert: {
          badge_id?: number | null
          coupon_amount?: number | null
          coupon_establishment_id?: number | null
          coupon_expires_at?: string | null
          coupon_id?: number | null
          coupon_percentage?: number | null
          coupon_template_id?: number | null
          customer_id: string
          distributed_at?: string | null
          distributed_by?: string | null
          distribution_type: string
          id?: never
          notes?: string | null
          period_identifier?: string | null
          rank?: number | null
          status?: string | null
          tier_id?: number | null
          tier_name?: string | null
          user_badge_id?: number | null
          xp_at_distribution?: number | null
        }
        Update: {
          badge_id?: number | null
          coupon_amount?: number | null
          coupon_establishment_id?: number | null
          coupon_expires_at?: string | null
          coupon_id?: number | null
          coupon_percentage?: number | null
          coupon_template_id?: number | null
          customer_id?: string
          distributed_at?: string | null
          distributed_by?: string | null
          distribution_type?: string
          id?: never
          notes?: string | null
          period_identifier?: string | null
          rank?: number | null
          status?: string | null
          tier_id?: number | null
          tier_name?: string | null
          user_badge_id?: number | null
          xp_at_distribution?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_distribution_logs_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_distribution_logs_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_distribution_logs_coupon_template_id_fkey"
            columns: ["coupon_template_id"]
            isOneToOne: false
            referencedRelation: "coupon_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_distribution_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_distribution_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "coupon_distribution_logs_distributed_by_fkey"
            columns: ["distributed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_distribution_logs_distributed_by_fkey"
            columns: ["distributed_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "coupon_distribution_logs_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "reward_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_distribution_logs_user_badge_id_fkey"
            columns: ["user_badge_id"]
            isOneToOne: false
            referencedRelation: "user_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_templates: {
        Row: {
          amount: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          establishment_id: number | null
          id: number
          is_active: boolean | null
          name: string
          percentage: number | null
          updated_at: string | null
          validity_days: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          establishment_id?: number | null
          id?: never
          is_active?: boolean | null
          name: string
          percentage?: number | null
          updated_at?: string | null
          validity_days?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          establishment_id?: number | null
          id?: never
          is_active?: boolean | null
          name?: string
          percentage?: number | null
          updated_at?: string | null
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "coupon_templates_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          amount: number | null
          created_at: string
          customer_id: string
          distribution_type: string | null
          expires_at: string | null
          id: number
          percentage: number | null
          period_identifier: string | null
          template_id: number | null
          used: boolean
        }
        Insert: {
          amount?: number | null
          created_at?: string
          customer_id: string
          distribution_type?: string | null
          expires_at?: string | null
          id?: number
          percentage?: number | null
          period_identifier?: string | null
          template_id?: number | null
          used?: boolean
        }
        Update: {
          amount?: number | null
          created_at?: string
          customer_id?: string
          distribution_type?: string | null
          expires_at?: string | null
          id?: number
          percentage?: number | null
          period_identifier?: string | null
          template_id?: number | null
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "coupons_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "coupons_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "coupon_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          anniversary: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          featured_image: string | null
          id: number
          line_address_1: string | null
          line_address_2: string | null
          logo: string | null
          short_description: string | null
          title: string
          updated_at: string | null
          zipcode: string | null
        }
        Insert: {
          anniversary?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          featured_image?: string | null
          id: number
          line_address_1?: string | null
          line_address_2?: string | null
          logo?: string | null
          short_description?: string | null
          title: string
          updated_at?: string | null
          zipcode?: string | null
        }
        Update: {
          anniversary?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          featured_image?: string | null
          id?: number
          line_address_1?: string | null
          line_address_2?: string | null
          logo?: string | null
          short_description?: string | null
          title?: string
          updated_at?: string | null
          zipcode?: string | null
        }
        Relationships: []
      }
      gains: {
        Row: {
          cashback_money: number | null
          coupon_id: number | null
          created_at: string
          customer_id: string
          establishment_id: number | null
          id: number
          period_identifier: string | null
          receipt_id: number | null
          source_type: string | null
          xp: number | null
        }
        Insert: {
          cashback_money?: number | null
          coupon_id?: number | null
          created_at?: string
          customer_id: string
          establishment_id?: number | null
          id?: number
          period_identifier?: string | null
          receipt_id?: number | null
          source_type?: string | null
          xp?: number | null
        }
        Update: {
          cashback_money?: number | null
          coupon_id?: number | null
          created_at?: string
          customer_id?: string
          establishment_id?: number | null
          id?: number
          period_identifier?: string | null
          receipt_id?: number | null
          source_type?: string | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gains_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gains_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "gains_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gains_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gains_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_reward_distributions: {
        Row: {
          badge_ids: number[] | null
          coupon_amount_id: number | null
          coupon_percentage_id: number | null
          created_at: string | null
          customer_id: string
          distributed_at: string | null
          distribution_status: string | null
          error_message: string | null
          id: number
          period_identifier: string
          period_type: string
          rank: number
        }
        Insert: {
          badge_ids?: number[] | null
          coupon_amount_id?: number | null
          coupon_percentage_id?: number | null
          created_at?: string | null
          customer_id: string
          distributed_at?: string | null
          distribution_status?: string | null
          error_message?: string | null
          id?: number
          period_identifier: string
          period_type: string
          rank: number
        }
        Update: {
          badge_ids?: number[] | null
          coupon_amount_id?: number | null
          coupon_percentage_id?: number | null
          created_at?: string | null
          customer_id?: string
          distributed_at?: string | null
          distribution_status?: string | null
          error_message?: string | null
          id?: number
          period_identifier?: string
          period_type?: string
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_reward_distributions_coupon_amount_id_fkey"
            columns: ["coupon_amount_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_reward_distributions_coupon_percentage_id_fkey"
            columns: ["coupon_percentage_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_reward_distributions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboard_reward_distributions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      level_thresholds: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          level: number
          name: string
          sort_order: number | null
          updated_at: string | null
          xp_required: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: number
          level: number
          name: string
          sort_order?: number | null
          updated_at?: string | null
          xp_required: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          level?: number
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          xp_required?: number
        }
        Relationships: []
      }
      likes: {
        Row: {
          beer_id: number | null
          created_at: string
          id: number
          news_id: number | null
          quest_id: number | null
          user_id: string
        }
        Insert: {
          beer_id?: number | null
          created_at?: string
          id?: number
          news_id?: number | null
          quest_id?: number | null
          user_id: string
        }
        Update: {
          beer_id?: number | null
          created_at?: string
          id?: number
          news_id?: number | null
          quest_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_beer_id_fkey"
            columns: ["beer_id"]
            isOneToOne: false
            referencedRelation: "beers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      news: {
        Row: {
          content: string | null
          created_at: string | null
          featured_image: string | null
          id: number
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          featured_image?: string | null
          id: number
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          featured_image?: string | null
          id?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      news_establishments: {
        Row: {
          created_at: string | null
          establishment_id: number
          id: number
          news_id: number
        }
        Insert: {
          created_at?: string | null
          establishment_id: number
          id?: never
          news_id: number
        }
        Update: {
          created_at?: string | null
          establishment_id?: number
          id?: never
          news_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "news_establishments_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_establishments_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "news"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          created_at: string
          customer_id: string
          id: number
          note: number
        }
        Insert: {
          created_at?: string
          customer_id?: string
          id?: number
          note: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: number
          note?: number
        }
        Relationships: [
          {
            foreignKeyName: "notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      period_closures: {
        Row: {
          closed_at: string | null
          created_at: string | null
          distribution_duration_ms: number | null
          error_logs: Json | null
          id: number
          period_identifier: string
          period_type: string
          rewards_distributed_count: number | null
          status: string | null
          total_eligible_users: number | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          distribution_duration_ms?: number | null
          error_logs?: Json | null
          id?: number
          period_identifier: string
          period_type: string
          rewards_distributed_count?: number | null
          status?: string | null
          total_eligible_users?: number | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          distribution_duration_ms?: number | null
          error_logs?: Json | null
          id?: number
          period_identifier?: string
          period_type?: string
          rewards_distributed_count?: number | null
          status?: string | null
          total_eligible_users?: number | null
        }
        Relationships: []
      }
      period_reward_configs: {
        Row: {
          created_at: string | null
          created_by: string | null
          custom_tiers: Json | null
          distributed_at: string | null
          distributed_by: string | null
          id: number
          notes: string | null
          period_identifier: string
          period_type: string
          scheduled_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custom_tiers?: Json | null
          distributed_at?: string | null
          distributed_by?: string | null
          id?: never
          notes?: string | null
          period_identifier: string
          period_type: string
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custom_tiers?: Json | null
          distributed_at?: string | null
          distributed_by?: string | null
          id?: never
          notes?: string | null
          period_identifier?: string
          period_type?: string
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "period_reward_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_reward_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "period_reward_configs_distributed_by_fkey"
            columns: ["distributed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "period_reward_configs_distributed_by_fkey"
            columns: ["distributed_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      profiles: {
        Row: {
          attached_establishment_id: number | null
          avatar_url: string | null
          birthdate: string | null
          cashback_coefficient: number
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          username: string | null
          xp_coefficient: number
        }
        Insert: {
          attached_establishment_id?: number | null
          avatar_url?: string | null
          birthdate?: string | null
          cashback_coefficient?: number
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username?: string | null
          xp_coefficient?: number
        }
        Update: {
          attached_establishment_id?: number | null
          avatar_url?: string | null
          birthdate?: string | null
          cashback_coefficient?: number
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username?: string | null
          xp_coefficient?: number
        }
        Relationships: []
      }
      quest_completion_logs: {
        Row: {
          badge_awarded_id: number | null
          bonus_cashback_awarded: number
          bonus_xp_awarded: number
          completed_at: string
          coupon_id: number | null
          coupon_template_id: number | null
          customer_id: string
          final_value: number
          id: number
          period_identifier: string
          period_type: string
          quest_id: number
          quest_progress_id: number
          target_value: number
        }
        Insert: {
          badge_awarded_id?: number | null
          bonus_cashback_awarded?: number
          bonus_xp_awarded?: number
          completed_at?: string
          coupon_id?: number | null
          coupon_template_id?: number | null
          customer_id: string
          final_value: number
          id?: number
          period_identifier: string
          period_type: string
          quest_id: number
          quest_progress_id: number
          target_value: number
        }
        Update: {
          badge_awarded_id?: number | null
          bonus_cashback_awarded?: number
          bonus_xp_awarded?: number
          completed_at?: string
          coupon_id?: number | null
          coupon_template_id?: number | null
          customer_id?: string
          final_value?: number
          id?: number
          period_identifier?: string
          period_type?: string
          quest_id?: number
          quest_progress_id?: number
          target_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "quest_completion_logs_badge_awarded_id_fkey"
            columns: ["badge_awarded_id"]
            isOneToOne: false
            referencedRelation: "user_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_completion_logs_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_completion_logs_coupon_template_id_fkey"
            columns: ["coupon_template_id"]
            isOneToOne: false
            referencedRelation: "coupon_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_completion_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_completion_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quest_completion_logs_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_completion_logs_quest_progress_id_fkey"
            columns: ["quest_progress_id"]
            isOneToOne: false
            referencedRelation: "quest_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_periods: {
        Row: {
          created_at: string | null
          id: number
          period_identifier: string
          quest_id: number
        }
        Insert: {
          created_at?: string | null
          id?: never
          period_identifier: string
          quest_id: number
        }
        Update: {
          created_at?: string | null
          id?: never
          period_identifier?: string
          quest_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "quest_periods_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number
          customer_id: string
          id: number
          period_identifier: string
          period_type: string
          quest_id: number
          rewarded_at: string | null
          status: string
          target_value: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          customer_id: string
          id?: number
          period_identifier: string
          period_type: string
          quest_id: number
          rewarded_at?: string | null
          status?: string
          target_value: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          customer_id?: string
          id?: number
          period_identifier?: string
          period_type?: string
          quest_id?: number
          rewarded_at?: string | null
          status?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_progress_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_progress_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          badge_type_id: number | null
          bonus_cashback: number
          bonus_xp: number
          coupon_template_id: number | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: number
          is_active: boolean
          name: string
          period_type: string
          quest_type: Database["public"]["Enums"]["quest_type"]
          slug: string
          target_value: number
          updated_at: string
        }
        Insert: {
          badge_type_id?: number | null
          bonus_cashback?: number
          bonus_xp?: number
          coupon_template_id?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: number
          is_active?: boolean
          name: string
          period_type: string
          quest_type: Database["public"]["Enums"]["quest_type"]
          slug: string
          target_value: number
          updated_at?: string
        }
        Update: {
          badge_type_id?: number | null
          bonus_cashback?: number
          bonus_xp?: number
          coupon_template_id?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: number
          is_active?: boolean
          name?: string
          period_type?: string
          quest_type?: Database["public"]["Enums"]["quest_type"]
          slug?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quests_badge_type_id_fkey"
            columns: ["badge_type_id"]
            isOneToOne: false
            referencedRelation: "badge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_coupon_template_id_fkey"
            columns: ["coupon_template_id"]
            isOneToOne: false
            referencedRelation: "coupon_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      receipt_consumption_items: {
        Row: {
          id: number
          created_at: string
          receipt_id: number
          consumption_type: Database["public"]["Enums"]["consumption_type"]
          quantity: number
        }
        Insert: {
          id?: never
          created_at?: string
          receipt_id: number
          consumption_type: Database["public"]["Enums"]["consumption_type"]
          quantity: number
        }
        Update: {
          id?: never
          created_at?: string
          receipt_id?: number
          consumption_type?: Database["public"]["Enums"]["consumption_type"]
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipt_consumption_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_lines: {
        Row: {
          amount: number
          created_at: string
          id: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_id: number
        }
        Insert: {
          amount: number
          created_at?: string
          id?: number
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_id: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: number
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipt_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          employee_id: string | null
          establishment_id: number
          id: number
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          employee_id?: string | null
          establishment_id: number
          id?: number
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          employee_id?: string | null
          establishment_id?: number
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "receipts_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_tiers: {
        Row: {
          badge_type_id: number | null
          coupon_template_id: number | null
          created_at: string | null
          display_order: number | null
          id: number
          is_active: boolean | null
          name: string
          period_type: string
          rank_from: number
          rank_to: number
          updated_at: string | null
        }
        Insert: {
          badge_type_id?: number | null
          coupon_template_id?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: never
          is_active?: boolean | null
          name: string
          period_type: string
          rank_from: number
          rank_to: number
          updated_at?: string | null
        }
        Update: {
          badge_type_id?: number | null
          coupon_template_id?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: never
          is_active?: boolean | null
          name?: string
          period_type?: string
          rank_from?: number
          rank_to?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_tiers_badge_type_id_fkey"
            columns: ["badge_type_id"]
            isOneToOne: false
            referencedRelation: "badge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_tiers_coupon_template_id_fkey"
            columns: ["coupon_template_id"]
            isOneToOne: false
            referencedRelation: "coupon_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      spendings: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          establishment_id: number
          id: number
          receipt_id: number | null
          source_type: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          establishment_id: number
          id?: number
          receipt_id?: number | null
          source_type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          establishment_id?: number
          id?: number
          receipt_id?: number | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spendings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spendings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "spendings_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spendings_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: number
          created_at: string | null
          customer_id: string
          earned_at: string | null
          id: number
          period_identifier: string | null
          period_type: string | null
          rank: number | null
        }
        Insert: {
          badge_id: number
          created_at?: string | null
          customer_id: string
          earned_at?: string | null
          id?: number
          period_identifier?: string | null
          period_type?: string | null
          rank?: number | null
        }
        Update: {
          badge_id?: number
          created_at?: string | null
          customer_id?: string
          earned_at?: string | null
          id?: number
          period_identifier?: string | null
          period_type?: string | null
          rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
        ]
      }
    }
    Views: {
      monthly_xp_leaderboard: {
        Row: {
          customer_id: string | null
          first_receipt_at: string | null
          monthly_establishment_count: number | null
          monthly_receipt_count: number | null
          monthly_total_spent: number | null
          monthly_xp: number | null
          rank: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      reward_distribution_stats: {
        Row: {
          closed_at: string | null
          distribution_duration_ms: number | null
          period_identifier: string | null
          period_type: string | null
          rewards_distributed_count: number | null
          status: string | null
          total_badges_awarded: number | null
          total_coupons_created: number | null
          total_euros_distributed: number | null
          unique_winners: number | null
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          cashback_available: number | null
          cashback_earned: number | null
          cashback_spent: number | null
          customer_id: string | null
          total_xp: number | null
        }
        Relationships: []
      }
      weekly_xp_leaderboard: {
        Row: {
          customer_id: string | null
          first_receipt_at: string | null
          rank: number | null
          weekly_establishment_count: number | null
          weekly_receipt_count: number | null
          weekly_total_spent: number | null
          weekly_xp: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      yearly_xp_leaderboard: {
        Row: {
          customer_id: string | null
          first_receipt_at: string | null
          rank: number | null
          yearly_establishment_count: number | null
          yearly_receipt_count: number | null
          yearly_total_spent: number | null
          yearly_xp: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["customer_id"]
          },
        ]
      }
    }
    Functions: {
      award_user_badge: {
        Args: {
          p_badge_slug: string
          p_customer_id: string
          p_period_identifier: string
          p_period_type: string
          p_rank: number
        }
        Returns: Json
      }
      calculate_gains: { Args: { p_amount_for_gains: number }; Returns: Json }
      calculate_quest_progress:
        | {
            Args: {
              p_customer_id: string
              p_period_identifier?: string
              p_quest_id: number
            }
            Returns: number
          }
        | {
            Args: {
              p_customer_id: string
              p_period_identifier?: string
              p_quest_id: number
            }
            Returns: number
          }
      check_cashback_balance: {
        Args: { p_cashback_requested: number; p_customer_id: string }
        Returns: Json
      }
      check_email_exists: { Args: { email_to_check: string }; Returns: boolean }
      check_period_closed: {
        Args: { p_period_identifier: string; p_period_type: string }
        Returns: boolean
      }
      credit_bonus_cashback: {
        Args: {
          p_customer_id: string
          p_amount: number
          p_coupon_id: number
          p_source_type?: string
        }
        Returns: number
      }
      create_frequency_coupon: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      create_leaderboard_reward_coupon: {
        Args: {
          p_amount?: number
          p_customer_id: string
          p_percentage?: number
        }
        Returns: Json
      }
      create_manual_coupon: {
        Args: {
          p_admin_id?: string
          p_amount?: number
          p_customer_id: string
          p_expires_at?: string
          p_notes?: string
          p_percentage?: number
          p_template_id?: number
          p_validity_days?: number
        }
        Returns: Json
      }
      create_receipt: {
        Args: {
          p_coupon_ids?: number[]
          p_customer_id: string
          p_employee_id?: string
          p_establishment_id: number
          p_payment_methods: Json
          p_consumption_items?: Json
        }
        Returns: Json
      }
      get_analytics_debts: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_establishment_id?: number
          p_employee_id?: string
        }
        Returns: Json
      }
      get_analytics_revenue: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_establishment_id?: number
          p_employee_id?: string
        }
        Returns: Json
      }
      get_analytics_stock: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_establishment_id?: number
        }
        Returns: Json
      }
      create_weekly_coupon: { Args: { p_customer_id: string }; Returns: Json }
      distribute_all_quest_rewards: {
        Args: { p_admin_id?: string }
        Returns: Json
      }
      distribute_leaderboard_rewards: {
        Args: { p_force?: boolean; p_period_type: string }
        Returns: Json
      }
      distribute_period_rewards_v2: {
        Args: {
          p_admin_id?: string
          p_force?: boolean
          p_period_identifier?: string
          p_period_type: string
          p_preview_only?: boolean
        }
        Returns: Json
      }
      distribute_quest_reward: {
        Args: { p_admin_id?: string; p_quest_progress_id: number }
        Returns: Json
      }
      get_coupon_stats: { Args: never; Returns: Json }
      get_current_user_role: { Args: never; Returns: string }
      get_customer_available_coupons: {
        Args: { p_customer_id: string }
        Returns: {
          amount: number
          created_at: string
          customer_id: string
          id: number
          percentage: number
          used: boolean
        }[]
      }
      get_period_bounds: {
        Args: { p_period_identifier: string; p_period_type: string }
        Returns: {
          period_end: string
          period_start: string
        }[]
      }
      get_period_identifier: {
        Args: { p_date?: string; p_period_type: string }
        Returns: string
      }
      get_period_preview: {
        Args: { p_period_identifier?: string; p_period_type: string }
        Returns: Json
      }
      get_user_badges: {
        Args: { p_customer_id: string }
        Returns: {
          badge_id: number
          category: string
          description: string
          earned_at: string
          icon: string
          name: string
          period_identifier: string
          period_type: string
          rank: number
          rarity: string
          slug: string
        }[]
      }
      get_user_cashback_balance: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      get_user_complete_stats: {
        Args: { p_customer_id: string }
        Returns: Json
      }
      get_user_info: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          email: string
          first_name: string
          id: string
          last_name: string
          username: string
        }[]
      }
      get_user_quests: {
        Args: { p_customer_id: string; p_period_type?: string }
        Returns: Json
      }
      get_user_xp_stats: { Args: { p_customer_id: string }; Returns: Json }
      sync_auth_to_profiles: {
        Args: never
        Returns: {
          synced_count: number
          user_ids: string[]
        }[]
      }
      update_profile_from_auth: {
        Args: { user_id: string }
        Returns: undefined
      }
      update_quest_progress_for_receipt: {
        Args: { p_receipt_id: number }
        Returns: Json
      }
      validate_coupons: {
        Args: { p_coupon_ids: number[]; p_customer_id: string }
        Returns: Json
      }
      validate_payment_methods: {
        Args: { p_payment_methods: Json }
        Returns: Json
      }
    }
    Enums: {
      consumption_type:
        | "cocktail"
        | "biere"
        | "alcool"
        | "soft"
        | "boisson_chaude"
        | "restauration"
      payment_method: "card" | "cash" | "cashback" | "coupon"
      quest_type:
        | "xp_earned"
        | "amount_spent"
        | "establishments_visited"
        | "orders_count"
      user_role: "client" | "employee" | "establishment" | "admin"
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
      consumption_type: [
        "cocktail",
        "biere",
        "alcool",
        "soft",
        "boisson_chaude",
        "restauration",
      ],
      payment_method: ["card", "cash", "cashback", "coupon"],
      quest_type: [
        "xp_earned",
        "amount_spent",
        "establishments_visited",
        "orders_count",
      ],
      user_role: ["client", "employee", "establishment", "admin"],
    },
  },
} as const

// =============================================================================
// Type Helpers
// =============================================================================

// Profiles
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

// Coupons
export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
export type CouponInsert = Database["public"]["Tables"]["coupons"]["Insert"];
export type CouponUpdate = Database["public"]["Tables"]["coupons"]["Update"];

// Coupon Templates
export type CouponTemplate = Database["public"]["Tables"]["coupon_templates"]["Row"];
export type CouponTemplateInsert = Database["public"]["Tables"]["coupon_templates"]["Insert"];
export type CouponTemplateUpdate = Database["public"]["Tables"]["coupon_templates"]["Update"];

// Coupon Distribution Logs
export type CouponDistributionLog = Database["public"]["Tables"]["coupon_distribution_logs"]["Row"];
export type CouponDistributionLogInsert = Database["public"]["Tables"]["coupon_distribution_logs"]["Insert"];

// Receipts
export type Receipt = Database["public"]["Tables"]["receipts"]["Row"];
export type ReceiptInsert = Database["public"]["Tables"]["receipts"]["Insert"];

// Receipt Lines
export type ReceiptLine = Database["public"]["Tables"]["receipt_lines"]["Row"];
export type ReceiptLineInsert = Database["public"]["Tables"]["receipt_lines"]["Insert"];

// Receipt Consumption Items
export type ReceiptConsumptionItem = Database["public"]["Tables"]["receipt_consumption_items"]["Row"];
export type ReceiptConsumptionItemInsert = Database["public"]["Tables"]["receipt_consumption_items"]["Insert"];

// Reward Tiers
export type RewardTier = Database["public"]["Tables"]["reward_tiers"]["Row"];
export type RewardTierInsert = Database["public"]["Tables"]["reward_tiers"]["Insert"];
export type RewardTierUpdate = Database["public"]["Tables"]["reward_tiers"]["Update"];

// Period Reward Configs
export type PeriodRewardConfig = Database["public"]["Tables"]["period_reward_configs"]["Row"];
export type PeriodRewardConfigInsert = Database["public"]["Tables"]["period_reward_configs"]["Insert"];
export type PeriodRewardConfigUpdate = Database["public"]["Tables"]["period_reward_configs"]["Update"];

// Available Periods
export type AvailablePeriod = Database["public"]["Tables"]["available_periods"]["Row"];

// Quests
export type Quest = Database["public"]["Tables"]["quests"]["Row"];
export type QuestInsert = Database["public"]["Tables"]["quests"]["Insert"];
export type QuestUpdate = Database["public"]["Tables"]["quests"]["Update"];

// Quest Periods
export type QuestPeriod = Database["public"]["Tables"]["quest_periods"]["Row"];
export type QuestPeriodInsert = Database["public"]["Tables"]["quest_periods"]["Insert"];

// Quest Completion Logs
export type QuestCompletionLog = Database["public"]["Tables"]["quest_completion_logs"]["Row"];
export type QuestCompletionLogInsert = Database["public"]["Tables"]["quest_completion_logs"]["Insert"];

// Badge Types
export type BadgeType = Database["public"]["Tables"]["badge_types"]["Row"];

// User Badges
export type UserBadge = Database["public"]["Tables"]["user_badges"]["Row"];

// Gains
export type Gain = Database["public"]["Tables"]["gains"]["Row"];

// Beers
export type Beer = Database["public"]["Tables"]["beers"]["Row"];
export type BeerInsert = Database["public"]["Tables"]["beers"]["Insert"];
export type BeerUpdate = Database["public"]["Tables"]["beers"]["Update"];

// Establishments
export type Establishment = Database["public"]["Tables"]["establishments"]["Row"];
export type EstablishmentInsert = Database["public"]["Tables"]["establishments"]["Insert"];
export type EstablishmentUpdate = Database["public"]["Tables"]["establishments"]["Update"];

// Breweries
export type Brewery = Database["public"]["Tables"]["breweries"]["Row"];

// Enums
export type UserRole = Database["public"]["Enums"]["user_role"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type QuestType = Database["public"]["Enums"]["quest_type"];
export type ConsumptionType = Database["public"]["Enums"]["consumption_type"];

// Custom types
export type PeriodType = "weekly" | "monthly" | "yearly";
export type DistributionStatus = "pending" | "distributed" | "failed" | "cancelled";

// Extended types with relations
export type QuestWithRelations = Quest & {
  coupon_templates?: CouponTemplate | null;
  badge_types?: BadgeType | null;
  quest_periods?: QuestPeriod[];
};

export type CouponWithRelations = Coupon & {
  profiles?: Pick<Profile, "first_name" | "last_name" | "email"> | null;
  coupon_templates?: Pick<CouponTemplate, "name"> | null;
};

export type RewardTierWithRelations = RewardTier & {
  coupon_templates?: CouponTemplate | null;
  badge_types?: BadgeType | null;
};
