"use client";

import { useCallback, useEffect, useState } from "react";
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
import { Loader2, ShoppingCart, Euro, Wallet } from "lucide-react";
import {
  getSalesCount,
  getSalesTotal,
  getDailyCashbackStats,
  getUnspentCashbackTotal,
  type DailyCashback,
} from "@/lib/services/analyticsService";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type PeriodKey =
  | "current_week"
  | "last_week"
  | "last_7_days"
  | "last_30_days"
  | "current_month"
  | "last_month";

interface PeriodDates {
  start: string;
  end: string;
  label: string;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getPeriodDates(key: PeriodKey): PeriodDates {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (key) {
    case "current_week": {
      const monday = getMonday(today);
      const nextMonday = new Date(monday);
      nextMonday.setDate(nextMonday.getDate() + 7);
      return {
        start: monday.toISOString(),
        end: nextMonday.toISOString(),
        label: "Semaine en cours",
      };
    }
    case "last_week": {
      const monday = getMonday(today);
      monday.setDate(monday.getDate() - 7);
      const nextMonday = new Date(monday);
      nextMonday.setDate(nextMonday.getDate() + 7);
      return {
        start: monday.toISOString(),
        end: nextMonday.toISOString(),
        label: "Semaine derniere",
      };
    }
    case "last_7_days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: "7 derniers jours",
      };
    }
    case "last_30_days": {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: "30 derniers jours",
      };
    }
    case "current_month": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: "Mois en cours",
      };
    }
    case "last_month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: "Mois precedent",
      };
    }
  }
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodKey>("last_7_days");
  const [salesCount, setSalesCount] = useState(0);
  const [salesTotal, setSalesTotal] = useState(0);
  const [dailyCashback, setDailyCashback] = useState<DailyCashback[]>([]);
  const [unspentCashback, setUnspentCashback] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(
    async (periodKey: PeriodKey) => {
      setLoading(true);
      try {
        const { start, end } = getPeriodDates(periodKey);

        const [count, total, daily, unspent] = await Promise.all([
          getSalesCount(start, end),
          getSalesTotal(start, end),
          getDailyCashbackStats(start, end),
          getUnspentCashbackTotal(),
        ]);

        setSalesCount(count);
        setSalesTotal(total);
        setDailyCashback(daily);
        setUnspentCashback(unspent);
      } catch {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les statistiques",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const chartData = dailyCashback.map((d) => ({
    date: formatShortDate(d.date),
    credited: d.credited / 100,
    spent: d.spent / 100,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Chiffres cles et statistiques globales
          </p>
        </div>
        <Select
          value={period}
          onValueChange={(v) => setPeriod(v as PeriodKey)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_week">Semaine en cours</SelectItem>
            <SelectItem value="last_week">Semaine derniere</SelectItem>
            <SelectItem value="last_7_days">7 derniers jours</SelectItem>
            <SelectItem value="last_30_days">30 derniers jours</SelectItem>
            <SelectItem value="current_month">Mois en cours</SelectItem>
            <SelectItem value="last_month">Mois precedent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Nombre de ventes
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{salesCount}</div>
                <p className="text-xs text-muted-foreground">
                  {getPeriodDates(period).label}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Montant total des ventes
                </CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(salesTotal)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {getPeriodDates(period).label}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Cashback non depense
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(unspentCashback)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Solde total en circulation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cashback chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cashback par jour</CardTitle>
              <CardDescription>
                Comparaison du cashback credite et depense chaque jour
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                  Aucune donnee sur cette periode
                </div>
              ) : (
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v} €`}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(2)} €`,
                          name === "credited" ? "Credite" : "Depense",
                        ]}
                      />
                      <Legend
                        formatter={(value: string) =>
                          value === "credited" ? "Credite" : "Depense"
                        }
                      />
                      <Bar
                        dataKey="credited"
                        name="credited"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="spent"
                        name="spent"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
