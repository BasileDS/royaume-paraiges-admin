"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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
import type { LevelTimelinePoint } from "@/lib/services/analyticsService";

const COLOR_AVG = "#0d9488";
const COLOR_MAX = "#7c3aed";

/** Numéro de semaine ISO ("S27") du lundi donné. */
function isoWeekLabel(dayISO: string): string {
  const d = new Date(`${dayISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );
  return `S${weekNum}`;
}

/**
 * Niveau moyen et niveau maximum de la communauté, semaine par semaine.
 * Le dénominateur du niveau moyen n'inclut que les joueurs ayant déjà gagné
 * de l'XP : une courbe plate signifie que les arrivées compensent la montée
 * des anciens, pas que personne ne progresse.
 */
export function LevelProgressionChart({
  points,
  loading,
}: {
  points: LevelTimelinePoint[];
  loading?: boolean;
}) {
  // Un tick de plus par mois, comme le graphique de projection XP.
  const monthTicks: string[] = [];
  let prevMonth = -1;
  for (const p of points) {
    const month = new Date(`${p.week_start}T00:00:00Z`).getUTCMonth();
    if (month !== prevMonth) {
      monthTicks.push(p.week_start);
      prevMonth = month;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Niveau moyen de la communauté
        </CardTitle>
        <CardDescription>
          Semaine par semaine, moyenne sur les joueurs ayant déjà gagné de l&apos;XP
          à cette date. Les nouveaux arrivants entrent au niveau 1 et tirent la
          moyenne vers le bas : une courbe stable traduit un flux d&apos;arrivées
          qui compense la progression des anciens.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] animate-pulse rounded bg-muted/50" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="week_start"
                ticks={monthTicks}
                tickFormatter={(v: string) =>
                  new Date(`${v}T00:00:00Z`).toLocaleDateString("fr-FR", {
                    month: "short",
                  })
                }
                className="text-xs"
              />
              <YAxis
                className="text-xs"
                width={40}
                domain={[0, "auto"]}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value: number, name: string): [string, string] => [
                  name === "avg_level"
                    ? value.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : String(value),
                  name === "avg_level" ? "Niveau moyen" : "Niveau max atteint",
                ]}
                labelFormatter={(label: string, payload) => {
                  const players = payload?.[0]?.payload?.players_count ?? 0;
                  return `${isoWeekLabel(label)} · semaine du ${new Date(
                    `${label}T00:00:00Z`
                  ).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                  })} — ${players.toLocaleString("fr-FR")} joueurs`;
                }}
              />
              <Line
                dataKey="avg_level"
                stroke={COLOR_AVG}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                dataKey="max_level"
                stroke={COLOR_MAX}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
