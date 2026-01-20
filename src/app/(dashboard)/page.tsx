"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Ticket,
  TrendingUp,
  Calendar,
  AlertCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { getDashboardStats } from "@/lib/services/analyticsService";
import { getPeriodConfigs } from "@/lib/services/rewardService";
import { formatDate, getPeriodIdentifier } from "@/lib/utils";
import type { PeriodRewardConfig } from "@/types/database";

interface DashboardStats {
  totalActiveCoupons: number;
  couponsUsedThisWeek: number;
  distributionsThisMonth: number;
  pendingDistributions: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingPeriods, setPendingPeriods] = useState<PeriodRewardConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardStats, periods] = await Promise.all([
          getDashboardStats(),
          getPeriodConfigs(),
        ]);

        setStats(dashboardStats);
        setPendingPeriods(periods?.filter((p) => p.status === "pending") || []);
      } catch (error) {
        console.error("Erreur lors du chargement des donnees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentWeek = getPeriodIdentifier("weekly");
  const currentMonth = getPeriodIdentifier("monthly");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble du systeme de coupons
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coupons actifs</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActiveCoupons || 0}</div>
            <p className="text-xs text-muted-foreground">
              Non utilises et non expires
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilises cette semaine
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.couponsUsedThisWeek || 0}</div>
            <p className="text-xs text-muted-foreground">
              Semaine {currentWeek}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Distributions ce mois
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.distributionsThisMonth || 0}
            </div>
            <p className="text-xs text-muted-foreground">{currentMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Distributions en attente
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingDistributions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Periodes a distribuer
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
            <CardDescription>
              Actions frequentes pour la gestion des coupons
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/coupons/create">
              <Button variant="outline" className="w-full justify-between">
                Creer un coupon manuel
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/rewards/distribute">
              <Button variant="outline" className="w-full justify-between">
                Distribuer des recompenses
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/templates/create">
              <Button variant="outline" className="w-full justify-between">
                Creer un template
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="outline" className="w-full justify-between">
                Voir les statistiques
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Pending Distributions */}
        <Card>
          <CardHeader>
            <CardTitle>Distributions en attente</CardTitle>
            <CardDescription>
              Periodes configurees mais non encore distribuees
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingPeriods.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune distribution en attente
              </p>
            ) : (
              <div className="space-y-3">
                {pendingPeriods.slice(0, 5).map((period) => (
                  <div
                    key={period.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{period.period_identifier}</p>
                      <p className="text-sm text-muted-foreground">
                        {period.period_type === "weekly" && "Hebdomadaire"}
                        {period.period_type === "monthly" && "Mensuel"}
                        {period.period_type === "yearly" && "Annuel"}
                      </p>
                    </div>
                    <Badge variant="warning">En attente</Badge>
                  </div>
                ))}
                {pendingPeriods.length > 5 && (
                  <Link href="/rewards/periods">
                    <Button variant="link" className="w-full">
                      Voir toutes les periodes ({pendingPeriods.length})
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
