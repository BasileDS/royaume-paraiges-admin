"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatCurrency } from "@/lib/utils";
import type { LevelMemberRow } from "@/lib/services/analyticsService";

const PAGE_SIZE = 25;

const dash = <span className="text-muted-foreground">—</span>;

const formatDays = (days: number) =>
  days < 1
    ? "< 1 j"
    : `${days.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} j`;

const columns: DataTableColumn<LevelMemberRow>[] = [
  {
    key: "pseudo",
    header: "Joueur",
    sortable: true,
    sortValue: (r) => r.pseudo,
    cell: (r) => (
      // stopPropagation inutile ici (pas de onRowClick), mais le lien doit
      // rester cliquable dans une cellule qui pourrait le devenir.
      <Link
        href={`/users/${r.customer_id}`}
        className="font-medium hover:underline"
      >
        {r.pseudo}
      </Link>
    ),
  },
  {
    key: "season_xp",
    header: "XP saison",
    sortable: true,
    sortValue: (r) => r.season_xp,
    cell: (r) => (
      <span className="tabular-nums">
        {r.season_xp.toLocaleString("fr-FR")}
      </span>
    ),
  },
  {
    key: "progress_pct",
    header: "Vers le suivant",
    sortable: true,
    sortValue: (r) => r.progress_pct,
    cell: (r) =>
      r.progress_pct === null ? (
        dash
      ) : (
        <span className="inline-flex items-baseline gap-1.5 tabular-nums">
          <span
            className={cn(
              r.progress_pct >= 80 && "font-medium text-emerald-600"
            )}
          >
            {r.progress_pct.toLocaleString("fr-FR")} %
          </span>
          {r.xp_to_next !== null && (
            <span className="text-xs text-muted-foreground">
              {r.xp_to_next.toLocaleString("fr-FR")} XP restants
            </span>
          )}
        </span>
      ),
  },
  {
    key: "days_at_level",
    header: "Au palier depuis",
    sortable: true,
    sortValue: (r) => r.days_at_level,
    cell: (r) =>
      r.days_at_level === null ? dash : <span className="tabular-nums">{formatDays(r.days_at_level)}</span>,
  },
  {
    key: "days_since_last_xp",
    header: "Dernier XP",
    sortable: true,
    sortValue: (r) => r.days_since_last_xp,
    cell: (r) =>
      r.days_since_last_xp === null ? (
        dash
      ) : (
        <span
          className={cn(
            "tabular-nums",
            r.days_since_last_xp > 30 && "font-medium text-amber-600"
          )}
        >
          il y a {formatDays(r.days_since_last_xp)}
        </span>
      ),
  },
  {
    key: "receipts_count",
    header: "Tickets",
    sortable: true,
    sortValue: (r) => r.receipts_count,
    cell: (r) => (
      <span className="tabular-nums">
        {r.receipts_count.toLocaleString("fr-FR")}
      </span>
    ),
  },
  {
    key: "euro_spent_cents",
    header: "€ dépensés",
    sortable: true,
    sortValue: (r) => r.euro_spent_cents,
    cell: (r) => (
      <span className="tabular-nums">{formatCurrency(r.euro_spent_cents)}</span>
    ),
  },
  {
    key: "pdb_generated_cents",
    header: "PdB gagnés",
    sortable: true,
    sortValue: (r) => r.pdb_generated_cents,
    cell: (r) => (
      <span className="tabular-nums">
        {r.pdb_generated_cents.toLocaleString("fr-FR")}
      </span>
    ),
  },
  {
    key: "projected_level",
    header: "Projeté 31/12",
    sortable: true,
    sortValue: (r) => r.projected_level,
    cell: (r) => (
      <span className="tabular-nums text-amber-600">N{r.projected_level}</span>
    ),
  },
];

/**
 * Joueurs actuellement au niveau sélectionné. Tickets, euros et PdB portent sur
 * toute la saison du joueur, pas seulement sur le palier en cours.
 */
export function LevelMembersTable({
  rows,
  loading,
}: {
  rows: LevelMemberRow[];
  loading?: boolean;
}) {
  // La pagination repart à 1 au changement de niveau via la `key` posée par
  // le parent (remontage) : pas de setState dans un effet.
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [rows, page]
  );

  return (
    <DataTable
      columns={columns}
      data={pageRows}
      rowKey={(r) => r.customer_id}
      loading={loading}
      skeletonRows={6}
      containerClassName="overflow-x-auto"
      pagination={
        rows.length > PAGE_SIZE
          ? { page, totalPages, onPageChange: setPage }
          : undefined
      }
      emptyState={
        <EmptyState
          icon={Users}
          title="Aucun joueur à ce niveau"
          description="Personne n'occupe ce palier sur la saison sélectionnée."
        />
      }
    />
  );
}
