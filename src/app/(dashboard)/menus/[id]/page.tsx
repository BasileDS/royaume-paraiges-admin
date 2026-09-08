"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  EyeOff,
  FolderPlus,
  Plus,
  SearchX,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import {
  getEstablishmentMenuSummaries,
  getMenuCategories,
  getMenuItems,
  setMenuItemActive,
  setMenuItemFeatured,
  unplaceMenuItem,
  moveMenuItem,
  replaceMenuItemVariants,
  updateMenuCategory,
  deleteMenuCategory,
  describeMenuError,
} from "@/lib/services/menuService";
import { menuKeys } from "@/lib/queries/keys";
import type { MenuItemVariantInput } from "@/lib/schemas/menu.schema";
import type { MenuCategory, MenuItemWithDetails } from "@/types/database";
import { MenuItemRow } from "./_components/menu-item-row";
import { CategoryDialog } from "./_components/category-dialog";
import {
  CategoryNav,
  SECTION_SCROLL_MARGIN,
  type NavSection,
} from "./_components/category-nav";
import {
  CategorySection,
  sectionIdFor,
  type CategoryNode,
} from "./_components/category-section";
import { MenuItemSheet } from "./_components/menu-item-sheet";
import { CategoryActionsSheet } from "./_components/category-actions-sheet";
import { MenuActionBar } from "./_components/menu-action-bar";
import {
  buildItemSearchIndex,
  buildSearchIndex,
  matchesAllTokens,
  tokenizeQuery,
} from "./_lib/search";

const UNPLACED_SECTION_ID = "hors-carte";
const UNPLACED_LABEL = "Hors carte";

/**
 * Carte d'un établissement, telle que le client la voit, avec les gestes de
 * service à portée de pouce : la page n'orchestre que les requêtes, les
 * mutations et l'état des feuilles ; le rendu vit dans `_components/`.
 */
