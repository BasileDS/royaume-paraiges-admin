"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Ticket, TrendingUp } from "lucide-react";
import {
  getCouponStats,
  getTopUsers,
  type CouponStats,
} from "@/lib/services/analyticsService";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";

interface TopUser {
  customerId: string;
  name: string;
  received: number;
  used: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, usersData] = await Promise.all([
          getCouponStats(),
          getTopUsers(10),
        ]);

        setStats(statsData);
        setTopUsers(usersData);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les statistiques",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusData = stats
    ? [
        { name: "Actifs", value: stats.activeCoupons, color: "#22c55e" },
        { name: "Utilises", value: stats.usedCoupons, color: "#3b82f6" },
        { name: "Expires", value: stats.expiredCoupons, color: "#ef4444" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Statistiques et metriques du systeme de coupons
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total coupons</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCoupons || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeCoupons || 0} actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taux d&apos;utilisation
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.usageRate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.usedCoupons || 0} utilises
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur distribuee</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalValueDistributed || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats?.totalValueUsed || 0)} utilise
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d&apos;expiration</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.expirationRate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.expiredCoupons || 0} expires
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="status" className="space-y-4">
        <TabsList>
          <TabsTrigger value="status">Statut des coupons</TabsTrigger>
          <TabsTrigger value="users">Top utilisateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Repartition par statut</CardTitle>
              <CardDescription>
                Distribution des coupons selon leur statut actuel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) =>
                        `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Top utilisateurs</CardTitle>
              <CardDescription>
                Utilisateurs ayant recu le plus de coupons
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topUsers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Aucune donnee disponible
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead className="text-right">Recus</TableHead>
                      <TableHead className="text-right">Utilises</TableHead>
                      <TableHead className="text-right">Taux</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topUsers.map((user, i) => (
                      <TableRow key={user.customerId}>
                        <TableCell className="font-medium">{i + 1}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell className="text-right">{user.received}</TableCell>
                        <TableCell className="text-right">{user.used}</TableCell>
                        <TableCell className="text-right">
                          {user.received > 0
                            ? ((user.used / user.received) * 100).toFixed(1)
                            : 0}
                          %
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
