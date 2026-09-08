import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  menuCategorySchema,
  menuCategoryUpdateSchema,
  menuItemSchema,
  menuItemUpdateSchema,
  menuItemVariantsSchema,
  type MenuCategoryInput,
  type MenuCategoryUpdateInput,
  type MenuItemInput,
  type MenuItemUpdateInput,
  type MenuItemVariantInput,
} from "@/lib/schemas/menu.schema";
import type {
  EstablishmentMenuSummary,
  MenuCatalogProduct,
  MenuCategory,
  MenuItem,
  MenuItemType,
  MenuItemVariant,
  MenuItemWithDetails,
  MenusDatabase,
} from "@/types/database";

/**
 * Accès à la couche menus (migrations 094 à 101).
 *
 * RLS admin-only, avec feature gating `admin_has_feature('menus')` en écriture :
 * le contrôle d'accès est délégué à PostgreSQL, il n'est pas revérifié ici. Un
 * admin privé de la fonctionnalité verra la lecture fonctionner et toute
 * écriture échouer, le blocage dur étant côté middleware.
 *
 * La carte publique ne passe PAS par ce service : elle appelle la RPC
 * `get_public_menu(slug)`, seul chemin ouvert à `anon`.
 */

/**
 * Client typé sur le schéma local des tables `menu_*`, absentes de
 * `database.generated.ts`. Même pattern que `reportsClient()` : le client
 * sous-jacent est strictement le même.
 */
function menusClient(): SupabaseClient<MenusDatabase> {
  return createClient() as unknown as SupabaseClient<MenusDatabase>;
}

// ============================================================================
// Référentiels
// ============================================================================

/** Les 14 familles seedées par la 095. Lecture seule : en ajouter passe par une migration. */
export async function getMenuItemTypes(): Promise<MenuItemType[]> {
  const { data, error } = await menusClient()
    .from("menu_item_types")
    .select("*")
    .eq("is_active", true)
    .order("position");
  if (error) throw error;
  return data ?? [];
}

