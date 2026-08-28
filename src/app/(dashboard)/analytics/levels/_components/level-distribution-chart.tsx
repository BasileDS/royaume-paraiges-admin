"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LevelStatsRow } from "@/lib/services/analyticsService";

const COLOR_CURRENT = "#6366f1";
const COLOR_PROJECTED = "#d97706";

/**
 * Effectif par niveau. La projection de fin de saison n'est affichée que sur
 * une saison en cours (sur une saison close, elle est égale à l'effectif).
 */
export function LevelDistributionChart({
  rows,
  showProjection,
  loading,
}: {
  rows: LevelStatsRow[];
  showProjection: boolean;
  loading?: boolean;
}) {
  // La grille est affichée en entier, jusqu'au dernier palier existant. Les
  // colonnes vides du haut ne sont pas du bruit : ce sont les niveaux que
  // personne n'atteindra sur la saison, et c'est précisément l'information.
  const data = useMemo(
    () =>
      rows.map((r) => ({
        level: r.level,
        label: `N${r.level}`,
        name: r.level_name,
        users: r.users_count,
        projected: r.projected_users_count,
      })),
    [rows]
  );

  // Dernier palier qu'un joueur atteindrait en fin de saison : au-delà, la
  // grille reste vide. Sert à teinter la zone hors de portée.
  const lastReachable = useMemo(() => {
    let last = 0;
    for (const r of rows) {
      if (r.users_count > 0 || (showProjection && r.projected_users_count > 0)) {
        last = r.level;
      }
    }
    return last;
  }, [rows, showProjection]);

  const topLevel = rows.length > 0 ? rows[rows.length - 1]!.level : 0;
  const deadLevels = topLevel - lastReachable;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Répartition par niveau</CardTitle>
        <CardDescription>
          Joueurs ayant gagné au moins 1 XP sur la saison, ventilés par niveau
          courant
          {showProjection && (
            <>
              {" "}
              — en ambre, l&apos;effectif projeté au 31 décembre si chacun garde
              son rythme
            </>
          )}
          . Les inscrits sans aucun XP ne figurent pas ici.
          {deadLevels > 0 && (
            <>
              {" "}
              La zone grisée (N{lastReachable + 1} → N{topLevel}) restera vide
              cette saison.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] animate-pulse rounded bg-muted/50" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis className="text-xs" width={40} allowDecimals={false} />
              <Tooltip
                formatter={(value: number, key: string): [string, string] => [
                  `${value.toLocaleString("fr-FR")} joueur${value > 1 ? "s" : ""}`,
                  key === "users" ? "Aujourd'hui" : "Projection 31/12",
                ]}
                labelFormatter={(_label: string, payload) =>
                  payload?.[0]?.payload
                    ? `Niveau ${payload[0].payload.level} · ${payload[0].payload.name}`
                    : ""
                }
              />
              {showProjection && <Legend />}
              {deadLevels > 0 && (
                <ReferenceArea
                  x1={`N${lastReachable + 1}`}
                  x2={`N${topLevel}`}
                  fill="currentColor"
                  className="text-muted-foreground"
                  fillOpacity={0.08}
                />
              )}
              <Bar
                dataKey="users"
                name="Aujourd'hui"
                fill={COLOR_CURRENT}
                radius={[3, 3, 0, 0]}
              />
              {showProjection && (
                <Bar
                  dataKey="projected"
                  name="Projection 31/12"
                  fill={COLOR_PROJECTED}
                  radius={[3, 3, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
