"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Clock, EyeOff, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  getEstablishmentMenuSummaries,
  getMenuCategories,
  getMenuItems,
  setMenuItemActive,
  setMenuItemFeatured,
  unplaceMenuItem,
  describeMenuError,
} from "@/lib/services/menuService";
import { menuKeys } from "@/lib/queries/keys";
import { MenuItemRow } from "./_components/menu-item-row";
import type { MenuCategory, MenuItemWithDetails } from "@/types/database";

/** Une catégorie racine, ses sous-catégories, et les items de chacune. */
type CategoryNode = {
  category: MenuCategory;
  items: MenuItemWithDetails[];
  children: CategoryNode[];
};

export default function MenuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const establishmentId = Number(id);
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);

  const categoriesQuery = useQuery({
    queryKey: menuKeys.categories(establishmentId),
    queryFn: () => getMenuCategories(establishmentId),
    enabled: Number.isFinite(establishmentId),
  });

  const itemsQuery = useQuery({
    queryKey: menuKeys.items(establishmentId),
    queryFn: () => getMenuItems(establishmentId),
    enabled: Number.isFinite(establishmentId),
  });

  const summariesQuery = useQuery({
    queryKey: menuKeys.summaries(),
    queryFn: getEstablishmentMenuSummaries,
  });
  const summary = summariesQuery.data?.find(
    (s) => s.establishment_id === establishmentId,
  );

  /**
   * L'arbre est construit ici plutôt qu'en base : deux niveaux au plus, et la
   * hiérarchie sert uniquement à l'affichage.
   */
  const tree = useMemo<CategoryNode[]>(() => {
    const categories = categoriesQuery.data ?? [];
    const items = itemsQuery.data ?? [];
    const itemsByCategory = new Map<number, MenuItemWithDetails[]>();
    for (const it of items) {
      if (it.category_id === null) continue;
      const list = itemsByCategory.get(it.category_id) ?? [];
      list.push(it);
      itemsByCategory.set(it.category_id, list);
    }
    const roots = categories.filter((c) => c.parent_id === null);
    return roots.map((root) => ({
      category: root,
      items: itemsByCategory.get(root.id) ?? [],
      children: categories
        .filter((c) => c.parent_id === root.id)
        .map((child) => ({
          category: child,
          items: itemsByCategory.get(child.id) ?? [],
          children: [],
        })),
    }));
  }, [categoriesQuery.data, itemsQuery.data]);

  const unplaced = (itemsQuery.data ?? []).filter((i) => i.category_id === null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: menuKeys.all });
  };

  const runAction = async (
    item: MenuItemWithDetails,
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    setBusyId(item.id);
    try {
      await action();
      refresh();
      toast.success(successMessage);
    } catch (err) {
      console.error(err);
      toast.error("Erreur", { description: describeMenuError(err) });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = (item: MenuItemWithDetails) =>
    runAction(
      item,
      () => setMenuItemActive(item.id, !item.is_active),
      item.is_active
        ? `${item.resolved_title} passé en rupture`
        : `${item.resolved_title} de nouveau disponible`,
    );

  const handleToggleFeatured = (item: MenuItemWithDetails) =>
    runAction(
      item,
      () => setMenuItemFeatured(item.id, !item.is_featured),
      item.is_featured
        ? `${item.resolved_title} retiré des coups de cœur`
        : `${item.resolved_title} mis en coup de cœur`,
    );

  const handleUnplace = (item: MenuItemWithDetails) =>
    runAction(
      item,
      () => unplaceMenuItem(item.id),
      `${item.resolved_title} retiré de la carte, mais toujours disponible`,
    );

  const loading = categoriesQuery.isLoading || itemsQuery.isLoading;

  const renderNode = (node: CategoryNode, depth: number) => {
    const hasContent =
      node.items.length > 0 ||
      node.children.length > 0 ||
      node.category.description;
    if (!hasContent) return null;

    return (
      <Card key={node.category.id} className={depth > 0 ? "border-dashed" : ""}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className={depth > 0 ? "text-base" : "text-lg"}>
              {node.category.title}
            </CardTitle>
            {!node.category.is_active && (
              <Badge variant="secondary">Masquée</Badge>
            )}
            <span className="text-muted-foreground text-xs">
              {node.items.length} produit{node.items.length > 1 ? "s" : ""}
            </span>
          </div>
          {node.category.description && (
            <CardDescription className="whitespace-pre-line">
              {node.category.description}
            </CardDescription>
          )}
        </CardHeader>

        {node.items.length > 0 && (
          <CardContent className="px-0 pb-0">
            <div className="border-t">
              {node.items.map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onToggleActive={handleToggleActive}
                  onToggleFeatured={handleToggleFeatured}
                  onUnplace={handleUnplace}
                />
              ))}
            </div>
          </CardContent>
        )}

        {node.children.length > 0 && (
          <CardContent className="space-y-4 pt-4">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/menus">
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Toutes les cartes
        </Link>
      </Button>

      <PageHeader
        title={summary?.establishment_title ?? "Carte"}
        description={
          summary
            ? `${summary.items_count} produit${summary.items_count > 1 ? "s" : ""} sur la carte, réparti${summary.items_count > 1 ? "s" : ""} en ${summary.categories_count} catégorie${summary.categories_count > 1 ? "s" : ""}.`
            : undefined
        }
        actions={
          summary?.happy_hour_start ? (
            <Badge variant="outline" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Happy hour {summary.happy_hour_start.slice(0, 5).replace(":", "h")} -{" "}
              {summary.happy_hour_end?.slice(0, 5).replace(":", "h")}
            </Badge>
          ) : undefined
        }
      />

      {loading ? (
        <div className="space-y-4">
          <div className="bg-muted h-40 w-full animate-pulse rounded-lg" />
          <div className="bg-muted h-40 w-full animate-pulse rounded-lg" />
        </div>
      ) : tree.length === 0 && unplaced.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Carte vide"
          description="Cet établissement n'a pas encore de carte."
        />
      ) : (
        <div className="space-y-4">{tree.map((node) => renderNode(node, 0))}</div>
      )}

      {unplaced.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <EyeOff className="h-4 w-4" aria-hidden="true" />
              Disponibles, hors carte
            </CardTitle>
            <CardDescription>
              Ces produits ne figurent sur aucune catégorie, donc pas sur la carte
              affichée. Les bières restent malgré tout visibles comme disponibles
              dans l&apos;application des Compagnons.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="border-t">
              {unplaced.map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onToggleActive={handleToggleActive}
                  onToggleFeatured={handleToggleFeatured}
                  onUnplace={handleUnplace}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
