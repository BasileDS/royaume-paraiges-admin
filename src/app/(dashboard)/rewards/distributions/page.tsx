"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, ScrollText } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { rewardRunKeys } from "@/lib/queries/keys";
import {
  REWARD_RUNS_PAGE_SIZE,
  getRewardDistributionRuns,
  getRewardDistributionSummary,
  runNeedsAttention,
} from "@/lib/services/rewardDistributionService";
import { formatDateTime } from "@/lib/utils";
import type {
  RewardDistributionRun,
  RewardRunPeriodType,
  RewardRunStatus,
} from "@/types/database";
import { RunDetailsDialog } from "./_components/run-details-dialog";
import {
  RUN_ORIGIN_LABELS,
  RUN_PERIOD_LABELS,
  RUN_STATUS_LABELS,
  reasonLabel,
} from "./_lib/run-labels";

type PeriodFilter = RewardRunPeriodType | "all";
type StatusFilter = RewardRunStatus | "all";

export default function DistributionRunsPage() {
  const [periodType, setPeriodType] = useState<PeriodFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<RewardDistributionRun | null>(null);

  const summaryQuery = useQuery({
    queryKey: rewardRunKeys.summary(),
    queryFn: getRewardDistributionSummary,
  });

  const listQuery = useQuery({
    queryKey: rewardRunKeys.list(periodType, status, page),
    queryFn: () => getRewardDistributionRuns({ periodType, status, page }),
  });

  const rows = listQuery.data?.rows ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / REWARD_RUNS_PAGE_SIZE));
  const filtered = periodType !== "all" || status !== "all";

  const columns: DataTableColumn<RewardDistributionRun>[] = [
    {
      key: "period",
      header: "Période",
      sortable: true,
      sortValue: (r) => r.period_identifier ?? "",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            {r.period_identifier ?? "—"}
          </code>
          <span className="text-xs text-muted-foreground">
            {RUN_PERIOD_LABELS[r.period_type] ?? r.period_type}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortable: true,
      sortValue: (r) => r.status,
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={r.status} label={RUN_STATUS_LABELS[r.status]} />
          {r.alerted_at && (
            <Bell
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-label="Alerte e-mail envoyée"
            />
          )}
        </div>
      ),
    },
    {
      key: "reason",
      header: "Motif",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">{reasonLabel(r)}</span>
      ),
    },
    {
      key: "leaderboard",
      header: "Classés",
      sortable: true,
      sortValue: (r) => r.leaderboard_size,
      cell: (r) => r.leaderboard_size ?? "—",
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
    },
    {
      key: "rewards",
      header: "Récompensés",
      sortable: true,
      sortValue: (r) => r.rewards_distributed,
      cell: (r) => r.rewards_distributed,
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
    },
    {
      key: "origin",
      header: "Origine",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {RUN_ORIGIN_LABELS[r.origin] ?? r.origin}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Exécutée le",
      sortable: true,
      sortValue: (r) => r.created_at,
      cell: (r) => (
        <span className="whitespace-nowrap text-sm">{formatDateTime(r.created_at)}</span>
      ),
    },
  ];

  const summary = summaryQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal des distributions"
        description="Une ligne par exécution du moteur de récompenses de classement, y compris celles qui n'ont rien distribué. Les anomalies partent aussi par e-mail."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Exécutions (30 j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.runs ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary?.lastRunAt
                ? `Dernière le ${formatDateTime(summary.lastRunAt)}`
                : "Aucune exécution"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Récompenses distribuées (30 j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.rewards ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Coupons et badges confondus</p>
          </CardContent>
        </Card>
        <Card className={summary?.needsAttention ? "border-amber-300" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              {!!summary?.needsAttention && (
                <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
              )}
              À vérifier (30 j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary?.needsAttention ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Échecs, ou passages sans récompense
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Exécutions</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select
              value={periodType}
              onValueChange={(v) => {
                setPeriodType(v as PeriodFilter);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes périodicités</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuelle</SelectItem>
                <SelectItem value="yearly">Annuelle</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as StatusFilter);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="success">Distribué</SelectItem>
                <SelectItem value="partial">Partiel</SelectItem>
                <SelectItem value="error">Échec</SelectItem>
                <SelectItem value="skipped">Rien distribué</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(r) => r.id}
            loading={listQuery.isLoading}
            onRowClick={setSelected}
            rowClassName={(r) =>
              runNeedsAttention(r) ? "bg-amber-50/40 dark:bg-amber-950/20" : ""
            }
            pagination={{ page, totalPages, onPageChange: setPage }}
            emptyState={
              <EmptyState
                icon={ScrollText}
                title={
                  filtered
                    ? "Aucun résultat pour ce filtre"
                    : "Aucune exécution enregistrée"
                }
                description={
                  filtered
                    ? undefined
                    : "Le journal se remplira au prochain passage des crons de distribution."
                }
              />
            }
          />
        </CardContent>
      </Card>

      <RunDetailsDialog run={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
