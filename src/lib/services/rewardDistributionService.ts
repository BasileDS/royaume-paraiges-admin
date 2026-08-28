import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type {
  RewardDistributionRun,
  RewardRunPeriodType,
  RewardRunStatus,
  RewardRunsDatabase,
} from "@/types/database";

/**
 * Lecture du journal des distributions de classement (migration 083).
 *
 * Une ligne par TENTATIVE de `distribute_period_rewards_v2`, sorties anticipees
 * comprises. C'est la seule source qui distingue une distribution reussie d'une
 * distribution qui n'a recompense personne - distinction absente jusqu'a la 083,
 * ce qui avait laisse onze distributions vides passer quatre mois inapercues.
 *
 * RLS admin-only en lecture, aucune ecriture cote client : la table est
 * alimentee exclusivement par la RPC en SECURITY DEFINER.
 */

function runsClient(): SupabaseClient<RewardRunsDatabase> {
  return createClient() as unknown as SupabaseClient<RewardRunsDatabase>;
}

export const REWARD_RUNS_PAGE_SIZE = 25;

export interface RewardRunFilters {
  periodType?: RewardRunPeriodType | "all";
  status?: RewardRunStatus | "all";
  page?: number;
}

export interface RewardRunsPage {
  rows: RewardDistributionRun[];
  total: number;
}

export async function getRewardDistributionRuns(
  filters: RewardRunFilters = {}
): Promise<RewardRunsPage> {
  const page = filters.page ?? 0;
  const from = page * REWARD_RUNS_PAGE_SIZE;

  let query = runsClient()
    .from("reward_distribution_runs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + REWARD_RUNS_PAGE_SIZE - 1);

  if (filters.periodType && filters.periodType !== "all") {
    query = query.eq("period_type", filters.periodType);
  }
  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return { rows: (data ?? []) as RewardDistributionRun[], total: count ?? 0 };
}

export interface RewardRunsSummary {
  runs: number;
  rewards: number;
  needsAttention: number;
  lastRunAt: string | null;
}

/**
 * Agregats sur 30 jours glissants. Volume negligeable (quelques dizaines de
 * lignes par mois : trois crons de periodicite differente, plus les relances
 * manuelles), donc agrege cote client plutot que via une RPC dediee.
 */
export async function getRewardDistributionSummary(): Promise<RewardRunsSummary> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data, error } = await runsClient()
    .from("reward_distribution_runs")
    .select("*")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as RewardDistributionRun[];

  return {
    runs: rows.length,
    rewards: rows.reduce((sum, r) => sum + (r.rewards_distributed ?? 0), 0),
    needsAttention: rows.filter(runNeedsAttention).length,
    lastRunAt: rows[0]?.created_at ?? null,
  };
}

/**
 * Miroir EXACT du predicat d'alerte de la migration 088
 * (`get_reward_distribution_alerts`). Toute evolution de l'un doit etre
 * repercutee sur l'autre, sinon la page et l'e-mail ne racontent pas la meme
 * histoire.
 */
export function runNeedsAttention(run: RewardDistributionRun): boolean {
  if (run.status === "error" || run.status === "partial") return true;
  return (
    run.status === "skipped" &&
    ["empty_leaderboard", "no_active_tiers", "no_matching_tier"].includes(run.reason ?? "")
  );
}
