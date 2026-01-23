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
import { ArrowLeft, Loader2, Receipt, Ticket, Coins, Star } from "lucide-react";
import { getUserWithStats, updateUser } from "@/lib/services/userService";
import { getEstablishments, type Establishment } from "@/lib/services/contentService";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [stats, setStats] = useState({
    totalReceipts: 0,
    totalSpent: 0,
    totalCoupons: 0,
    activeCoupons: 0,
  });

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "client" as UserRole,
    xpCoefficient: "1",
    cashbackCoefficient: "1",
    attachedEstablishmentId: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [user, establishmentsData] = await Promise.all([
          getUserWithStats(userId),
          getEstablishments(),
        ]);

        setEstablishments(establishmentsData);

        if (user) {
          setForm({
            firstName: user.first_name || "",
            lastName: user.last_name || "",
            email: user.email || "",
            role: user.role,
            xpCoefficient: user.xp_coefficient?.toString() || "1",
            cashbackCoefficient: user.cashback_coefficient?.toString() || "1",
            attachedEstablishmentId:
              user.attached_establishment_id?.toString() || "",
          });
          setStats({
            totalReceipts: user.totalReceipts || 0,
            totalSpent: user.totalSpent || 0,
            totalCoupons: user.totalCoupons || 0,
            activeCoupons: user.activeCoupons || 0,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateUser(userId, {
        first_name: form.firstName || null,
        last_name: form.lastName || null,
        role: form.role,
        xp_coefficient: parseFloat(form.xpCoefficient) || 1,
        cashback_coefficient: parseFloat(form.cashbackCoefficient) || 1,
        attached_establishment_id: form.attachedEstablishmentId
          ? parseInt(form.attachedEstablishmentId)
          : null,
      });

      toast({ title: "Utilisateur mis a jour" });
      router.push("/users");
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

  if (loadingData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Modifier l'utilisateur</h1>
          <p className="text-muted-foreground">
            {form.firstName || form.lastName
              ? `${form.firstName} ${form.lastName}`.trim()
              : form.email || userId.slice(0, 8) + "..."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReceipts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total depense</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalSpent)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coupons totaux</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCoupons}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coupons actifs</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCoupons}</div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>
              Identite et coordonnees de l'utilisateur
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
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  placeholder="Nom"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
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
                onValueChange={(value: UserRole) =>
                  setForm({ ...form, role: value })
                }
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
              <p className="text-xs text-muted-foreground">
                Role actuel : {getRoleBadge(form.role)}
              </p>
            </div>

            {(form.role === "employee" || form.role === "establishment") && (
              <div className="space-y-2">
                <Label htmlFor="attachedEstablishment">
                  Etablissement rattache
                </Label>
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
                      <SelectItem
                        key={establishment.id}
                        value={establishment.id.toString()}
                      >
                        {establishment.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Etablissement auquel cet employe/gerant est rattache
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Coefficients de gains</CardTitle>
            <CardDescription>
              Multiplicateurs pour les gains XP et cashback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="xpCoefficient">Coefficient XP</Label>
                <Input
                  id="xpCoefficient"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="1"
                  value={form.xpCoefficient}
                  onChange={(e) =>
                    setForm({ ...form, xpCoefficient: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Multiplicateur des gains XP (1 = normal, 2 = double)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cashbackCoefficient">Coefficient Cashback</Label>
                <Input
                  id="cashbackCoefficient"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  placeholder="1"
                  value={form.cashbackCoefficient}
                  onChange={(e) =>
                    setForm({ ...form, cashbackCoefficient: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Multiplicateur des gains cashback (1 = normal, 2 = double)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/users">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
