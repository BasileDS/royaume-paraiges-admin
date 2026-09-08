"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UtensilsCrossed, Beer, Clock, EyeOff } from "lucide-react";
import { getEstablishmentMenuSummaries } from "@/lib/services/menuService";
import { menuKeys } from "@/lib/queries/keys";
import type { EstablishmentMenuSummary } from "@/types/database";

/** « 17:00:00 » -> « 17h00 ». Les colonnes BDD sont des `time` sans fuseau. */
function formatTime(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(":");
  return `${h}h${m}`;
}

export default function MenusPage() {
  const router = useRouter();

  const summariesQuery = useQuery({
    queryKey: menuKeys.summaries(),
    queryFn: getEstablishmentMenuSummaries,
  });

  const rows = summariesQuery.data ?? [];

  const columns: DataTableColumn<EstablishmentMenuSummary>[] = [
    {
      key: "establishment",
      header: "Établissement",
      sortable: true,
      sortValue: (r) => r.establishment_title,
      cell: (r) => (
        <div>
          <div className="font-medium">{r.establishment_title}</div>
          <div className="text-muted-foreground text-xs">
            <span className="font-mono">/{r.slug}</span>
            {r.city ? ` · ${r.city}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "categories",
      header: "Catégories",
      sortable: true,
      sortValue: (r) => r.categories_count,
      cell: (r) =>
        r.categories_count > 0 ? (
          <span className="tabular-nums">{r.categories_count}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "items",
      header: "Produits à la carte",
      sortable: true,
      sortValue: (r) => r.items_count,
      cell: (r) =>
        r.items_count > 0 ? (
          <span className="tabular-nums font-medium">{r.items_count}</span>
        ) : (
          <span className="text-muted-foreground">Carte vide</span>
        ),
    },
    {
      key: "beers",
      header: "Bières",
      sortable: true,
      sortValue: (r) => r.beers_count,
      cell: (r) =>
        r.beers_count > 0 ? (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Beer className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
            {r.beers_count}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "signals",
      header: "À signaler",
      cell: (r) => {
        const signals: React.ReactNode[] = [];
        if (r.unplaced_count > 0) {
          signals.push(
            <Badge key="unplaced" variant="outline" className="gap-1">
              <EyeOff className="h-3 w-3" aria-hidden="true" />
              {r.unplaced_count} hors carte
            </Badge>,
          );
        }
        if (r.inactive_count > 0) {
          signals.push(
            <Badge key="inactive" variant="secondary">
              {r.inactive_count} en rupture
            </Badge>,
          );
        }
        return signals.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">{signals}</div>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "happyHour",
      header: "Happy hour",
      cell: (r) =>
        r.happy_hour_start ? (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <Clock className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
            {formatTime(r.happy_hour_start)} - {formatTime(r.happy_hour_end)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartes & menus"
        description="La carte de chaque établissement, telle que la voient les clients à table."
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.establishment_id}
        loading={summariesQuery.isLoading}
        onRowClick={(r) => router.push(`/menus/${r.establishment_id}`)}
        emptyState={
          <EmptyState
            icon={UtensilsCrossed}
            title="Aucun établissement"
            description="Les cartes se rattachent aux établissements du Royaume."
          />
        }
      />

      <p className="text-muted-foreground max-w-prose text-xs">
        Un produit <strong>hors carte</strong> reste disponible dans
        l&apos;établissement sans figurer sur la carte affichée. Pour une bière,
        c&apos;est ce qui la garde visible dans l&apos;application des Compagnons.
        Un produit <strong>en rupture</strong> est à la carte mais momentanément
        indisponible.
      </p>
    </div>
  );
}