export default function MenuDetailPage() {
  const { id } = useParams<{ id: string }>();
  const establishmentId = Number(id);
  const queryClient = useQueryClient();

  const [busyId, setBusyId] = useState<number | null>(null);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    category?: MenuCategory;
  }>({ open: false });
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null);
  const [query, setQuery] = useState("");
  // La saisie reste fluide : le filtrage suit avec un temps de retard si besoin.
  const deferredQuery = useDeferredValue(query);

  // ------------------------------------------------------------------ données
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

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  /**
   * L'arbre est construit ici plutôt qu'en base : deux niveaux au plus, et la
   * hiérarchie sert uniquement à l'affichage. Les catégories vides sont
   * rendues aussi : c'est depuis leur en-tête qu'on y ajoute un produit.
   */
  const tree = useMemo<CategoryNode[]>(() => {
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
  }, [categories, items]);

  const unplaced = useMemo(() => items.filter((i) => i.category_id === null), [items]);

  const navSections = useMemo<NavSection[]>(() => {
    const sections = tree.map((n) => ({
      id: sectionIdFor(n.category.id),
      label: n.category.title,
    }));
    if (unplaced.length > 0) sections.push({ id: UNPLACED_SECTION_ID, label: UNPLACED_LABEL });
    return sections;
  }, [tree, unplaced.length]);

  // ---------------------------------------------------------------- recherche
  const tokens = useMemo(() => tokenizeQuery(deferredQuery), [deferredQuery]);
  const searching = tokens.length > 0;

  /**
   * Arbre filtré par la recherche. Une catégorie dont le titre répond à tous
   * les mots est gardée entière (c'est ainsi qu'un bloc de texte sans produit
   * reste trouvable) ; sinon chaque produit est jugé sur sa propre fiche, qui
   * inclut déjà son chemin de catégorie.
   */
  const { visibleTree, visibleUnplaced, resultCount } = useMemo(() => {
    if (!searching) {
      return { visibleTree: tree, visibleUnplaced: unplaced, resultCount: null as number | null };
    }
    const categoryMatches = (category: MenuCategory, parentTitle?: string) =>
      matchesAllTokens(
        buildSearchIndex([parentTitle, category.title, category.description]),
        tokens,
      );
    const filterItems = (list: MenuItemWithDetails[], path: string[]) =>
      list.filter((item) => matchesAllTokens(buildItemSearchIndex(item, path), tokens));

    let count = 0;
    const visibleTree: CategoryNode[] = tree.flatMap((node) => {
      const rootTitle = node.category.title;
      const rootMatches = categoryMatches(node.category);
      const rootItems = rootMatches ? node.items : filterItems(node.items, [rootTitle]);
      const children = node.children.flatMap((child) => {
        const childMatches = rootMatches || categoryMatches(child.category, rootTitle);
        const childItems = childMatches
          ? child.items
          : filterItems(child.items, [rootTitle, child.category.title]);
        if (childItems.length === 0 && !childMatches) return [];
        return [{ ...child, items: childItems }];
      });
      count += rootItems.length + children.reduce((n, c) => n + c.items.length, 0);
      if (rootItems.length === 0 && children.length === 0 && !rootMatches) return [];
      return [{ ...node, items: rootItems, children }];
    });
    const visibleUnplaced = filterItems(unplaced, [UNPLACED_LABEL]);
    count += visibleUnplaced.length;
    return { visibleTree, visibleUnplaced, resultCount: count as number | null };
  }, [searching, tokens, tree, unplaced]);

  // L'item de la feuille est relu dans la liste à chaque rafraîchissement : les
  // interrupteurs reflètent l'état réel, et la feuille se ferme s'il disparaît.
  const selectedItem =
    selectedItemId === null ? null : (items.find((i) => i.id === selectedItemId) ?? null);
  const selectedCategory =
    selectedCategoryId === null
      ? null
      : (categories.find((c) => c.id === selectedCategoryId) ?? null);

  const editHref = `/menus/${establishmentId}/produit`;
  const newProductHref = (categoryId?: number) =>
    categoryId ? `${editHref}/nouveau?category=${categoryId}` : `${editHref}/nouveau`;

  // --------------------------------------------------------------- mutations
  const refresh = () => queryClient.invalidateQueries({ queryKey: menuKeys.all });

  /** Retouche locale de la liste, pour que l'interrupteur bascule sans attendre le réseau. */
  const patchItems = (updater: (list: MenuItemWithDetails[]) => MenuItemWithDetails[]) =>
    queryClient.setQueryData<MenuItemWithDetails[]>(
      menuKeys.items(establishmentId),
      (old) => (old ? updater(old) : old),
    );

  /** Exécute une action sur un item ; renvoie `true` si elle a abouti. */
  const runItemAction = async (
    item: MenuItemWithDetails,
    action: () => Promise<void>,
    successMessage: string,
  ): Promise<boolean> => {
    setBusyId(item.id);
    try {
      await action();
      await refresh();
      toast.success(successMessage);
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Erreur", { description: describeMenuError(err) });
      await refresh();
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const runCategoryAction = async (action: () => Promise<void>, successMessage: string) => {
    setCategoryBusy(true);
    try {
      await action();
      await refresh();
      toast.success(successMessage);
    } catch (err) {
      console.error(err);
      toast.error("Erreur", { description: describeMenuError(err) });
    } finally {
      setCategoryBusy(false);
    }
  };

  const handleToggleActive = (item: MenuItemWithDetails) => {
    const next = !item.is_active;
    patchItems((list) => list.map((i) => (i.id === item.id ? { ...i, is_active: next } : i)));
    void runItemAction(
      item,
      () => setMenuItemActive(item.id, next),
      next
        ? `${item.resolved_title} de nouveau disponible`
        : `${item.resolved_title} passé en rupture`,
    );
  };

  const handleToggleFeatured = (item: MenuItemWithDetails) => {
    const next = !item.is_featured;
    // L'étoile se déplace : l'ancien coup de cœur de la catégorie la perd.
    patchItems((list) =>
      list.map((i) => {
        if (i.id === item.id) return { ...i, is_featured: next };
        if (next && item.category_id !== null && i.category_id === item.category_id) {
          return { ...i, is_featured: false };
        }
        return i;
      }),
    );
    void runItemAction(
      item,
      () => setMenuItemFeatured(item.id, next),
      next
        ? `${item.resolved_title} mis en coup de cœur`
        : `${item.resolved_title} retiré des coups de cœur`,
    );
  };

  const handleUnplace = (item: MenuItemWithDetails) => {
    setSelectedItemId(null);
    void runItemAction(
      item,
      () => unplaceMenuItem(item.id),
      `${item.resolved_title} retiré de la carte, mais toujours disponible`,
    );
  };

  const handleMove = (item: MenuItemWithDetails, categoryId: number | null) => {
    if (categoryId === item.category_id) return;
    setSelectedItemId(null);
    if (categoryId === null) {
      handleUnplace(item);
      return;
    }
    const target = categories.find((c) => c.id === categoryId);
    void runItemAction(
      item,
      () => moveMenuItem(item.id, categoryId),
      `${item.resolved_title} placé dans « ${target?.title ?? "?"} »`,
    );
  };

  const handleSavePrices = async (
    item: MenuItemWithDetails,
    variants: MenuItemVariantInput[],
  ) => {
    const ok = await runItemAction(
      item,
      () => replaceMenuItemVariants(item.id, variants),
      `Prix de ${item.resolved_title} enregistrés`,
    );
    // La feuille ne remet son formulaire à zéro que si l'enregistrement a abouti.
    if (!ok) throw new Error("PRICES_NOT_SAVED");
  };

  const handleEditCategory = (category: MenuCategory) => {
    setSelectedCategoryId(null);
    setCategoryDialog({ open: true, category });
  };

  const handleToggleCategoryActive = (category: MenuCategory) => {
    const next = !category.is_active;
    void runCategoryAction(
      () => updateMenuCategory(category.id, { is_active: next }),
      next
        ? `Catégorie « ${category.title} » visible sur la carte`
        : `Catégorie « ${category.title} » masquée`,
    );
  };

  const handleAskDeleteCategory = (category: MenuCategory) => {
    setSelectedCategoryId(null);
    setCategoryToDelete(category);
  };

  const handleDeleteCategory = async () => {
    const category = categoryToDelete;
    if (!category) return;
    setCategoryToDelete(null);
    await runCategoryAction(
      () => deleteMenuCategory(category.id),
      `Catégorie « ${category.title} » supprimée`,
    );
  };

  // ------------------------------------------------------------------- rendu
  const loading = categoriesQuery.isLoading || itemsQuery.isLoading;
  const emptyCard = tree.length === 0 && unplaced.length === 0;

  const itemHandlers = {
    editHref,
    busyId,
    highlightTokens: tokens,
    onOpenItem: (item: MenuItemWithDetails) => setSelectedItemId(item.id),
    onToggleActive: handleToggleActive,
    onToggleFeatured: handleToggleFeatured,
    onUnplace: handleUnplace,
  };

  return (
    // Le pied laisse la place à la barre d'actions fixe sur téléphone.
    <div className="space-y-6 pb-24 md:pb-0">
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
          <>
            {summary?.happy_hour_start && (
              <Badge variant="outline" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Happy hour {summary.happy_hour_start.slice(0, 5).replace(":", "h")} -{" "}
                {summary.happy_hour_end?.slice(0, 5).replace(":", "h")}
              </Badge>
            )}
            {/* Sur téléphone, ces deux actions vivent dans la barre du bas. */}
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="outline" onClick={() => setCategoryDialog({ open: true })}>
                <FolderPlus className="mr-1 h-4 w-4" aria-hidden="true" />
                Catégorie
              </Button>
              <Button asChild>
                <Link href={newProductHref()}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                  Produit
                </Link>
              </Button>
            </div>
          </>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      ) : emptyCard ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Carte vide"
          description="Cet établissement n'a pas encore de carte. Commencez par une catégorie, puis ajoutez-y des produits."
          action={
            <Button variant="outline" onClick={() => setCategoryDialog({ open: true })}>
              <FolderPlus className="mr-1 h-4 w-4" aria-hidden="true" />
              Créer une catégorie
            </Button>
          }
        />
      ) : (
        <>
          <CategoryNav
            sections={navSections}
            query={query}
            onQueryChange={setQuery}
            resultCount={resultCount}
            totalCount={items.length}
          />

          {searching && resultCount === 0 && (
            <EmptyState
              icon={SearchX}
              title="Aucun résultat pour cette recherche"
              description={`Aucun produit ne correspond à « ${deferredQuery.trim()} ». La recherche porte sur le nom, la catégorie, le format, le prix et l'état (rupture, happy hour, coup de cœur).`}
              action={
                <Button variant="outline" onClick={() => setQuery("")}>
                  Effacer la recherche
                </Button>
              }
            />
          )}

          <div className="space-y-4">
            {visibleTree.map((node) => (
              <CategorySection
                key={node.category.id}
                node={node}
                onOpenCategory={(category) => setSelectedCategoryId(category.id)}
                onEditCategory={handleEditCategory}
                onDeleteCategory={handleAskDeleteCategory}
                {...itemHandlers}
              />
            ))}

            {visibleUnplaced.length > 0 && (
              <section
                id={UNPLACED_SECTION_ID}
                aria-labelledby={`${UNPLACED_SECTION_ID}-title`}
                className={cn(
                  SECTION_SCROLL_MARGIN,
                  "overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm",
                )}
              >
                <div className="px-4 py-3">
                  <h2
                    id={`${UNPLACED_SECTION_ID}-title`}
                    className="flex items-center gap-2 text-base font-semibold leading-tight"
                  >
                    <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Disponibles, hors carte
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ces produits ne figurent sur aucune catégorie, donc pas sur la
                    carte affichée. Les bières restent malgré tout visibles comme
                    disponibles dans l&apos;application des Compagnons.
                  </p>
                </div>
                <div className="border-t">
                  {visibleUnplaced.map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      editHref={editHref}
                      busy={busyId === item.id}
                      highlightTokens={tokens}
                      onOpen={itemHandlers.onOpenItem}
                      onToggleActive={handleToggleActive}
                      onToggleFeatured={handleToggleFeatured}
                      onUnplace={handleUnplace}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}

      <MenuActionBar
        addProductHref={newProductHref()}
        onAddCategory={() => setCategoryDialog({ open: true })}
      />

      <MenuItemSheet
        item={selectedItem}
        categories={categories}
        editHref={editHref}
        busy={busyId !== null}
        onClose={() => setSelectedItemId(null)}
        onToggleActive={handleToggleActive}
        onToggleFeatured={handleToggleFeatured}
        onUnplace={handleUnplace}
        onMove={handleMove}
        onSavePrices={handleSavePrices}
      />

      <CategoryActionsSheet
        category={selectedCategory}
        addProductHref={(categoryId) => newProductHref(categoryId)}
        busy={categoryBusy}
        onClose={() => setSelectedCategoryId(null)}
        onEdit={handleEditCategory}
        onToggleActive={handleToggleCategoryActive}
        onDelete={handleAskDeleteCategory}
      />

      {/* Monté à l'ouverture seulement : le formulaire repart des valeurs de la
          catégorie sans effet de resynchronisation. */}
      {categoryDialog.open && (
        <CategoryDialog
          open
          onOpenChange={(open) => setCategoryDialog({ open, category: undefined })}
          establishmentId={establishmentId}
          categories={categories}
          category={categoryDialog.category}
        />
      )}

      <ConfirmDialog
        open={categoryToDelete !== null}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        title={`Supprimer « ${categoryToDelete?.title ?? ""} » ?`}
        description="Les produits de cette catégorie ne sont pas supprimés : ils redeviennent disponibles mais hors carte. Ses sous-catégories, elles, sont supprimées."
        confirmLabel="Supprimer"
        destructive
        onConfirm={handleDeleteCategory}
      />
    </div>
  );
}
