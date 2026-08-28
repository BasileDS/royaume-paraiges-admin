import type { RewardDistributionRun } from "@/types/database";

// Le registre central de <StatusBadge> traduit `success` par « Envoyé », libellé
// des rapports e-mail. Ici le même statut veut dire « distribué » : on passe donc
// un label explicite plutôt que de polluer le registre partagé.
export const RUN_STATUS_LABELS: Record<string, string> = {
  success: "Distribué",
  partial: "Partiel",
  error: "Échec",
  skipped: "Rien distribué",
};

export const RUN_PERIOD_LABELS: Record<string, string> = {
  weekly: "Hebdomadaire",
  monthly: "Mensuelle",
  yearly: "Annuelle",
};

export const RUN_ORIGIN_LABELS: Record<string, string> = {
  cron: "Automatique",
  manual: "Manuelle",
};

// Formulations reprises de la fonction Edge `send-reward-alert` : l'e-mail
// d'alerte et cette page doivent dire la même chose.
export const RUN_REASON_LABELS: Record<string, string> = {
  empty_leaderboard:
    "Le classement de la période était vide au moment de la distribution",
  no_active_tiers:
    "Aucun palier actif pour cette périodicité : le programme est à l'arrêt côté configuration",
  no_matching_tier:
    "Des joueurs étaient classés, mais aucun palier ne couvre leur rang",
  already_distributed: "Période déjà distribuée, relance sans effet",
  individual_failures: "Certaines récompenses ont échoué individuellement",
  invalid_period_type: "Périodicité invalide passée à la RPC",
  invalid_period_identifier: "Identifiant de période invalide ou mal formé",
};

export function reasonLabel(run: RewardDistributionRun): string {
  if (!run.reason) return run.status === "success" ? "—" : "Sans détail";
  return RUN_REASON_LABELS[run.reason] ?? run.reason;
}

export function periodLabel(run: RewardDistributionRun): string {
  return run.period_identifier ?? "—";
}

export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}
