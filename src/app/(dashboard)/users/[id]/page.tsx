"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  Receipt,
  Ticket,
  Coins,
  Star,
  Trophy,
  User,
  Edit,
  CreditCard,
  Banknote,
  TrendingUp,
  Mail,
  Phone,
  Calendar,
  Award,
} from "lucide-react";
import { StatCard } from "@/components/stat-card";
import {
  getUserWithStats,
  updateUser,
  getUserCoupons,
  getUserReceipts,
  getUserFullStats,
  getUserActivityStats,
  getUserDailyCashback,
  getUserGains,
  type UserCoupon,
  type UserReceipt,
  type UserActivityStats,
  type UserDailyCashback,
  type UserGain,
} from "@/lib/services/userService";
import { PeriodSelector, getPresetDates, type PeriodDates } from "@/components/period-selector";
import { ShoppingCart, Wallet, Zap, PiggyBank, ArrowDownCircle, BarChart3, Gift } from "lucide-react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { getEstablishments, type Establishment } from "@/lib/services/contentService";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatPercentage, formatDate, formatDateTime } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const paymentMethodLabels: Record<string, string> = {
  card: "Carte",
  cash: "Espèces",
  cashback: "Cashback",
  coupon: "Coupon",
};

const paymentMethodIcons: Record<string, React.ReactNode> = {
  card: <CreditCard className="h-3 w-3" />,
  cash: <Banknote className="h-3 w-3" />,
  cashback: <TrendingUp className="h-3 w-3" />,
  coupon: <Ticket className="h-3 w-3" />,
};

const consumptionTypeLabels: Record<string, string> = {
  cocktail: "Cocktail",
  biere: "Bière",
  alcool: "Alcool",
  soft: "Soft",
  boisson_chaude: "Boisson chaude",
  restauration: "Restauration",
};

