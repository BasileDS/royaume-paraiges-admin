/**
 * Helpers (alias) — types facilitant l'usage dans les services et UI.
 *
 * Ce fichier n'est JAMAIS régénéré par `npm run supabase:types` — le script
 * réécrit uniquement `database.generated.ts`. Les alias ici restent stables
 * et peuvent être enrichis au fil des migrations.
 */

import type { Database } from "./database.generated";

// Enums
export type QuestType = Database["public"]["Enums"]["quest_type"];
export type ConsumptionType = Database["public"]["Enums"]["consumption_type"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type PeriodType = "weekly" | "monthly" | "yearly";

// Tables — Row + Insert + Update selon usage
export type Quest = Database["public"]["Tables"]["quests"]["Row"];
export type QuestInsert = Database["public"]["Tables"]["quests"]["Insert"];
export type QuestUpdate = Database["public"]["Tables"]["quests"]["Update"];

export type QuestProgress = Database["public"]["Tables"]["quest_progress"]["Row"];
export type QuestPeriod = Database["public"]["Tables"]["quest_periods"]["Row"];
export type QuestPeriodInsert = Database["public"]["Tables"]["quest_periods"]["Insert"];
export type QuestCompletionLog = Database["public"]["Tables"]["quest_completion_logs"]["Row"];

// Overrides par itération des quêtes répétables (migration 066).
// Itération 1 = la quête elle-même ; chaque champ NULL hérite de la quête de base.
export type QuestIteration = Database["public"]["Tables"]["quest_iterations"]["Row"];
export type QuestIterationInsert = Database["public"]["Tables"]["quest_iterations"]["Insert"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
export type CouponTemplate = Database["public"]["Tables"]["coupon_templates"]["Row"];
export type CouponTemplateInsert = Database["public"]["Tables"]["coupon_templates"]["Insert"];
export type CouponTemplateUpdate = Database["public"]["Tables"]["coupon_templates"]["Update"];
export type CouponDistributionLog = Database["public"]["Tables"]["coupon_distribution_logs"]["Row"];

export type Receipt = Database["public"]["Tables"]["receipts"]["Row"];
export type ReceiptLine = Database["public"]["Tables"]["receipt_lines"]["Row"];
export type ReceiptConsumptionItem = Database["public"]["Tables"]["receipt_consumption_items"]["Row"];

export type Gain = Database["public"]["Tables"]["gains"]["Row"];
export type BadgeType = Database["public"]["Tables"]["badge_types"]["Row"];

export type RewardTier = Database["public"]["Tables"]["reward_tiers"]["Row"];
export type RewardTierInsert = Database["public"]["Tables"]["reward_tiers"]["Insert"];
export type RewardTierUpdate = Database["public"]["Tables"]["reward_tiers"]["Update"];

export type PeriodRewardConfig = Database["public"]["Tables"]["period_reward_configs"]["Row"];
export type PeriodRewardConfigInsert = Database["public"]["Tables"]["period_reward_configs"]["Insert"];

export type AvailablePeriod = Database["public"]["Tables"]["available_periods"]["Row"];
export type GdprRequest = Database["public"]["Tables"]["gdpr_requests"]["Row"];

// Quest avec relations (pour l'admin)
export type QuestWithRelations = Quest & {
  coupon_templates?: Pick<CouponTemplate, "id" | "name" | "amount" | "percentage"> | null;
  badge_types?: Pick<BadgeType, "id" | "name" | "icon" | "rarity"> | null;
  quest_periods?: QuestPeriod[];
  quest_iterations?: QuestIteration[];
};

// Content tables — Update helpers (utilisés par contentService)
export type BeerUpdate = Database["public"]["Tables"]["beers"]["Update"];
export type EstablishmentUpdate = Database["public"]["Tables"]["establishments"]["Update"];

// Distribution status (utilisé par les pages reward periods)
export type DistributionStatus = "pending" | "distributed" | "cancelled" | "failed";

// Quest <-> Establishment M2M (migration 020)
export type QuestEstablishment = Database["public"]["Tables"]["quests_establishments"]["Row"];
export type QuestEstablishmentInsert = Database["public"]["Tables"]["quests_establishments"]["Insert"];

// Admin settings key-value (migration 020)
export type AdminSetting = Database["public"]["Tables"]["admin_settings"]["Row"];
export type AdminSettingInsert = Database["public"]["Tables"]["admin_settings"]["Insert"];
export type AdminSettingUpdate = Database["public"]["Tables"]["admin_settings"]["Update"];

// Accès par fonctionnalité entre admins (migration 057)
export type AdminDisabledFeature = Database["public"]["Tables"]["admin_disabled_features"]["Row"];
export type AdminDisabledFeatureInsert = Database["public"]["Tables"]["admin_disabled_features"]["Insert"];

// Ranks (groupes de niveaux éditables depuis /content/storytelling)
export type Rank = Database["public"]["Tables"]["ranks"]["Row"];
export type RankInsert = Database["public"]["Tables"]["ranks"]["Insert"];
export type RankUpdate = Database["public"]["Tables"]["ranks"]["Update"];

// Cashpad reconciliation (migration 032).
// Le statut est stocké en TEXT côté BDD (CHECK constraint) et la liste de
// candidats en JSONB — on durcit ici le typage pour l'usage applicatif.
export type ReconciliationStatus =
  | "matched"
  | "orphan_royaume"
  | "ambiguous"
  | "excluded_cashback";

export interface CashpadMatchingParams {
  establishment_id: number;
  clock_offset_seconds: number;
  window_seconds: number;
  sample_size: number;
  computed_at: string;
}

export interface CashpadSnapshotProduct {
  name: string;
  qty: number;
  price_cents: number;
  category: string | null;
}

export interface ReconciliationCandidate {
  cashpad_receipt_id: string;
  time_delta_seconds: number;
  amount_cents: number;
}

type CashpadReceiptSnapshotRow =
  Database["public"]["Tables"]["cashpad_receipts_snapshot"]["Row"];

export type CashpadReceiptSnapshot = Omit<CashpadReceiptSnapshotRow, "products"> & {
  products: CashpadSnapshotProduct[] | null;
};

type CashpadReconciliationRow =
  Database["public"]["Tables"]["cashpad_reconciliations"]["Row"];

export type CashpadReconciliation = Omit<
  CashpadReconciliationRow,
  "status" | "candidates"
> & {
  status: ReconciliationStatus;
  candidates: ReconciliationCandidate[] | null;
};

// Liens de redirection redirect.auxparaiges.fr (migration 063)
export type RedirectLink = Database["public"]["Tables"]["redirect_links"]["Row"];
export type RedirectLinkInsert = Database["public"]["Tables"]["redirect_links"]["Insert"];
export type RedirectLinkUpdate = Database["public"]["Tables"]["redirect_links"]["Update"];
export type RedirectClick = Database["public"]["Tables"]["redirect_clicks"]["Row"];

export type RedirectDeviceType = "ios" | "android" | "desktop" | "other";

/** Lien enrichi des agrégats de la vue `redirect_link_stats`. */
export type RedirectLinkWithStats = RedirectLink & {
  total_clicks: number;
  last_click_at: string | null;
};

// ============================================================================
// Rapports e-mail automatises (migrations 076 / 077)
// ============================================================================
//
// Ces trois tables ne figurent pas dans `database.generated.ts` : la
// regeneration passe par un CLI Supabase connecte a un autre compte, qui n'a
// pas acces au projet Royaume (elle vide le fichier au lieu de le remplir).
// Les types sont donc ecrits a la main ici, ou rien n'est jamais regenere.
// A la prochaine regeneration reussie, ce bloc peut etre remplace par les
// alias `Database["public"]["Tables"][...]` habituels.

/** Type de donnees d'un rapport : determine le builder SQL et le gabarit HTML. */
export type EmailReportType = "activity_summary" | "leaderboard";

/** Periodicite d'un rapport. Le rapport porte toujours sur la periode ecoulee. */
export type EmailReportPeriodType = "weekly" | "monthly";

/** Issue d'une tentative d'envoi. */
export type EmailReportRunStatus = "success" | "partial" | "error" | "skipped";

/** Origine d'une tentative d'envoi. */
export type EmailReportTriggerSource = "cron" | "manual" | "test";

export type EmailReport = {
  id: string;
  key: string;
  report_type: EmailReportType;
  period_type: EmailReportPeriodType;
  name: string;
  description: string | null;
  subject_template: string;
  options: { top_n?: number } | null;
  is_active: boolean;
  /** Derniere periode envoyee : porte l'idempotence du cron. */
  last_period_sent: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EmailReportRecipient = {
  id: string;
  report_id: string;
  /** Normalisee en minuscules par un trigger BDD. */
  email: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

export type EmailReportRun = {
  id: number;
  report_id: string;
  period_identifier: string;
  status: EmailReportRunStatus;
  trigger_source: EmailReportTriggerSource;
  sent_count: number;
  failed_count: number;
  error_message: string | null;
  payload: Record<string, unknown> | null;
  triggered_by: string | null;
  started_at: string;
  finished_at: string | null;
}

/** Rapport enrichi des agregats affiches dans la liste /reports. */
export type EmailReportWithStats = EmailReport & {
  recipients_count: number;
  last_run: EmailReportRun | null;
};

/**
 * Schema minimal decrivant uniquement les tables des rapports, pour typer le
 * client Supabase sans toucher a `database.generated.ts`. La forme (Row /
 * Insert / Update / Relationships + Views / Functions / Enums / CompositeTypes
 * vides) reproduit celle attendue par supabase-js : s'en ecarter fait resoudre
 * les payloads en `never` et casse toutes les ecritures au typage.
 */
export type EmailReportsDatabase = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      email_reports: {
        Row: EmailReport;
        Insert: {
          key: string;
          report_type: EmailReportType;
          period_type: EmailReportPeriodType;
          name: string;
          subject_template: string;
          description?: string | null;
          options?: { top_n?: number } | null;
          is_active?: boolean;
          last_period_sent?: string | null;
          last_run_at?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          subject_template?: string;
          options?: { top_n?: number } | null;
          is_active?: boolean;
          last_period_sent?: string | null;
          last_run_at?: string | null;
        };
        Relationships: [];
      };
      email_report_recipients: {
        Row: EmailReportRecipient;
        Insert: {
          report_id: string;
          email: string;
          label?: string | null;
          is_active?: boolean;
        };
        Update: {
          email?: string;
          label?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      // Journal ecrit exclusivement par l'Edge Function en service_role : aucune
      // policy d'ecriture `authenticated` n'existe, l'admin ne fait que lire.
      email_report_runs: {
        Row: EmailReportRun;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
