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
import {
  getUserWithStats,
  updateUser,
  getUserCoupons,
  getUserReceipts,
  getUserFullStats,
  type UserCoupon,
  type UserReceipt,
} from "@/lib/services/userService";
import { getEstablishments, type Establishment } from "@/lib/services/contentService";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatPercentage, formatDate, formatDateTime } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const paymentMethodLabels: Record<string, string> = {
  card: "Carte",
  cash: "Especes",
  cashback: "Cashback",
  coupon: "Coupon",
};

const paymentMethodIcons: Record<string, React.ReactNode> = {
  card: <CreditCard className="h-3 w-3" />,
  cash: <Banknote className="h-3 w-3" />,
  cashback: <TrendingUp className="h-3 w-3" />,
  coupon: <Ticket className="h-3 w-3" />,
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

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
        return <Badge variant="outline">Employe</Badge>;
      case "establishment":
        return <Badge variant="secondary">Etablissement</Badge>;
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
    return establishment?.title || `Etablissement #${id}`;
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
      <div className="flex flex-wrap gap-4">
        <Card className="min-w-[140px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">XP Total</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fullStats?.totalXp.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card className="min-w-[140px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cashback</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(fullStats?.cashbackBalance || 0)}</div>
          </CardContent>
        </Card>
        <Card className="min-w-[140px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReceipts}</div>
          </CardContent>
        </Card>
        <Card className="min-w-[140px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Depense</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</div>
          </CardContent>
        </Card>
        <Card className="min-w-[140px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coupons</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCoupons}</div>
            <p className="text-xs text-muted-foreground">{stats.activeCoupons} actif(s)</p>
          </CardContent>
        </Card>
        <Card className="min-w-[140px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rang Hebdo</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fullStats?.weeklyRank ? `#${fullStats.weeklyRank}` : "-"}
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-[140px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rang Mensuel</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fullStats?.monthlyRank ? `#${fullStats.monthlyRank}` : "-"}
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-[140px] flex-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rang Annuel</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fullStats?.yearlyRank ? `#${fullStats.yearlyRank}` : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profil
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
                      <p className="text-sm text-muted-foreground">Telephone</p>
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
                      <p className="text-sm text-muted-foreground">Etablissement de reference</p>
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
                        <TableHead>Cree le</TableHead>
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
                              <Badge variant="secondary">Utilise</Badge>
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
                          Precedent
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
                        <TableHead>Etablissement</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Paiement</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipts.map((receipt) => (
                        <TableRow key={receipt.id}>
                          <TableCell className="font-mono text-sm">#{receipt.id}</TableCell>
                          <TableCell>
                            {receipt.establishment?.title || `Etablissement #${receipt.establishment_id}`}
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
                          Precedent
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
                    <Label htmlFor="firstName">Prenom</Label>
                    <Input
                      id="firstName"
                      placeholder="Prenom"
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
                    L'email ne peut pas etre modifie depuis cette interface
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
                      <SelectItem value="employee">Employe</SelectItem>
                      <SelectItem value="establishment">Etablissement</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    Role actuel : {getRoleBadge(form.role)}
                  </div>
                </div>

                {(form.role === "employee" || form.role === "establishment") && (
                  <div className="space-y-2">
                    <Label htmlFor="attachedEstablishment">Etablissement de reference</Label>
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
                        <SelectValue placeholder="Selectionner un etablissement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun etablissement</SelectItem>
                        {establishments.map((establishment) => (
                          <SelectItem key={establishment.id} value={establishment.id.toString()}>
                            {establishment.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Etablissement de reference de cet employe/gerant
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
