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
  Users,
  Receipt,
  Building2,
  Beer,
} from "lucide-react";
import { getDashboardStats } from "@/lib/services/analyticsService";
import { getPeriodConfigs } from "@/lib/services/rewardService";
import { getUserStats } from "@/lib/services/userService";
import { getReceiptStats } from "@/lib/services/receiptService";
import { getDirectusStats } from "@/lib/services/directusService";
import { formatCurrency, formatDate, getPeriodIdentifier } from "@/lib/utils";
import type { PeriodRewardConfig } from "@/types/database";

interface DashboardStats {
  totalActiveCoupons: number;
  couponsUsedThisWeek: number;
  distributionsThisMonth: number;
  pendingDistributions: number;
}

interface UserStats {
  totalUsers: number;
  totalClients: number;
  totalEmployees: number;
  totalEstablishments: number;
  totalAdmins: number;
  newUsersThisMonth: number;
}

interface ReceiptStats {
  totalReceipts: number;
  totalRevenue: number;
  averageAmount: number;
  receiptsThisMonth: number;
  revenueThisMonth: number;
}

interface DirectusStats {
  totalEstablishments: number;
  totalBeers: number;
  totalBreweries: number;
  totalStyles: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [receiptStats, setReceiptStats] = useState<ReceiptStats | null>(null);
  const [directusStats, setDirectusStats] = useState<DirectusStats | null>(null);
  const [pendingPeriods, setPendingPeriods] = useState<PeriodRewardConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardStats, periods, users, receipts, directus] = await Promise.all([
          getDashboardStats(),
          getPeriodConfigs(),
          getUserStats(),
          getReceiptStats(),
          getDirectusStats(),
        ]);

        setStats(dashboardStats);
        setPendingPeriods(periods?.filter((p) => p.status === "pending") || []);
        setUserStats(users);
        setReceiptStats(receipts);
        setDirectusStats(directus);
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
          Vue d&apos;ensemble de l&apos;administration Royaume des Paraiges
        </p>
      </div>

      {/* Main Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{userStats?.newUsersThisMonth || 0} ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d&apos;affaires</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(receiptStats?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(receiptStats?.revenueThisMonth || 0)} ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receiptStats?.totalReceipts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Panier moyen: {formatCurrency(Math.round(receiptStats?.averageAmount || 0))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coupons actifs</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActiveCoupons || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.couponsUsedThisWeek || 0} utilises cette semaine
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Directus Content Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Etablissements</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{directusStats?.totalEstablishments || 0}</div>
            <Link href="/content/establishments" className="text-xs text-primary hover:underline">
              Voir la liste
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bieres</CardTitle>
            <Beer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{directusStats?.totalBeers || 0}</div>
            <Link href="/content/beers" className="text-xs text-primary hover:underline">
              Voir le catalogue
            </Link>
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
            <CardDescription>
              Actions frequentes pour l&apos;administration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/users">
              <Button variant="outline" className="w-full justify-between">
                Voir les utilisateurs
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/receipts">
              <Button variant="outline" className="w-full justify-between">
                Voir les tickets de caisse
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
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
            <Link href="/analytics">
              <Button variant="outline" className="w-full justify-between">
                Voir les statistiques detaillees
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
