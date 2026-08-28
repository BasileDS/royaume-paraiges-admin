"use client";

import { Info, Swords } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatCurrency } from "@/lib/utils";
import type { LevelStatsRow } from "@/lib/services/analyticsService";

/** Ligne enrichie des ratios calculés à partir du niveau précédent. */
export interface LevelRow extends LevelStatsRow {
  /** Part de l'effectif total des joueurs avec XP, en %. */
  share_pct: number;
  /** reached(N) / reached(N−1) en % — null au niveau 1 et si le précédent est vide. */
  pass_rate_pct: number | null;
}

/** Enrichit les lignes RPC des ratios d'entonnoir. */
export function buildLevelRows(stats: LevelStatsRow[]): LevelRow[] {
  const total = stats[0]?.reached_count ?? 0;
  return stats.map((row, i) => {
    const prevReached = i > 0 ? stats[i - 1]?.reached_count ?? null : null;
    return {
      ...row,
      share_pct: total > 0 ? (row.users_count / total) * 100 : 0,
      pass_rate_pct:
        prevReached && prevReached > 0
          ? (row.reached_count / prevReached) * 100
          : null,
    };
  });
}

const dash = <span className="text-muted-foreground">—</span>;

function HeaderWithInfo({
  label,
  info,
}: {
  label: string;
  info: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 hover:text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[320px] text-xs">
          {info}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

const formatDays = (days: number) =>
  days < 1
    ? "< 1 j"
    : `${days.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} j`;

const columns: DataTableColumn<LevelRow>[] = [
  {
    key: "level",
    header: "Niveau",
    sortable: true,
    sortValue: (r) => r.level,
    cell: (r) => (
      <div className="flex items-baseline gap-2">
        <span className="w-8 shrink-0 tabular-nums text-muted-foreground">
          N{r.level}
        </span>
        <span className="font-medium">{r.level_name}</span>
      </div>
    ),
  },
  {
    key: "xp_required",
    header: "XP requis",
    sortable: true,
    sortValue: (r) => r.xp_required,
    cell: (r) => (
      <span className="tabular-nums">
        {r.xp_required.toLocaleString("fr-FR")}
      </span>
    ),
  },
  {
    key: "users_count",
    header: "Joueurs",
    sortable: true,
    sortValue: (r) => r.users_count,
    cell: (r) =>
      r.users_count === 0 ? (
        dash
      ) : (
        <span className="inline-flex items-baseline gap-1.5 tabular-nums">
          <span className="font-medium">
            {r.users_count.toLocaleString("fr-FR")}
          </span>
          <span className="text-xs text-muted-foreground">
            {r.share_pct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
          </span>
        </span>
      ),
  },
  {
    key: "reached_count",
    header: (
      <HeaderWithInfo
        label="Ont atteint"
        info="Joueurs dont le niveau courant est supérieur ou égal à celui-ci. Le niveau 1 vaut donc l'effectif total."
      />
    ),
    sortable: true,
    sortValue: (r) => r.reached_count,
    cell: (r) => (
      <span className="tabular-nums">
        {r.reached_count.toLocaleString("fr-FR")}
      </span>
    ),
  },
  {
    key: "pass_rate_pct",
    header: (
      <HeaderWithInfo
        label="Taux de passage"
        info="Part des joueurs du niveau précédent qui ont franchi celui-ci. Une chute marquée signale un mur dans la grille."
      />
    ),
    sortable: true,
    sortValue: (r) => r.pass_rate_pct,
    cell: (r) =>
      r.pass_rate_pct === null ? (
        dash
      ) : (
        <span
          className={cn(
            "tabular-nums",
            r.pass_rate_pct < 30 && "font-medium text-amber-600"
          )}
        >
          {r.pass_rate_pct.toLocaleString("fr-FR", {
            maximumFractionDigits: 0,
          })}{" "}
          %
        </span>
      ),
  },
  {
    key: "median_days_to_level",
    header: (
      <HeaderWithInfo
        label="Durée du palier"
        info="Temps médian mis pour franchir ce niveau depuis le précédent (depuis l'inscription pour le niveau 2). Reconstitué à partir du cumul d'XP : seuls les joueurs ayant réellement franchi le palier comptent, ceux qui y stagnent encore ne sont pas comptabilisés."
      />
    ),
    sortable: true,
    sortValue: (r) => r.median_days_to_level,
    cell: (r) =>
      r.median_days_to_level === null ? (
        dash
      ) : (
        <span className="inline-flex items-baseline gap-1.5 tabular-nums">
          <span className="font-medium">
            {formatDays(r.median_days_to_level)}
          </span>
          <span className="text-xs text-muted-foreground">
            n = {r.transitions_count}
          </span>
        </span>
      ),
  },
  {
    key: "median_euro_to_level_cents",
    header: (
      <HeaderWithInfo
        label="Coût du palier"
        info="Euros médians réellement dépensés entre le franchissement du niveau précédent et celui-ci. Seuls les paiements carte et espèces comptent : ce sont les seuls qui génèrent de l'XP. Le montant théorique en dessous est l'XP à combler converti au taux courant — un écart en dessous signifie que les quêtes et bonus ont fait une partie du chemin."
      />
    ),
    sortable: true,
    sortValue: (r) => r.median_euro_to_level_cents,
    cell: (r) =>
      r.median_euro_to_level_cents === null ? (
        r.theoretical_euro_cents === null ? (
          dash
        ) : (
          <span className="text-xs text-muted-foreground tabular-nums">
            théorique {formatCurrency(r.theoretical_euro_cents)}
          </span>
        )
      ) : (
        <div className="tabular-nums leading-tight">
          <div className="font-medium">
            {formatCurrency(r.median_euro_to_level_cents)}
          </div>
          {r.theoretical_euro_cents !== null && (
            <div className="text-xs text-muted-foreground">
              théorique {formatCurrency(r.theoretical_euro_cents)}
            </div>
          )}
        </div>
      ),
  },
  {
    key: "median_pdb_to_level_cents",
    header: (
      <HeaderWithInfo
        label="PdB du palier"
        info="Paraiges de Bronze médians gagnés pendant le palier, toutes sources confondues (achats, quêtes, bonus). C'est ce que le franchissement a coûté en dette PdB."
      />
    ),
    sortable: true,
    sortValue: (r) => r.median_pdb_to_level_cents,
    cell: (r) =>
      r.median_pdb_to_level_cents === null ? (
        dash
      ) : (
        <span className="inline-flex items-baseline gap-1.5 tabular-nums">
          <span>{r.median_pdb_to_level_cents.toLocaleString("fr-FR")}</span>
          {r.median_receipts_to_level !== null && (
            <span className="text-xs text-muted-foreground">
              {r.median_receipts_to_level.toLocaleString("fr-FR", {
                maximumFractionDigits: 1,
              })}{" "}
              tickets
            </span>
          )}
        </span>
      ),
  },
  {
    key: "avg_progress_pct",
    header: (
      <HeaderWithInfo
        label="Vers le suivant"
        info="Progression moyenne des joueurs de ce niveau dans leur palier, et nombre d'entre eux à 80 % ou plus du niveau suivant."
      />
    ),
    sortable: true,
    sortValue: (r) => r.avg_progress_pct,
    cell: (r) =>
      r.avg_progress_pct === null ? (
        dash
      ) : (
        <span className="inline-flex items-baseline gap-1.5 tabular-nums">
          <span>{r.avg_progress_pct.toLocaleString("fr-FR")} %</span>
          {r.near_next_count > 0 && (
            <span className="text-xs text-emerald-600">
              {r.near_next_count} proche{r.near_next_count > 1 ? "s" : ""}
            </span>
          )}
        </span>
      ),
  },
  {
    key: "inactive_30d_count",
    header: (
      <HeaderWithInfo
        label="Inactifs 30 j"
        info="Joueurs de ce niveau sans aucun gain d'XP depuis plus de 30 jours."
      />
    ),
    sortable: true,
    sortValue: (r) => r.inactive_30d_count,
    cell: (r) =>
      r.users_count === 0 ? (
        dash
      ) : (
        <span className="inline-flex items-baseline gap-1.5 tabular-nums">
          <span
            className={cn(
              r.inactive_30d_count / r.users_count >= 0.4 &&
                "font-medium text-amber-600"
            )}
          >
            {r.inactive_30d_count}
          </span>
          <span className="text-xs text-muted-foreground">
            {Math.round((r.inactive_30d_count / r.users_count) * 100)} %
          </span>
        </span>
      ),
  },
];

const projectionColumn: DataTableColumn<LevelRow> = {
  key: "projected_users_count",
  header: (
    <HeaderWithInfo
      label="Projection 31/12"
      info="Effectif attendu à ce niveau en fin de saison si chaque joueur conserve son rythme d'XP observé. Les comptes de moins de 14 jours sont extrapolés sur une base de 14 jours pour éviter les rythmes aberrants."
    />
  ),
  sortable: true,
  sortValue: (r) => r.projected_users_count,
  cell: (r) =>
    r.projected_users_count === 0 ? (
      dash
    ) : (
      <span className="tabular-nums text-amber-600">
        {r.projected_users_count.toLocaleString("fr-FR")}
      </span>
    ),
};

export function LevelStatsTable({
  rows,
  loading,
  showProjection,
  selectedLevel,
  onSelect,
}: {
  rows: LevelRow[];
  loading?: boolean;
  showProjection: boolean;
  selectedLevel: number | null;
  onSelect: (level: number) => void;
}) {
  return (
    <DataTable
      columns={showProjection ? [...columns, projectionColumn] : columns}
      data={rows}
      rowKey={(r) => r.level}
      loading={loading}
      skeletonRows={10}
      containerClassName="overflow-x-auto"
      onRowClick={(r) => onSelect(r.level)}
      rowClassName={(r) =>
        cn(
          r.users_count === 0 && r.reached_count === 0 && "text-muted-foreground",
          r.level === selectedLevel && "bg-primary/5"
        )
      }
      emptyState={
        <EmptyState
          icon={Swords}
          title="Aucun niveau configuré"
          description="La grille level_thresholds est vide."
        />
      }
    />
  );
}
