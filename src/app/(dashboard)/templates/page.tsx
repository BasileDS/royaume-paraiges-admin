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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getTemplates, toggleTemplateActive, deleteTemplate } from "@/lib/services/templateService";
import { formatCurrency, formatPercentage, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CouponTemplate } from "@/types/database";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<CouponTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const fetchTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data as CouponTemplate[]);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les templates",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await toggleTemplateActive(id, isActive);
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: isActive } : t))
      );
      toast({
        title: isActive ? "Template active" : "Template désactivé",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le template",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteTemplate(deleteId);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
      toast({ title: "Template supprime" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le template",
      });
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates de coupons</h1>
          <p className="text-muted-foreground">
            Gérez les modèles de coupons réutilisables
          </p>
        </div>
        <Link href="/templates/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau template
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tous les templates</CardTitle>
          <CardDescription>
            {templates.length} template{templates.length > 1 ? "s" : ""} au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Aucun template. Créez-en un pour commencer.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Valeur</TableHead>
                  <TableHead>Validite</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead>Cree le</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow
                    key={template.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/templates/${template.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.amount ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Bonus Cashback</Badge>
                      ) : template.percentage ? (
                        <Badge variant="secondary">Coupon</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.amount ? (
                        <Badge variant="default">
                          {formatCurrency(template.amount)}
                        </Badge>
                      ) : template.percentage ? (
                        <Badge variant="secondary">
                          {formatPercentage(template.percentage)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {template.validity_days ? (
                        <span>{template.validity_days} jours</span>
                      ) : (
                        <span className="text-muted-foreground">
                          Sans expiration
                        </span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={template.is_active ?? false}
                        onCheckedChange={(checked) =>
                          handleToggleActive(template.id, checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.created_at ? formatDate(template.created_at) : "-"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/templates/create?duplicate=${template.id}`}>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Dupliquer
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(template.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les coupons existants bases sur ce
              template ne seront pas affectes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
