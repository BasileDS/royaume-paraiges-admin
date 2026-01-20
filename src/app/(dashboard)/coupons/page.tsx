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
import { Input } from "@/components/ui/input";
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
import { Plus, Loader2, Search, Filter } from "lucide-react";
import { getCoupons, type CouponFilters } from "@/lib/services/couponService";
import { formatCurrency, formatPercentage, formatDate, formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { Coupon } from "@/types/database";

type CouponWithRelations = Coupon & {
  profiles: { first_name: string | null; last_name: string | null; email: string | null } | null;
  coupon_templates: { name: string } | null;
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<CouponFilters>({});
  const { toast } = useToast();

  const limit = 20;

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data, count } = await getCoupons(filters, limit, page * limit);
      setCoupons(data as CouponWithRelations[]);
      setTotal(count || 0);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les coupons",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [filters, page]);

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coupons</h1>
          <p className="text-muted-foreground">
            Liste de tous les coupons distribues
          </p>
        </div>
        <Link href="/coupons/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Creer un coupon
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select
              value={filters.isUsed?.toString() || "all"}
              onValueChange={(value) => {
                setPage(0);
                setFilters({
                  ...filters,
                  isUsed: value === "all" ? undefined : value === "true",
                });
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="false">Non utilise</SelectItem>
                <SelectItem value="true">Utilise</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.distributionType || "all"}
              onValueChange={(value) => {
                setPage(0);
                setFilters({
                  ...filters,
                  distributionType: value === "all" ? undefined : value,
                });
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="leaderboard_weekly">Leaderboard Hebdo</SelectItem>
                <SelectItem value="leaderboard_monthly">Leaderboard Mensuel</SelectItem>
                <SelectItem value="leaderboard_yearly">Leaderboard Annuel</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
                <SelectItem value="trigger_legacy">Legacy</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.isExpired?.toString() || "all"}
              onValueChange={(value) => {
                setPage(0);
                setFilters({
                  ...filters,
                  isExpired: value === "all" ? undefined : value === "true",
                });
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Expiration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="false">Valide</SelectItem>
                <SelectItem value="true">Expire</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des coupons</CardTitle>
          <CardDescription>
            {total} coupon{total > 1 ? "s" : ""} au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Aucun coupon trouve
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Cree le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono text-sm">
                        #{coupon.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {coupon.profiles
                              ? `${coupon.profiles.first_name || ""} ${
                                  coupon.profiles.last_name || ""
                                }`.trim() || coupon.profiles.email
                              : "Inconnu"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {coupon.profiles?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {coupon.amount ? (
                          <Badge variant="default">
                            {formatCurrency(coupon.amount)}
                          </Badge>
                        ) : coupon.percentage ? (
                          <Badge variant="secondary">
                            {formatPercentage(coupon.percentage)}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {coupon.distribution_type === "manual" && "Manuel"}
                          {coupon.distribution_type?.startsWith("leaderboard") &&
                            "Leaderboard"}
                          {coupon.distribution_type === "trigger_legacy" &&
                            "Legacy"}
                          {!coupon.distribution_type && "-"}
                        </span>
                        {coupon.period_identifier && (
                          <p className="text-xs text-muted-foreground">
                            {coupon.period_identifier}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {coupon.is_used ? (
                          <Badge variant="secondary">Utilise</Badge>
                        ) : isExpired(coupon.expires_at) ? (
                          <Badge variant="destructive">Expire</Badge>
                        ) : (
                          <Badge variant="success">Actif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {coupon.expires_at
                          ? formatDate(coupon.expires_at)
                          : "Sans expiration"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(coupon.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} sur {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      Precedent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(page + 1)}
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
    </div>
  );
}
