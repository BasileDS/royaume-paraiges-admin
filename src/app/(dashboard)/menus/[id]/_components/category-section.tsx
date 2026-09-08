"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MenuCategory, MenuItemWithDetails } from "@/types/database";
import { MenuItemRow } from "./menu-item-row";
import { SECTION_SCROLL_MARGIN } from "./category-nav";

/** Une catégorie racine, ses sous-catégories, et les items de chacune. */
export type CategoryNode = {
  category: MenuCategory;
  items: MenuItemWithDetails[];
  children: CategoryNode[];
};

/** Identifiant DOM d'une section, cible de la barre de catégories. */
export const sectionIdFor = (categoryId: number) => `cat-${categoryId}`;

interface ItemHandlers {
  editHref: string;
  busyId: number | null;
  /** Mots de la recherche en cours, surlignés dans les noms. */
  highlightTokens?: string[];
  /**
   * Carte d'un autre établissement que le sien (migration 109) : tout se lit,
   * rien ne s'ouvre ni ne se modifie.
   */
  readOnly?: boolean;
  onOpenItem: (item: MenuItemWithDetails) => void;
  onToggleActive: (item: MenuItemWithDetails) => void;
  onToggleFeatured: (item: MenuItemWithDetails) => void;
  onUnplace: (item: MenuItemWithDetails) => void;
}

interface CategorySectionProps extends ItemHandlers {
  node: CategoryNode;
  onOpenCategory: (category: MenuCategory) => void;
  onEditCategory: (category: MenuCategory) => void;
  onDeleteCategory: (category: MenuCategory) => void;
}

/**
 * Un bloc de la carte : l'en-tête de la catégorie, ses produits, puis chaque
 * sous-catégorie à plat en dessous. Pas de carte imbriquée : sur un téléphone,
 * chaque niveau d'encadrement mangerait de la largeur utile.
 */
export function CategorySection({ node, ...rest }: CategorySectionProps) {
  const { category } = node;
  const isTextBlock =
    node.items.length === 0 && node.children.length === 0 && Boolean(category.description);
  const isEmpty =
    node.items.length === 0 && node.children.length === 0 && !category.description;

  return (
    <section
      id={sectionIdFor(category.id)}
      aria-labelledby={`${sectionIdFor(category.id)}-title`}
      className={cn(
        SECTION_SCROLL_MARGIN,
        "overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm",
      )}
    >
      <CategoryHeader node={node} depth={0} {...rest} />

      {isEmpty && (
        <p className="px-4 pb-4 text-sm text-muted-foreground">
          Aucun produit dans cette catégorie.
        </p>
      )}

      {node.items.length > 0 && (
        <div className="border-t">
          {node.items.map((item) => (
            <ItemRow key={item.id} item={item} {...rest} />
          ))}
        </div>
      )}

      {node.children.map((child) => (
        <div key={child.category.id} className="border-t">
          <CategoryHeader node={child} depth={1} {...rest} />
          {child.items.length > 0 && (
            <div className="border-t">
              {child.items.map((item) => (
                <ItemRow key={item.id} item={item} {...rest} />
              ))}
            </div>
          )}
        </div>
      ))}

      {isTextBlock && <span className="sr-only">Bloc de texte sans produit</span>}
    </section>
  );
}

function ItemRow({
  item,
  editHref,
  busyId,
  highlightTokens,
  readOnly,
  onOpenItem,
  onToggleActive,
  onToggleFeatured,
  onUnplace,
}: ItemHandlers & { item: MenuItemWithDetails }) {
  return (
    <MenuItemRow
      item={item}
      editHref={editHref}
      busy={busyId === item.id}
      highlightTokens={highlightTokens}
      readOnly={readOnly}
      onOpen={onOpenItem}
      onToggleActive={onToggleActive}
      onToggleFeatured={onToggleFeatured}
      onUnplace={onUnplace}
    />
  );
}

interface CategoryHeaderProps {
  node: CategoryNode;
  depth: 0 | 1;
  readOnly?: boolean;
  onOpenCategory: (category: MenuCategory) => void;
  onEditCategory: (category: MenuCategory) => void;
  onDeleteCategory: (category: MenuCategory) => void;
}

const HEADER_CELL_CLASS =
  "flex min-h-12 min-w-0 flex-1 items-center gap-2 px-4 py-2.5 text-left";

function CategoryHeader({
  node,
  depth,
  readOnly = false,
  onOpenCategory,
  onEditCategory,
  onDeleteCategory,
}: CategoryHeaderProps) {
  const { category } = node;
  const count = node.items.length;

  const label = (
    <>
      <span
        id={depth === 0 ? `${sectionIdFor(category.id)}-title` : undefined}
        className={cn("font-semibold leading-tight", depth === 0 ? "text-base" : "text-sm")}
      >
        {category.title}
      </span>
      {!category.is_active && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          Masquée
        </span>
      )}
      <span className="text-xs tabular-nums text-muted-foreground">
        {count} produit{count > 1 ? "s" : ""}
      </span>
    </>
  );

  if (readOnly) {
    return (
      <div className={cn(depth > 0 && "bg-muted/40")}>
        <div className={HEADER_CELL_CLASS}>{label}</div>
        {category.description && (
          <p className="-mt-1 whitespace-pre-line px-4 pb-3 text-sm text-muted-foreground">
            {category.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn(depth > 0 && "bg-muted/40")}>
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => onOpenCategory(category)}
          aria-haspopup="dialog"
          className={cn(
            HEADER_CELL_CLASS,
            "transition-colors active:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted/60 md:hover:bg-muted/40",
          )}
        >
          {label}
          <MoreHorizontal
            className="ml-auto h-5 w-5 shrink-0 text-muted-foreground/70 md:hidden"
            aria-hidden="true"
          />
        </button>

        <div className="hidden items-center gap-0.5 pr-3 md:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label={`Modifier la catégorie ${category.title}`}
            onClick={() => onEditCategory(category)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label={`Supprimer la catégorie ${category.title}`}
            onClick={() => onDeleteCategory(category)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {category.description && (
        <p className="-mt-1 whitespace-pre-line px-4 pb-3 text-sm text-muted-foreground">
          {category.description}
        </p>
      )}
    </div>
  );
}
