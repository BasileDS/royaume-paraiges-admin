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

// Liens de redirection redirects.auxparaiges.fr (migration 063)
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
export type EmailReportType = "activity_summary" | "leaderboard" | "new_quests";

/** Periodicite de l'envoi : chaque lundi, ou le 1er de chaque mois. */
export type EmailReportPeriodType = "weekly" | "monthly";

/**
 * Portee : de quelle periode parle le rapport (migration 079). A ne pas
 * confondre avec `EmailReportPeriodType`, qui n'en donne que le rythme.
 * `previous` = bilan de la periode ecoulee ; `current` = annonce de la periode
 * qui s'ouvre (defis de la semaine / du mois).
 */
export type EmailReportPeriodScope = "previous" | "current";

/** Issue d'une tentative d'envoi. */
export type EmailReportRunStatus = "success" | "partial" | "error" | "skipped";

/** Origine d'une tentative d'envoi. */
export type EmailReportTriggerSource = "cron" | "manual" | "test";

export type EmailReport = {
  id: string;
  key: string;
  report_type: EmailReportType;
  period_type: EmailReportPeriodType;
  period_scope: EmailReportPeriodScope;
  name: string;
  description: string | null;
  subject_template: string;
  options: { top_n?: number; video?: boolean } | null;
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

/**
 * Statut du rendu video d'un rapport pour une periode (migration 082).
 * `expired` = le MP4 a ete purge apres 7 jours, la ligne survit au fichier.
 */
export type ReportVideoStatus = "queued" | "rendering" | "ready" | "error" | "expired";

/**
 * Etat du rendu video, une ligne par rapport et par periode. Ne contient
 * aucune donnee de classement : celles-ci restent calculees a la volee.
 * Ecrite exclusivement en service_role par le renderer, l'admin ne fait que lire.
 */
export type ReportVideoRender = {
  report_id: string;
  period_identifier: string;
  status: ReportVideoStatus;
  attempts: number;
  last_error: string | null;
  updated_at: string;
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
          period_scope?: EmailReportPeriodScope;
          description?: string | null;
          options?: { top_n?: number; video?: boolean } | null;
          is_active?: boolean;
          last_period_sent?: string | null;
          last_run_at?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          subject_template?: string;
          options?: { top_n?: number; video?: boolean } | null;
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
      // Meme regime que email_report_runs : alimentee par le renderer en
      // service_role, seule la lecture est ouverte a `authenticated`.
      report_video_renders: {
        Row: ReportVideoRender;
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

// ============================================================================
// Journal des distributions de classement (migration 083, alertes 088)
// ============================================================================

export type RewardRunStatus = "success" | "partial" | "error" | "skipped";
export type RewardRunOrigin = "cron" | "manual";
export type RewardRunPeriodType = "weekly" | "monthly" | "yearly";

/** Une erreur individuelle rattrapee par le bloc EXCEPTION de la boucle. */
export type RewardRunError = {
  customer_id?: string;
  rank?: number;
  error?: string;
};

export type RewardDistributionRun = {
  id: number;
  period_type: string;
  period_identifier: string | null;
  status: RewardRunStatus;
  reason: string | null;
  origin: RewardRunOrigin;
  rewards_distributed: number;
  leaderboard_size: number | null;
  errors: RewardRunError[];
  duration_ms: number | null;
  period_start: string | null;
  period_end: string | null;
  forced: boolean;
  triggered_by: string | null;
  alerted_at: string | null;
  created_at: string;
};

/**
 * Meme regime que `email_report_runs` : la table est alimentee exclusivement par
 * la RPC `distribute_period_rewards_v2` en SECURITY DEFINER, aucune policy
 * d'ecriture `authenticated` n'existe. L'admin ne fait que lire, d'ou les
 * Insert / Update en `never`.
 */
export type RewardRunsDatabase = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      reward_distribution_runs: {
        Row: RewardDistributionRun;
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

// ============================================================================
// Couche Menus (cartes des etablissements) - migrations 094 a 101
// ============================================================================

/**
 * Famille de produit. Table de reference et non enum : ajouter une famille ne
 * demande pas de migration. A ne pas confondre avec la categorie, qui est le
 * regroupement editorial d'un etablissement.
 */
export type MenuItemType = {
  id: number;
  slug: string;
  label: string;
  /** Pont facultatif vers l'enum du scan. NULL quand aucune ne s'applique. */
  consumption_type: ConsumptionType | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Catalogue partage des produits hors bieres (les softs a date). */
export type MenuCatalogProduct = {
  id: number;
  item_type_id: number;
  title: string;
  description: string | null;
  featured_image: string | null;
  allergens: string | null;
  precision: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Regroupement editorial, deux niveaux au plus (trigger `trg_menu_categories_depth`). */
export type MenuCategory = {
  id: number;
  establishment_id: number;
  parent_id: number | null;
  title: string;
  /** Bloc de texte de section. Une categorie sans item mais avec description est un bloc de texte. */
  description: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Un produit sur la carte d'un etablissement. Le descriptif vient d'exactement
 * une des trois sources : `beer_id`, `catalog_product_id`, ou les colonnes
 * locales (contrainte `ck_menu_items_one_source`).
 */
export type MenuItem = {
  id: number;
  establishment_id: number;
  /** NULL = disponible mais hors carte affichee. */
  category_id: number | null;
  item_type_id: number;
  beer_id: number | null;
  catalog_product_id: number | null;
  title: string | null;
  description: string | null;
  featured_image: string | null;
  allergens: string | null;
  precision: string | null;
  position: number;
  /** FALSE = a la carte mais en rupture. Absence de ligne = pas a la carte. */
  is_active: boolean;
  is_featured: boolean;
  added_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Format tarife. Ne PAS ecrire « happy hour » dans `label` : c'est le role de
 * `is_happy_hour`. A distinguer de l'option, qui est un choix sans ligne propre.
 */
export type MenuItemVariant = {
  id: number;
  menu_item_id: number;
  /** NULL = produit simple. Sinon le format seul : « 25 cl », « Bouteille 75 cl ». */
  label: string | null;
  /** NULL = prix non communique, affiche « — ». Distinct de 0, qui est la gratuite. */
  price: number | null;
  is_happy_hour: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export type MenuOptionGroup = {
  id: number;
  establishment_id: number;
  title: string;
  min_select: number;
  /** NULL = pas de plafond. */
  max_select: number | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type MenuOption = {
  id: number;
  option_group_id: number;
  label: string;
  /** NULL ou 0 = compris dans le prix de l'item. */
  extra_price: number | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type MenuFormula = {
  id: number;
  establishment_id: number;
  title: string;
  description: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MenuFormulaTier = {
  id: number;
  formula_id: number;
  label: string;
  price: number | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type MenuEvent = {
  id: number;
  title: string;
  content: string | null;
  featured_image: string | null;
  external_url: string | null;
  is_active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

/** Item enrichi de sa source resolue et de ses variantes, pour l'affichage. */
export type MenuItemWithDetails = MenuItem & {
  /** Titre effectif : celui de la biere, du produit de catalogue, ou local. */
  resolved_title: string;
  /** D'ou vient le descriptif. */
  source: "beer" | "catalog" | "private";
  type_slug: string;
  type_label: string;
  variants: MenuItemVariant[];
};

/** Ligne de la liste /menus : un etablissement et l'etat de sa carte. */
export type EstablishmentMenuSummary = {
  establishment_id: number;
  establishment_title: string;
  slug: string;
  city: string | null;
  categories_count: number;
  /** Items places sur la carte (category_id non NULL). */
  items_count: number;
  /** Items disponibles mais hors carte affichee. */
  unplaced_count: number;
  inactive_count: number;
  beers_count: number;
  happy_hour_start: string | null;
  happy_hour_end: string | null;
}

/**
 * Schema local des tables `menu_*`, absentes de `database.generated.ts` (le CLI
 * de generation n'a pas acces au projet). Meme forme que EmailReportsDatabase :
 * s'en ecarter fait resoudre les Insert/Update en `never`.
 *
 * `menu_item_types` est en lecture seule cote admin : les 14 familles sont
 * seedees par la migration 095, en ajouter une releve d'une decision produit et
 * passe par une migration.
 */
export type MenusDatabase = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      menu_item_types: {
        Row: MenuItemType;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      menu_catalog_products: {
        Row: MenuCatalogProduct;
        Insert: {
          item_type_id: number;
          title: string;
          description?: string | null;
          featured_image?: string | null;
          allergens?: string | null;
          precision?: string | null;
          is_active?: boolean;
        };
        Update: {
          item_type_id?: number;
          title?: string;
          description?: string | null;
          featured_image?: string | null;
          allergens?: string | null;
          precision?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      menu_categories: {
        Row: MenuCategory;
        Insert: {
          establishment_id: number;
          parent_id?: number | null;
          title: string;
          description?: string | null;
          position?: number;
          is_active?: boolean;
        };
        Update: {
          parent_id?: number | null;
          title?: string;
          description?: string | null;
          position?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      menu_items: {
        Row: MenuItem;
        Insert: {
          establishment_id: number;
          item_type_id: number;
          category_id?: number | null;
          beer_id?: number | null;
          catalog_product_id?: number | null;
          title?: string | null;
          description?: string | null;
          featured_image?: string | null;
          allergens?: string | null;
          precision?: string | null;
          position?: number;
          is_active?: boolean;
          is_featured?: boolean;
        };
        Update: {
          category_id?: number | null;
          item_type_id?: number;
          title?: string | null;
          description?: string | null;
          featured_image?: string | null;
          allergens?: string | null;
          precision?: string | null;
          position?: number;
          is_active?: boolean;
          is_featured?: boolean;
        };
        Relationships: [];
      };
      menu_item_variants: {
        Row: MenuItemVariant;
        Insert: {
          menu_item_id: number;
          label?: string | null;
          price?: number | null;
          is_happy_hour?: boolean;
          position?: number;
        };
        Update: {
          label?: string | null;
          price?: number | null;
          is_happy_hour?: boolean;
          position?: number;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