const sourceTypeLabels: Record<string, string> = {
  receipt: "Ticket",
  bonus_cashback_manual: "Bonus manuel",
  bonus_cashback_leaderboard: "Classement",
  bonus_cashback_quest: "Quête",
  bonus_cashback_trigger: "Trigger",
  bonus_cashback_migration: "Migration",
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [activeTab, setActiveTab] = useState("activity");

  // User data
  const [user, setUser] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    birthdate: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: UserRole;
    xpCoefficient: number;
    cashbackCoefficient: number;
    attachedEstablishmentId: number | null;
    createdAt: string;
  } | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalReceipts: 0,
    totalSpent: 0,
    totalCoupons: 0,
    activeCoupons: 0,
  });

  const [fullStats, setFullStats] = useState<{
    totalXp: number;
    cashbackBalance: number;
    cashbackEarned: number;
    cashbackSpent: number;
    weeklyRank: number | null;
    monthlyRank: number | null;
    yearlyRank: number | null;
  } | null>(null);

  // Coupons
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [couponsTotal, setCouponsTotal] = useState(0);
  const [couponsPage, setCouponsPage] = useState(0);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Receipts
  const [receipts, setReceipts] = useState<UserReceipt[]>([]);
  const [receiptsTotal, setReceiptsTotal] = useState(0);
  const [receiptsPage, setReceiptsPage] = useState(0);
  const [loadingReceipts, setLoadingReceipts] = useState(false);

  // Gains
  const [gains, setGains] = useState<UserGain[]>([]);
  const [gainsTotal, setGainsTotal] = useState(0);
  const [gainsPage, setGainsPage] = useState(0);
  const [loadingGains, setLoadingGains] = useState(false);
  const [gainsSourceFilter, setGainsSourceFilter] = useState("all");

  // Activity stats
  const [activityStats, setActivityStats] = useState<UserActivityStats | null>(null);
  const [dailyCashback, setDailyCashback] = useState<UserDailyCashback[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityPeriod, setActivityPeriod] = useState<PeriodDates>(() => {
    const { start, end } = getPresetDates("last_7_days");
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  });

  // Edit form
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    role: "client" as UserRole,
    attachedEstablishmentId: "",
  });

  const limit = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, establishmentsData, fullStatsData] = await Promise.all([
          getUserWithStats(userId),
          getEstablishments(),
          getUserFullStats(userId),
        ]);

        setEstablishments(establishmentsData);
        setFullStats(fullStatsData);

        if (userData) {
          setUser({
            id: userData.id,
            firstName: userData.first_name || "",
            lastName: userData.last_name || "",
            email: userData.email || "",
            phone: userData.phone,
            birthdate: userData.birthdate,
            username: userData.username,
            avatarUrl: userData.avatar_url,
            role: userData.role,
            xpCoefficient: userData.xp_coefficient || 1,
            cashbackCoefficient: userData.cashback_coefficient || 1,
            attachedEstablishmentId: userData.attached_establishment_id,
            createdAt: userData.created_at,
          });
          setStats({
            totalReceipts: userData.totalReceipts || 0,
            totalSpent: userData.totalSpent || 0,
            totalCoupons: userData.totalCoupons || 0,
            activeCoupons: userData.activeCoupons || 0,
          });
          setForm({
            firstName: userData.first_name || "",
            lastName: userData.last_name || "",
            role: userData.role,
            attachedEstablishmentId: userData.attached_establishment_id?.toString() || "",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "Utilisateur introuvable",
          });
          router.push("/users");
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger l'utilisateur",
        });
        router.push("/users");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [userId, router, toast]);

  // Load coupons when tab is selected
  useEffect(() => {
    if (activeTab === "coupons") {
      fetchCoupons();
    }
  }, [activeTab, couponsPage]);

  // Load receipts when tab is selected
  useEffect(() => {
    if (activeTab === "receipts") {
      fetchReceipts();
    }
  }, [activeTab, receiptsPage]);

  // Load gains when tab is selected or page/filter changes
  useEffect(() => {
    if (activeTab === "gains") {
      fetchGains();
    }
  }, [activeTab, gainsPage, gainsSourceFilter]);

  // Load activity stats when tab is selected or period changes
  useEffect(() => {
    if (activeTab === "activity") {
      fetchActivityStats();
    }
  }, [activeTab, activityPeriod]);

  const fetchActivityStats = async () => {
    setLoadingActivity(true);
    try {
      const [data, daily] = await Promise.all([
        getUserActivityStats(userId, activityPeriod.startDate, activityPeriod.endDate),
        getUserDailyCashback(userId, activityPeriod.startDate, activityPeriod.endDate),
      ]);
      setActivityStats(data);
      setDailyCashback(daily);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les statistiques d'activité",
      });
    } finally {
      setLoadingActivity(false);
    }
  };

  const fetchGains = async () => {
    setLoadingGains(true);
    try {
      const result = await getUserGains(
        userId,
        limit,
        gainsPage * limit,
        gainsSourceFilter !== "all" ? gainsSourceFilter : undefined
      );
      setGains(result.data);
      setGainsTotal(result.count);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les gains",
      });
    } finally {
      setLoadingGains(false);
    }
  };

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const result = await getUserCoupons(userId, limit, couponsPage * limit);
      setCoupons(result.data);
      setCouponsTotal(result.count);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les coupons",
      });
    } finally {
      setLoadingCoupons(false);
    }
  };

  const fetchReceipts = async () => {
    setLoadingReceipts(true);
    try {
      const result = await getUserReceipts(userId, limit, receiptsPage * limit);
      setReceipts(result.data);
      setReceiptsTotal(result.count);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les tickets",
      });
    } finally {
      setLoadingReceipts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateUser(userId, {
        first_name: form.firstName || null,
        last_name: form.lastName || null,
        role: form.role,
        attached_establishment_id: form.attachedEstablishmentId
          ? parseInt(form.attachedEstablishmentId)
          : null,
      });

      toast({ title: "Utilisateur mis a jour" });
      // Update local state
      if (user) {
        setUser({
          ...user,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
          attachedEstablishmentId: form.attachedEstablishmentId
            ? parseInt(form.attachedEstablishmentId)
            : null,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre a jour l'utilisateur",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      case "employee":
        return <Badge variant="outline">Employé</Badge>;
      case "establishment":
        return <Badge variant="secondary">Établissement</Badge>;
      default:
        return <Badge variant="secondary">Client</Badge>;
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getEstablishmentName = (id: number | null) => {
    if (!id) return "-";
    const establishment = establishments.find((e) => e.id === id);
    return establishment?.title || `Établissement #${id}`;
  };

  if (loadingData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const couponsPages = Math.ceil(couponsTotal / limit);
  const receiptsPages = Math.ceil(receiptsTotal / limit);
  const gainsPages = Math.ceil(gainsTotal / limit);

  const displayName =
    user.firstName || user.lastName
      ? `${user.firstName} ${user.lastName}`.trim()
      : user.email || user.id.slice(0, 8) + "...";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{displayName}</h1>
            {getRoleBadge(user.role)}
          </div>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="flex flex-wrap gap-4 [&>*]:min-w-[140px] [&>*]:flex-1">
        <StatCard
          title="XP Total"
          icon={<Star className="h-4 w-4 text-muted-foreground" />}
          value={fullStats?.totalXp.toLocaleString() || 0}
        />
        <StatCard
          title="Cashback"
          icon={<Coins className="h-4 w-4 text-muted-foreground" />}
          value={formatCurrency(fullStats?.cashbackBalance || 0)}
        />
        <StatCard
          title="Tickets"
          icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
          value={stats.totalReceipts}
        />
        <StatCard
          title="Dépensé"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          value={formatCurrency(stats.totalSpent)}
        />
        <StatCard
          title="Coupons"
          icon={<Ticket className="h-4 w-4 text-muted-foreground" />}
          value={stats.totalCoupons}
          subtitle={`${stats.activeCoupons} actif(s)`}
        />
        <StatCard
          title="Rang Hebdo"
          icon={<Trophy className="h-4 w-4 text-muted-foreground" />}
          value={fullStats?.weeklyRank ? `#${fullStats.weeklyRank}` : "-"}
        />
        <StatCard
          title="Rang Mensuel"
          icon={<Trophy className="h-4 w-4 text-muted-foreground" />}
          value={fullStats?.monthlyRank ? `#${fullStats.monthlyRank}` : "-"}
        />
        <StatCard
          title="Rang Annuel"
          icon={<Trophy className="h-4 w-4 text-muted-foreground" />}
          value={fullStats?.yearlyRank ? `#${fullStats.yearlyRank}` : "-"}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Activité
          </TabsTrigger>
          <TabsTrigger value="gains" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Gains
          </TabsTrigger>
          <TabsTrigger value="coupons" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Coupons ({stats.totalCoupons})
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Tickets ({stats.totalReceipts})
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Modifier
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nom complet</p>
                    <p className="font-medium">{displayName}</p>
                  </div>
                </div>
                {user.username && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pseudo</p>
                      <p className="font-medium">@{user.username}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email || "-"}</p>
                  </div>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Téléphone</p>
                      <p className="font-medium">{user.phone}</p>
                    </div>
                  </div>
                )}
                {user.birthdate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date de naissance</p>
                      <p className="font-medium">{formatDate(user.birthdate)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Membre depuis</p>
                    <p className="font-medium">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statut et cashback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <div className="mt-1">{getRoleBadge(user.role)}</div>
                  </div>
                </div>
                {user.attachedEstablishmentId && (
                  <div className="flex items-center gap-3">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Établissement de reference</p>
                      <p className="font-medium">{getEstablishmentName(user.attachedEstablishmentId)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cashback gagne</p>
                    <p className="font-medium">{formatCurrency(fullStats?.cashbackEarned || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cashback depense</p>
                    <p className="font-medium">{formatCurrency(fullStats?.cashbackSpent || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="hidden text-lg font-semibold sm:block">Activité</h2>
            <PeriodSelector
              defaultPreset="last_7_days"
              onPeriodChange={setActivityPeriod}
            />
          </div>

          {loadingActivity ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activityStats ? (
            <>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                <StatCard
                  title="Commandes"
                  icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                  value={activityStats.ordersCount}
                />
                <StatCard
                  title="Dépensé (EUR)"
                  icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
                  value={formatCurrency(activityStats.totalSpentEuros)}
                />
                <StatCard
                  title="XP Gagné"
                  icon={<Zap className="h-4 w-4 text-muted-foreground" />}
                  value={activityStats.xpEarned.toLocaleString()}
                />
                <StatCard
                  title="Cashback Gagné"
                  icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}
                  value={formatCurrency(activityStats.cashbackEarned)}
                  subtitle={`${formatCurrency(activityStats.cashbackEarnedOrganic)} organique · ${formatCurrency(activityStats.cashbackEarnedRewards)} récompenses`}
                />
                <StatCard
                  title="Cashback Dépensé"
                  icon={<ArrowDownCircle className="h-4 w-4 text-muted-foreground" />}
                  value={formatCurrency(activityStats.cashbackSpent)}
                />
              </div>

              {dailyCashback.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cashback gagné vs dépensé</CardTitle>
                    <CardDescription>Évolution sur la période sélectionnée</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dailyCashback}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v: string) => {
                            const d = new Date(v);
                            return `${d.getDate()}/${d.getMonth() + 1}`;
                          }}
                          className="text-xs"
                        />
                        <YAxis
                          tickFormatter={(v: number) => `${(v / 100).toFixed(0)}€`}
                          className="text-xs"
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            const labels: Record<string, string> = {
                              earnedOrganic: "Gagné (organique)",
                              earnedRewards: "Gagné (récompenses)",
                              spent: "Dépensé",
                            };
                            return [formatCurrency(value), labels[name] || name];
                          }}
                          labelFormatter={(label: string) => {
                            const d = new Date(label);
                            return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                          }}
                        />
                        <Legend
                          formatter={(value: string) => {
                            const labels: Record<string, string> = {
                              earnedOrganic: "Organique",
                              earnedRewards: "Récompenses",
                              spent: "Dépensé",
                            };
                            return labels[value] || value;
                          }}
                        />
                        <Bar dataKey="earnedOrganic" stackId="earned" fill="#16a34a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="earnedRewards" stackId="earned" fill="#4ade80" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="spent" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </TabsContent>

        {/* Gains Tab */}
        <TabsContent value="gains">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gains de l'utilisateur</CardTitle>
                  <CardDescription>
                    {gainsTotal} gain{gainsTotal > 1 ? "s" : ""} au total
                  </CardDescription>
                </div>
                <Select
                  value={gainsSourceFilter}
                  onValueChange={(value) => {
                    setGainsSourceFilter(value);
                    setGainsPage(0);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrer par source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sources</SelectItem>
                    <SelectItem value="receipt">Ticket</SelectItem>
                    <SelectItem value="bonus_cashback_manual">Bonus manuel</SelectItem>
                    <SelectItem value="bonus_cashback_leaderboard">Classement</SelectItem>
                    <SelectItem value="bonus_cashback_quest">Quête</SelectItem>
                    <SelectItem value="bonus_cashback_trigger">Trigger</SelectItem>
                    <SelectItem value="bonus_cashback_migration">Migration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingGains ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : gains.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Aucun gain pour cet utilisateur
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>XP</TableHead>
                        <TableHead>Cashback</TableHead>
                        <TableHead>Établissement</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gains.map((gain) => (
                        <TableRow key={gain.id}>
                          <TableCell className="font-mono text-sm">#G{gain.id}</TableCell>
                          <TableCell>
                            {gain.source_type ? (
                              <Badge
                                variant={gain.source_type === "receipt" ? "default" : "secondary"}
                                className={
                                  gain.source_type !== "receipt"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : undefined
                                }
                              >
                                {sourceTypeLabels[gain.source_type] || gain.source_type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {gain.xp != null && gain.xp > 0 ? (
                              <span className="font-medium">{gain.xp.toLocaleString()} XP</span>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {gain.cashback_money != null && gain.cashback_money > 0 ? (
                              <span className="font-medium">{formatCurrency(gain.cashback_money)}</span>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {gain.establishment?.title || (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {gain.period_identifier || (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(gain.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {gainsPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {gainsPage + 1} sur {gainsPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={gainsPage === 0}
                          onClick={() => setGainsPage(gainsPage - 1)}
                        >
                          Précédent
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={gainsPage >= gainsPages - 1}
                          onClick={() => setGainsPage(gainsPage + 1)}
                        >
                          Suivant
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons">
          <Card>
            <CardHeader>
              <CardTitle>Coupons de l'utilisateur</CardTitle>
              <CardDescription>
                {couponsTotal} coupon{couponsTotal > 1 ? "s" : ""} au total
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCoupons ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : coupons.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Aucun coupon pour cet utilisateur
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Valeur</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead>Créé le</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coupons.map((coupon) => (
                        <TableRow key={coupon.id}>
                          <TableCell className="font-mono text-sm">#{coupon.id}</TableCell>
                          <TableCell>
                            {coupon.amount ? (
                              <Badge variant="default">{formatCurrency(coupon.amount)}</Badge>
                            ) : coupon.percentage ? (
                              <Badge variant="secondary">{formatPercentage(coupon.percentage)}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {coupon.coupon_templates?.name || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {coupon.distribution_type === "manual" && "Manuel"}
                            {coupon.distribution_type?.startsWith("leaderboard") && "Leaderboard"}
                            {coupon.distribution_type === "trigger_legacy" && "Legacy"}
                            {!coupon.distribution_type && "-"}
                          </TableCell>
                          <TableCell>
                            {coupon.used ? (
                              <Badge variant="secondary">Utilisé</Badge>
                            ) : isExpired(coupon.expires_at) ? (
                              <Badge variant="destructive">Expire</Badge>
                            ) : (
                              <Badge variant="success">Actif</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {coupon.expires_at ? formatDate(coupon.expires_at) : "Sans expiration"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(coupon.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {couponsPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {couponsPage + 1} sur {couponsPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={couponsPage === 0}
                          onClick={() => setCouponsPage(couponsPage - 1)}
                        >
                          Précédent
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={couponsPage >= couponsPages - 1}
                          onClick={() => setCouponsPage(couponsPage + 1)}
                        >
                          Suivant
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipts Tab */}
        <TabsContent value="receipts">
          <Card>
            <CardHeader>
              <CardTitle>Tickets de l'utilisateur</CardTitle>
              <CardDescription>
                {receiptsTotal} ticket{receiptsTotal > 1 ? "s" : ""} au total
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReceipts ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : receipts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Aucun ticket pour cet utilisateur
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Établissement</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Paiement</TableHead>
                        <TableHead>Consommations</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipts.map((receipt) => (
                        <TableRow key={receipt.id}>
                          <TableCell className="font-mono text-sm">#{receipt.id}</TableCell>
                          <TableCell>
                            {receipt.establishment?.title || `Établissement #${receipt.establishment_id}`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">{formatCurrency(receipt.amount)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {receipt.receipt_lines && receipt.receipt_lines.length > 0 ? (
                                [...new Set(receipt.receipt_lines.map((line) => line.payment_method))].map(
                                  (method) => (
                                    <Badge
                                      key={method}
                                      variant="outline"
                                      className="flex items-center gap-1"
                                    >
                                      {paymentMethodIcons[method]}
                                      {paymentMethodLabels[method] || method}
                                    </Badge>
                                  )
                                )
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {receipt.receipt_consumption_items && receipt.receipt_consumption_items.length > 0 ? (
                                receipt.receipt_consumption_items.map((item) => (
                                  <Badge key={item.id} variant="outline">
                                    {item.quantity}x {consumptionTypeLabels[item.consumption_type] || item.consumption_type}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(receipt.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {receiptsPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Page {receiptsPage + 1} sur {receiptsPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={receiptsPage === 0}
                          onClick={() => setReceiptsPage(receiptsPage - 1)}
                        >
                          Précédent
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={receiptsPage >= receiptsPages - 1}
                          onClick={() => setReceiptsPage(receiptsPage + 1)}
                        >
                          Suivant
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edit Tab */}
        <TabsContent value="edit">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>
                  Modifier les informations de l'utilisateur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      placeholder="Prénom"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      placeholder="Nom"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    L'email ne peut pas être modifié depuis cette interface
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={form.role}
                    onValueChange={(value: UserRole) => setForm({ ...form, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="employee">Employé</SelectItem>
                      <SelectItem value="establishment">Établissement</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    Role actuel : {getRoleBadge(form.role)}
                  </div>
                </div>

                {(form.role === "employee" || form.role === "establishment") && (
                  <div className="space-y-2">
                    <Label htmlFor="attachedEstablishment">Établissement de reference</Label>
                    <Select
                      value={form.attachedEstablishmentId}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          attachedEstablishmentId: value === "none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un établissement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun établissement</SelectItem>
                        {establishments.map((establishment) => (
                          <SelectItem key={establishment.id} value={establishment.id.toString()}>
                            {establishment.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Établissement de reference de cet employe/gérant
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4">
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
