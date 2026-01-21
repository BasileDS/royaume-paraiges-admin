export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          first_name: string | null;
          last_name: string | null;
          role: "customer" | "admin" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          role?: "customer" | "admin" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          role?: "customer" | "admin" | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupon_templates: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          amount: number | null;
          percentage: number | null;
                    validity_days: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          name: string;
          description?: string | null;
          amount?: number | null;
          percentage?: number | null;
                    validity_days?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          amount?: number | null;
          percentage?: number | null;
                    validity_days?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      reward_tiers: {
        Row: {
          id: number;
          name: string;
          rank_from: number;
          rank_to: number;
          coupon_template_id: number | null;
          badge_type_id: number | null;
          period_type: "weekly" | "monthly" | "yearly";
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          rank_from: number;
          rank_to: number;
          coupon_template_id?: number | null;
          badge_type_id?: number | null;
          period_type: "weekly" | "monthly" | "yearly";
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          rank_from?: number;
          rank_to?: number;
          coupon_template_id?: number | null;
          badge_type_id?: number | null;
          period_type?: "weekly" | "monthly" | "yearly";
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      period_reward_configs: {
        Row: {
          id: number;
          period_type: "weekly" | "monthly" | "yearly";
          period_identifier: string;
          custom_tiers: Json | null;
          status: "pending" | "distributed" | "cancelled";
          distributed_at: string | null;
          distributed_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          period_type: "weekly" | "monthly" | "yearly";
          period_identifier: string;
          custom_tiers?: Json | null;
          status?: "pending" | "distributed" | "cancelled";
          distributed_at?: string | null;
          distributed_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          period_type?: "weekly" | "monthly" | "yearly";
          period_identifier?: string;
          custom_tiers?: Json | null;
          status?: "pending" | "distributed" | "cancelled";
          distributed_at?: string | null;
          distributed_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupons: {
        Row: {
          id: number;
          customer_id: string;
          amount: number | null;
          percentage: number | null;
          used: boolean;
          created_at: string;
          template_id: number | null;
          expires_at: string | null;
          distribution_type: string | null;
          period_identifier: string | null;
        };
        Insert: {
          customer_id: string;
          amount?: number | null;
          percentage?: number | null;
          used?: boolean;
          created_at?: string;
          template_id?: number | null;
          expires_at?: string | null;
          distribution_type?: string | null;
          period_identifier?: string | null;
        };
        Update: {
          customer_id?: string;
          amount?: number | null;
          percentage?: number | null;
          used?: boolean;
          created_at?: string;
          template_id?: number | null;
          expires_at?: string | null;
          distribution_type?: string | null;
          period_identifier?: string | null;
        };
      };
      coupon_distribution_logs: {
        Row: {
          id: number;
          distribution_type: string;
          period_identifier: string | null;
          customer_id: string;
          coupon_id: number | null;
          coupon_template_id: number | null;
          rank: number | null;
          tier_id: number | null;
          xp_at_distribution: number | null;
          distributed_at: string;
          distributed_by: string | null;
          notes: string | null;
        };
        Insert: {
          distribution_type: string;
          period_identifier?: string | null;
          customer_id: string;
          coupon_id?: number | null;
          coupon_template_id?: number | null;
          rank?: number | null;
          tier_id?: number | null;
          xp_at_distribution?: number | null;
          distributed_at?: string;
          distributed_by?: string | null;
          notes?: string | null;
        };
        Update: {
          distribution_type?: string;
          period_identifier?: string | null;
          customer_id?: string;
          coupon_id?: number | null;
          coupon_template_id?: number | null;
          rank?: number | null;
          tier_id?: number | null;
          xp_at_distribution?: number | null;
          distributed_at?: string;
          distributed_by?: string | null;
          notes?: string | null;
        };
      };
      badge_types: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
      };
      receipts: {
        Row: {
          id: number;
          amount: number;
          customer_id: string;
          establishment_id: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          amount: number;
          customer_id: string;
          establishment_id: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          amount?: number;
          customer_id?: string;
          establishment_id?: number;
          created_at?: string;
        };
      };
      receipt_lines: {
        Row: {
          id: number;
          receipt_id: number;
          amount: number;
          payment_method: "card" | "cash" | "cashback" | "coupon";
          created_at: string;
        };
        Insert: {
          id?: number;
          receipt_id: number;
          amount: number;
          payment_method: "card" | "cash" | "cashback" | "coupon";
          created_at?: string;
        };
        Update: {
          id?: number;
          receipt_id?: number;
          amount?: number;
          payment_method?: "card" | "cash" | "cashback" | "coupon";
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      distribute_period_rewards_v2: {
        Args: {
          p_period_type: string;
          p_period_identifier?: string;
          p_force?: boolean;
          p_preview_only?: boolean;
          p_admin_id?: string;
        };
        Returns: Json;
      };
      create_manual_coupon: {
        Args: {
          p_customer_id: string;
          p_template_id?: number;
          p_amount?: number;
          p_percentage?: number;
          p_expires_at?: string;
          p_notes?: string;
          p_admin_id?: string;
        };
        Returns: Json;
      };
      get_period_preview: {
        Args: {
          p_period_type: string;
          p_period_identifier?: string;
        };
        Returns: Json;
      };
      get_coupon_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience types
export type CouponTemplate = Database["public"]["Tables"]["coupon_templates"]["Row"];
export type CouponTemplateInsert = Database["public"]["Tables"]["coupon_templates"]["Insert"];
export type CouponTemplateUpdate = Database["public"]["Tables"]["coupon_templates"]["Update"];

export type RewardTier = Database["public"]["Tables"]["reward_tiers"]["Row"];
export type RewardTierInsert = Database["public"]["Tables"]["reward_tiers"]["Insert"];
export type RewardTierUpdate = Database["public"]["Tables"]["reward_tiers"]["Update"];

export type PeriodRewardConfig = Database["public"]["Tables"]["period_reward_configs"]["Row"];
export type PeriodRewardConfigInsert = Database["public"]["Tables"]["period_reward_configs"]["Insert"];
export type PeriodRewardConfigUpdate = Database["public"]["Tables"]["period_reward_configs"]["Update"];

export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
export type CouponInsert = Database["public"]["Tables"]["coupons"]["Insert"];
export type CouponUpdate = Database["public"]["Tables"]["coupons"]["Update"];

export type CouponDistributionLog = Database["public"]["Tables"]["coupon_distribution_logs"]["Row"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type BadgeType = Database["public"]["Tables"]["badge_types"]["Row"];

export type Receipt = Database["public"]["Tables"]["receipts"]["Row"];
export type ReceiptInsert = Database["public"]["Tables"]["receipts"]["Insert"];
export type ReceiptLine = Database["public"]["Tables"]["receipt_lines"]["Row"];
export type PaymentMethod = "card" | "cash" | "cashback" | "coupon";

export type PeriodType = "weekly" | "monthly" | "yearly";
export type DistributionStatus = "pending" | "distributed" | "cancelled";

// Quest types
export type QuestType = "scan_receipts" | "earn_xp" | "visit_establishments";
export type QuestProgressStatus = "in_progress" | "completed" | "rewarded";

export interface Quest {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  quest_type: QuestType;
  target_value: number;
  period_type: PeriodType;
  coupon_template_id: number | null;
  badge_type_id: number | null;
  bonus_xp: number;
  bonus_cashback: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface QuestInsert {
  name: string;
  description?: string | null;
  slug: string;
  quest_type: QuestType;
  target_value: number;
  period_type: PeriodType;
  coupon_template_id?: number | null;
  badge_type_id?: number | null;
  bonus_xp?: number;
  bonus_cashback?: number;
  is_active?: boolean;
  display_order?: number;
  created_by?: string | null;
}

export interface QuestUpdate {
  name?: string;
  description?: string | null;
  slug?: string;
  quest_type?: QuestType;
  target_value?: number;
  period_type?: PeriodType;
  coupon_template_id?: number | null;
  badge_type_id?: number | null;
  bonus_xp?: number;
  bonus_cashback?: number;
  is_active?: boolean;
  display_order?: number;
}

export interface QuestProgress {
  id: number;
  quest_id: number;
  customer_id: string;
  period_type: PeriodType;
  period_identifier: string;
  current_value: number;
  target_value: number;
  status: QuestProgressStatus;
  completed_at: string | null;
  rewarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestCompletionLog {
  id: number;
  quest_id: number;
  quest_progress_id: number;
  customer_id: string;
  period_type: PeriodType;
  period_identifier: string;
  coupon_id: number | null;
  coupon_template_id: number | null;
  badge_awarded_id: number | null;
  bonus_xp_awarded: number;
  bonus_cashback_awarded: number;
  final_value: number;
  target_value: number;
  completed_at: string;
}

// Quest Periods - liaison quêtes <-> périodes spécifiques
export interface QuestPeriod {
  id: number;
  quest_id: number;
  period_identifier: string;
  created_at: string;
}

export interface QuestPeriodInsert {
  quest_id: number;
  period_identifier: string;
}

// Types avec relations
export interface QuestWithRelations extends Quest {
  coupon_templates: Pick<CouponTemplate, "name" | "amount" | "percentage"> | null;
  badge_types: Pick<BadgeType, "name"> | null;
  quest_periods?: QuestPeriod[];
}

// Available Periods - périodes disponibles pour la sélection
export interface AvailablePeriod {
  id: number;
  period_type: PeriodType;
  period_identifier: string;
  start_date: string;
  end_date: string;
  created_at: string;
}
