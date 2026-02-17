"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn, formatCurrency } from "@/lib/utils";
import type { DailyCashback } from "@/lib/services/analyticsService";

const SERIES = [
  { key: "creditedOrganic", label: "Organique", color: "#d97706" },
  { key: "creditedRewards", label: "Récompenses", color: "#3b82f6" },
  { key: "spent", label: "Dépensé", color: "#ef4444" },
] as const;

interface CashbackChartCardProps {
  data: DailyCashback[];
}

export function CashbackChartCard({ data }: CashbackChartCardProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const toggleSeries = (key: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Crédité vs Dépensé</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Aucune donnée sur cette période
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {SERIES.map((series) => {
                const isHidden = hiddenSeries.has(series.key);
                return (
                  <button
                    key={series.key}
                    onClick={() => toggleSeries(series.key)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm transition-colors",
                      isHidden
                        ? "text-muted-foreground opacity-50"
                        : "font-medium"
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: isHidden ? "#a1a1aa" : series.color,
                      }}
                    />
                    {series.label}
                  </button>
                );
              })}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => {
                    const [, m, day] = d.split("-");
                    return `${day}/${m}`;
                  }}
                  fontSize={12}
                />
                <YAxis
                  tickFormatter={(v: number) => formatCurrency(v)}
                  fontSize={12}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label: string) => {
                    const [y, m, d] = label.split("-");
                    return `${d}/${m}/${y}`;
                  }}
                />
                {!hiddenSeries.has("creditedOrganic") && (
                  <Area
                    type="monotone"
                    dataKey="creditedOrganic"
                    name="Organique"
                    stroke="#d97706"
                    fill="#d97706"
                    fillOpacity={0.2}
                  />
                )}
                {!hiddenSeries.has("creditedRewards") && (
                  <Area
                    type="monotone"
                    dataKey="creditedRewards"
                    name="Récompenses"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                  />
                )}
                {!hiddenSeries.has("spent") && (
                  <Area
                    type="monotone"
                    dataKey="spent"
                    name="Dépensé"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.2}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