/** Catalogue partagé hors bières (les softs à date). */
export async function getMenuCatalogProducts(): Promise<MenuCatalogProduct[]> {
  const { data, error } = await menusClient()
    .from("menu_catalog_products")
    .select("*")
    .order("title");
  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// Vue d'ensemble : un établissement, l'état de sa carte
// ============================================================================

/**
 * Résumé par établissement pour la liste `/menus`.
 *
 * Trois requêtes à plat plutôt qu'une RPC : les volumes sont de l'ordre de la
 * centaine de lignes et une RPC de plus demanderait une migration pour un gain
 * nul. L'agrégation se fait ici.
 */
export async function getEstablishmentMenuSummaries(): Promise<
  EstablishmentMenuSummary[]
> {
  const supabase = createClient();

  const estabRes = await supabase
    .from("establishments")
    .select("id, title, slug, city, happy_hour_start, happy_hour_end")
    .order("title");
  if (estabRes.error) throw estabRes.error;

  const catRes = await menusClient()
    .from("menu_categories")
    .select("establishment_id");
  if (catRes.error) throw catRes.error;

  const itemRes = await menusClient()
    .from("menu_items")
    .select("establishment_id, category_id, is_active, beer_id");
  if (itemRes.error) throw itemRes.error;

  const cats = new Map<number, number>();
  for (const c of catRes.data ?? []) {
    cats.set(c.establishment_id, (cats.get(c.establishment_id) ?? 0) + 1);
  }

  type Counts = {
    items: number;
    unplaced: number;
    inactive: number;
    beers: number;
  };
  const counts = new Map<number, Counts>();
  for (const it of itemRes.data ?? []) {
    const c = counts.get(it.establishment_id) ?? {
      items: 0,
      unplaced: 0,
      inactive: 0,
      beers: 0,
    };
    if (it.category_id === null) c.unplaced += 1;
    else c.items += 1;
    if (!it.is_active) c.inactive += 1;
    if (it.beer_id !== null) c.beers += 1;
    counts.set(it.establishment_id, c);
  }

  const estabs = (estabRes.data ?? []) as unknown as {
    id: number;
    title: string;
    city: string | null;
    slug: string;
    happy_hour_start: string | null;
    happy_hour_end: string | null;
  }[];

  return estabs.map((e) => {
    const c = counts.get(e.id);
    return {
      establishment_id: e.id,
      establishment_title: e.title,
      slug: e.slug,
      city: e.city ?? null,
      categories_count: cats.get(e.id) ?? 0,
      items_count: c?.items ?? 0,
      unplaced_count: c?.unplaced ?? 0,
      inactive_count: c?.inactive ?? 0,
      beers_count: c?.beers ?? 0,
      happy_hour_start: e.happy_hour_start,
      happy_hour_end: e.happy_hour_end,
    };
  });
}

// ============================================================================
// Carte d'un établissement
// ============================================================================

export async function getMenuCategories(
  establishmentId: number,
): Promise<MenuCategory[]> {
  const { data, error } = await menusClient()
    .from("menu_categories")
    .select("*")
    .eq("establishment_id", establishmentId)
    .order("position");
  if (error) throw error;
  return data ?? [];
}

/**
 * Items d'un établissement, descriptif résolu et variantes incluses.
 *
 * Le titre suit la source : la bière et le produit de catalogue font foi,
 * l'item ne les surcharge pas. C'est la même règle que `get_public_menu`, et
 * l'admin doit montrer exactement ce que le client verra.
 */
export async function getMenuItems(
  establishmentId: number,
): Promise<MenuItemWithDetails[]> {
  const supabase = createClient();

  const itemRes = await menusClient()
    .from("menu_items")
    .select("*")
    .eq("establishment_id", establishmentId)
    .order("position");
  if (itemRes.error) throw itemRes.error;
  const items = (itemRes.data ?? []) as MenuItem[];
  if (items.length === 0) return [];

  const variantRes = await menusClient()
    .from("menu_item_variants")
    .select("*")
    .in(
      "menu_item_id",
      items.map((i) => i.id),
    )
    .order("position");
  if (variantRes.error) throw variantRes.error;

  const types = await getMenuItemTypes();
  const typeById = new Map(types.map((t) => [t.id, t]));

  const beerIds = items.map((i) => i.beer_id).filter((x): x is number => x !== null);
  const beerTitles = new Map<number, string>();
  if (beerIds.length > 0) {
    const beerRes = await supabase.from("beers").select("id, title").in("id", beerIds);
    if (beerRes.error) throw beerRes.error;
    for (const b of (beerRes.data ?? []) as { id: number; title: string }[]) {
      beerTitles.set(b.id, b.title);
    }
  }

  const catalogIds = items
    .map((i) => i.catalog_product_id)
    .filter((x): x is number => x !== null);
  const catalogTitles = new Map<number, string>();
  if (catalogIds.length > 0) {
    const cpRes = await menusClient()
      .from("menu_catalog_products")
      .select("id, title")
      .in("id", catalogIds);
    if (cpRes.error) throw cpRes.error;
    for (const c of cpRes.data ?? []) catalogTitles.set(c.id, c.title);
  }

  const variantsByItem = new Map<number, MenuItemVariant[]>();
  for (const v of (variantRes.data ?? []) as MenuItemVariant[]) {
    const list = variantsByItem.get(v.menu_item_id) ?? [];
    list.push(v);
    variantsByItem.set(v.menu_item_id, list);
  }

  return items.map((item) => {
    const source: MenuItemWithDetails["source"] =
      item.beer_id !== null
        ? "beer"
        : item.catalog_product_id !== null
          ? "catalog"
          : "private";
    const resolved =
      (item.beer_id !== null ? beerTitles.get(item.beer_id) : undefined) ??
      (item.catalog_product_id !== null
        ? catalogTitles.get(item.catalog_product_id)
        : undefined) ??
      item.title ??
      "(sans nom)";
    const type = typeById.get(item.item_type_id);
    return {
      ...item,
      resolved_title: resolved,
      source,
      type_slug: type?.slug ?? "",
      type_label: type?.label ?? "",
      variants: variantsByItem.get(item.id) ?? [],
    };
  });
}

/** Un item et ses variantes, pour le formulaire d'édition. */
export async function getMenuItem(id: number): Promise<MenuItemWithDetails | null> {
  const { data, error } = await menusClient()
    .from("menu_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // Réutilise la résolution de titre de `getMenuItems` plutôt que de la
  // dupliquer : un seul endroit décide de qui fait foi.
  const all = await getMenuItems(data.establishment_id);
  return all.find((i) => i.id === id) ?? null;
}

/**
 * Bières et produits de catalogue déjà placés sur la carte d'un établissement.
 * Le formulaire s'en sert pour les retirer du sélecteur : les deux index
 * uniques par établissement les refuseraient de toute façon, autant ne pas les
 * proposer.
 */
export async function getUsedCatalogSources(
  establishmentId: number,
): Promise<{ beerIds: Set<number>; catalogIds: Set<number> }> {
  const { data, error } = await menusClient()
    .from("menu_items")
    .select("beer_id, catalog_product_id")
    .eq("establishment_id", establishmentId);
  if (error) throw error;
  const beerIds = new Set<number>();
  const catalogIds = new Set<number>();
  for (const row of data ?? []) {
    if (row.beer_id !== null) beerIds.add(row.beer_id);
    if (row.catalog_product_id !== null) catalogIds.add(row.catalog_product_id);
  }
  return { beerIds, catalogIds };
}

// ============================================================================
// Écritures : catégories
// ============================================================================

export async function createMenuCategory(
  input: MenuCategoryInput,
): Promise<MenuCategory> {
  const payload = menuCategorySchema.parse(input);
  const { data, error } = await menusClient()
    .from("menu_categories")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMenuCategory(
  id: number,
  input: MenuCategoryUpdateInput,
): Promise<void> {
  const payload = menuCategoryUpdateSchema.parse(input);
  const { error } = await menusClient()
    .from("menu_categories")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Supprimer une catégorie n'emporte pas ses produits : la FK est en SET NULL,
 * ils redeviennent disponibles mais hors carte. Ses sous-catégories, elles,
 * sont supprimées en cascade.
 */
export async function deleteMenuCategory(id: number): Promise<void> {
  const { error } = await menusClient().from("menu_categories").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================================
// Écritures : items et variantes
// ============================================================================

export async function createMenuItem(input: MenuItemInput): Promise<MenuItem> {
  const payload = menuItemSchema.parse(input);
  const { variants, ...item } = payload;

  const { data, error } = await menusClient()
    .from("menu_items")
    .insert({ ...item, is_featured: false })
    .select()
    .single();
  if (error) throw error;

  // La mise en avant est posée à part : elle doit passer par la RPC de
  // transfert, sinon l'insertion bute sur l'index unique quand la catégorie a
  // déjà un coup de cœur.
  if (item.is_featured) await setMenuItemFeatured(data.id, true);

  if (variants.length > 0) {
    const { error: vErr } = await menusClient()
      .from("menu_item_variants")
      .insert(
        variants.map((v, n) => ({
          menu_item_id: data.id,
          label: v.label ?? null,
          price: v.price ?? null,
          is_happy_hour: v.is_happy_hour,
          position: v.position || n + 1,
        })),
      );
    if (vErr) throw vErr;
  }
  return data;
}

/**
 * Met à jour l'item et remplace ses variantes.
 *
 * Le remplacement est un delete puis un insert, et non un diff : PostgREST n'a
 * pas de transaction multi-requêtes, un diff laisserait autant de fenêtres
 * d'incohérence, pour un gain nul sur des lots de deux à quatre lignes.
 * Contrepartie assumée : les identifiants des variantes changent à chaque
 * enregistrement, rien ne s'y raccroche.
 */
export async function updateMenuItem(
  id: number,
  input: MenuItemUpdateInput,
): Promise<void> {
  const payload = menuItemUpdateSchema.parse(input);
  const { variants, ...item } = payload;

  // Même raison qu'à la création : la mise en avant est traitée à part.
  const { is_featured, ...rest } = item;
  if (Object.keys(rest).length > 0) {
    const { error } = await menusClient().from("menu_items").update(rest).eq("id", id);
    if (error) throw error;
  }
  if (is_featured !== undefined) await setMenuItemFeatured(id, is_featured);

  if (variants !== undefined) await replaceMenuItemVariants(id, variants);
}

/**
 * Remplace tous les formats d'un item. C'est le chemin de la modification
 * rapide des prix depuis la fiche d'un produit : l'item lui-même n'est pas
 * touché, on ne passe donc pas par `updateMenuItem`.
 */
export async function replaceMenuItemVariants(
  id: number,
  input: MenuItemVariantInput[],
): Promise<void> {
  const variants = menuItemVariantsSchema.parse(input);

  const { error: delErr } = await menusClient()
    .from("menu_item_variants")
    .delete()
    .eq("menu_item_id", id);
  if (delErr) throw delErr;

  if (variants.length > 0) {
    const { error: insErr } = await menusClient()
      .from("menu_item_variants")
      .insert(
        variants.map((v, n) => ({
          menu_item_id: id,
          label: v.label ?? null,
          price: v.price ?? null,
          is_happy_hour: v.is_happy_hour,
          position: v.position || n + 1,
        })),
      );
    if (insErr) throw insErr;
  }
}

/**
 * Déplace l'item dans une autre catégorie, `null` = hors carte. Update ciblé
 * sur la seule colonne : rien d'autre ne bouge, ni formats ni coup de cœur.
 */
export async function moveMenuItem(
  id: number,
  categoryId: number | null,
): Promise<void> {
  const { error } = await menusClient()
    .from("menu_items")
    .update({ category_id: categoryId })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Retire l'item de la carte affichée sans le supprimer : il reste disponible.
 * Pour une bière, c'est la nuance qui la garde dans `beers_establishments`.
 */
export async function unplaceMenuItem(id: number): Promise<void> {
  return moveMenuItem(id, null);
}

export async function setMenuItemActive(id: number, isActive: boolean): Promise<void> {
  const { error } = await menusClient()
    .from("menu_items")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Pose ou retire le coup de cœur.
 *
 * Passe par la RPC `set_menu_item_featured` (migration 103) et non par un update
 * direct : la catégorie n'en accepte qu'un, et l'étoile doit se **déplacer**
 * plutôt que buter sur l'index unique. Le retrait de l'ancien et la pose du
 * nouveau sont atomiques, ce que deux appels REST ne peuvent pas garantir.
 */
export async function setMenuItemFeatured(
  id: number,
  isFeatured: boolean,
): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)("set_menu_item_featured", {
    p_item_id: id,
    p_featured: isFeatured,
  });
  if (error) throw error;
}

/**
 * Suppression définitive. Les variantes suivent en cascade. Pour une bière,
 * cela la retire aussi de `beers_establishments` : préférer `unplaceMenuItem`
 * si l'intention est seulement de la sortir de la carte affichée.
 */
export async function deleteMenuItem(id: number): Promise<void> {
  const { error } = await menusClient().from("menu_items").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================================
// Traduction des erreurs BDD
// ============================================================================

/**
 * Les garde-fous de la couche menus remontent des codes que l'UI doit rendre
 * lisibles. `P0426` vient des triggers `trg_menu_items_scope` et
 * `trg_menu_categories_depth`, `23505` des deux index uniques par établissement.
 */
export function describeMenuError(error: unknown): string {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return "Erreur inconnue";

  if (e.code === "P0426") {
    if (e.message?.includes("MENU_ITEM_BEER_TYPE")) {
      return "Un produit lié à une bière doit être de famille Bière ou Cidre.";
    }
    if (e.message?.includes("MENU_CATEGORY_TOO_DEEP")) {
      return "Les catégories sont limitées à deux niveaux.";
    }
    return "La catégorie appartient à un autre établissement.";
  }
  if (e.code === "23505") {
    if (e.message?.includes("one_featured_per_category")) {
      return "Cette catégorie a déjà un coup de cœur.";
    }
    return "Ce produit est déjà sur la carte de cet établissement.";
  }
  if (e.code === "P0427") {
    return "Produit introuvable : il a peut-être été supprimé depuis un autre onglet.";
  }
  if (e.code === "23514") {
    return "Choisir une seule source de descriptif : bière, catalogue, ou nom local.";
  }
  if (e.code === "42501") {
    return "Vous n'avez pas accès à la gestion des menus.";
  }
  return e.message ?? "Erreur inconnue";
}
