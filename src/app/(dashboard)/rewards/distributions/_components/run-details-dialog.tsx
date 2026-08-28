"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";
import type { RewardDistributionRun } from "@/types/database";
import {
  RUN_ORIGIN_LABELS,
  RUN_PERIOD_LABELS,
  RUN_STATUS_LABELS,
  formatDuration,
  reasonLabel,
} from "../_lib/run-labels";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export function RunDetailsDialog({
  run,
  onOpenChange,
}: {
  run: RewardDistributionRun | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!run) return null;

  return (
    <Dialog open={!!run} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {RUN_PERIOD_LABELS[run.period_type] ?? run.period_type}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
              {run.period_identifier ?? "—"}
            </code>
            <StatusBadge status={run.status} label={RUN_STATUS_LABELS[run.status]} />
          </DialogTitle>
          <DialogDescription>{reasonLabel(run)}</DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Joueurs classés">{run.leaderboard_size ?? "—"}</Field>
          <Field label="Récompensés">{run.rewards_distributed}</Field>
          <Field label="Durée">{formatDuration(run.duration_ms)}</Field>
          <Field label="Origine">{RUN_ORIGIN_LABELS[run.origin] ?? run.origin}</Field>
          <Field label="Forcée">{run.forced ? "Oui" : "Non"}</Field>
          <Field label="Exécutée le">{formatDateTime(run.created_at)}</Field>
          <Field label="Début de période">
            {run.period_start ? formatDateTime(run.period_start) : "—"}
          </Field>
          <Field label="Fin de période">
            {run.period_end ? formatDateTime(run.period_end) : "—"}
          </Field>
          <Field label="Alerte e-mail">
            {run.alerted_at ? formatDateTime(run.alerted_at) : "Non envoyée"}
          </Field>
        </dl>

        {run.errors?.length > 0 && (
          <div className="mt-2">
            <p className="mb-2 text-sm font-medium text-destructive">
              {run.errors.length} erreur{run.errors.length > 1 ? "s" : ""} individuelle
              {run.errors.length > 1 ? "s" : ""}
            </p>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
              {run.errors.map((err, i) => (
                <div key={i} className="text-xs">
                  <span className="text-muted-foreground">
                    Rang {err.rank ?? "?"} · {err.customer_id ?? "client inconnu"}
                  </span>
                  <p className="mt-0.5 font-mono text-destructive">{err.error}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
