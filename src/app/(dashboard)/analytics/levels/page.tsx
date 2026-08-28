"use client";

import { useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Swords, TrendingUp, UserMinus, Users } from "lucide-react";

import { analyticsKeys } from "@/lib/queries/keys";
import {
  getLevelAverageTimeline,
  getLevelStats,
  getLevelSummary,
} from "@/lib/services/analyticsService";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LevelDistributionChart } from "./_components/level-distribution-chart";
import { LevelProgressionChart } from "./_components/level-progression-chart";
import {
  buildLevelRows,
  LevelStatsTable,
  type LevelRow,
} from "./_components/level-stats-table";
import { LevelDetail } from "./_components/level-detail";

const iconClass = "h-4 w-4 text-muted-foreground";

/** Première saison du modèle de niveaux (grille 25 paliers, avril 2026). */
const FIRST_SEASON = 2026;

export default function LevelAnalyticsPage() {
  const currentYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= FIRST_SEASON; y--) list.push(y);
    return list;
  }, [currentYear]);

  const summaryQuery = useQuery({
    queryKey: analyticsKeys.levelSummary(year),
    queryFn: () => getLevelSummary(year),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: analyticsKeys.levelStats(year),
    queryFn: () => getLevelStats(year),
    placeholderData: keepPreviousData,
  });

  const timelineQuery = useQuery({
    queryKey: analyticsKeys.levelTimeline(year),
    queryFn: () => getLevelAverageTimeline(year),
    placeholderData: keepPreviousData,
  });

  const summary = summaryQuery.data ?? null;
  const rows: LevelRow[] = useMemo(
    () => buildLevelRows(statsQuery.data ?? []),
    [statsQuery.data]
  );
  // Sur une saison close, la projection est égale à l'effectif : inutile de l'afficher.
  const showProjection = (summary?.days_remaining ?? 0) > 0;

  const selectedRow = useMemo(
    () => rows.find((r) => r.level === selectedLevel) ?? null,
    [rows, selectedLevel]
  );

  const handleSelect = (level: number) => {
    setSelectedLevel((prev) => (prev === level ? null : level));
    // Laisse la fiche se monter avant de la faire défiler dans le viewport.
    requestAnimationFrame(() =>
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  // Le plafond réellement atteignable : si la projection reste loin du dernier
  // palier, la grille est calibrée hors de portée pour la saison.
  const unreachableLevels =
    summary && showProjection
      ? summary.top_level_available - summary.projected_max_level
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Niveaux"
        description="Répartition des joueurs dans la grille de niveaux et vitesse de progression sur la saison."
        actions={
          <Select
            value={String(year)}
            onValueChange={(v) => {
              setYear(Number(v));
              setSelectedLevel(null);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  Saison {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Joueurs actifs"
          icon={<Users className={iconClass} />}
          value={(summary?.players_with_xp ?? 0).toLocaleString("fr-FR")}
          subtitle={`sur ${(summary?.clients_total ?? 0).toLocaleString(
            "fr-FR"
          )} comptes clients`}
          info="Clients réels ayant gagné au moins 1 XP sur la saison. Les comptes de test, du personnel et supprimés sont exclus."
        />
        <StatCard
          title="Niveau moyen"
          icon={<Swords className={iconClass} />}
          value={(summary?.avg_level ?? 0).toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          subtitle={`XP médian ${(summary?.median_xp ?? 0).toLocaleString(
            "fr-FR"
          )} · moyen ${(summary?.avg_xp ?? 0).toLocaleString("fr-FR")}`}
        />
        <StatCard
          title="Niveau le plus haut"
          icon={<TrendingUp className={iconClass} />}
          value={`N${summary?.max_level ?? 1}`}
          subtitle={
            showProjection
              ? `plus haut projeté N${
                  summary?.projected_max_level ?? 1
                } au 31/12 · grille jusqu'à N${summary?.top_level_available ?? 1}`
              : `grille jusqu'à N${summary?.top_level_available ?? 1}`
          }
          info="Niveau du meilleur joueur aujourd'hui. La projection est le plus haut niveau qu'un joueur atteindrait au 31/12 à son rythme actuel — pas nécessairement celui qui mène aujourd'hui."
        />
        <StatCard
          title="Comptes sans XP"
          icon={<UserMinus className={iconClass} />}
          value={(summary?.players_without_xp ?? 0).toLocaleString("fr-FR")}
          subtitle={`${(summary?.inactive_30d ?? 0).toLocaleString(
            "fr-FR"
          )} joueurs inactifs depuis 30 j`}
          info="Comptes clients créés mais n'ayant jamais gagné d'XP sur la saison. Ils ne figurent dans aucun niveau."
        />
      </div>

      {unreachableLevels > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <CardTitle className="text-base">
                {unreachableLevels} niveau{unreachableLevels > 1 ? "x" : ""} hors
                de portée cette saison
              </CardTitle>
              <CardDescription>
                Au rythme actuel, aucun joueur ne dépassera le niveau{" "}
                {summary?.projected_max_level} au 31 décembre, alors que la
                grille monte jusqu&apos;à N{summary?.top_level_available}. Les
                paliers N{(summary?.projected_max_level ?? 0) + 1} à N
                {summary?.top_level_available} ne seront atteints par personne
                cette saison : soit la grille est trop étirée pour un cycle
                d&apos;un an, soit le barème d&apos;XP doit être revu. La grille
                se modifie depuis{" "}
                <span className="font-medium">Niveaux &amp; lore</span>.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <LevelDistributionChart
          rows={rows}
          showProjection={showProjection}
          loading={statsQuery.isLoading}
        />
        <LevelProgressionChart
          points={timelineQuery.data ?? []}
          loading={timelineQuery.isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Détail par niveau</CardTitle>
          <CardDescription>
            Clique sur une ligne pour ouvrir la fiche du niveau. Les durées de
            palier sont reconstituées depuis le cumul d&apos;XP : la table
            n&apos;enregistre pas les passages de niveau.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LevelStatsTable
            rows={rows}
            loading={statsQuery.isLoading}
            showProjection={showProjection}
            selectedLevel={selectedLevel}
            onSelect={handleSelect}
          />
        </CardContent>
      </Card>

      <div ref={detailRef}>
        {selectedRow && <LevelDetail row={selectedRow} year={year} />}
      </div>
    </div>
  );
}
