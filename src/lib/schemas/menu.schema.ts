import { z } from "zod";

/**
 * Validation des payloads de la couche menus (migrations 094 à 101).
 *
 * Les règles reproduisent les contraintes BDD plutôt que de les deviner : mieux
 * vaut un message clair dans le formulaire qu'un code d'erreur Postgres remonté
 * tel quel. Les trois garde-fous côté base restent la référence :
 * `ck_menu_items_one_source`, `ck_menu_items_title_not_blank`, et le trigger
 * `trg_menu_items_scope` (errcode P0426).
 */

// ============================================================================
// Catégories
// ============================================================================

/**
 * ⚠️ Pas de `.default()` sur ce noyau : en Zod 4, `.partial()` conserve les
 * défauts, et un `update({ is_active: false })` renverrait aussi `position: 0`.
 * Les défauts ne sont posés que sur le schéma de création.
 */
const menuCategoryCoreSchema = z.object({
  establishment_id: z.number().int().positive("Établissement requis"),
  /** NULL = catégorie racine. La profondeur est bornée à deux niveaux en base. */
  parent_id: z.number().int().positive().nullable().optional(),
  /** Chapitre de la carte. Réservé aux racines : le trigger `trg_menu_categories_section` refuse le reste. */
  section_id: z.number().int().positive().nullable().optional(),
  title: z.string().min(1, "Titre requis").max(120),
  description: z.string().max(2000).nullable().optional(),
  position: z.number().int().min(0),
  is_active: z.boolean(),
});

export const menuCategorySchema = menuCategoryCoreSchema.extend({
  position: menuCategoryCoreSchema.shape.position.default(0),
  is_active: menuCategoryCoreSchema.shape.is_active.default(true),
});
export const menuCategoryUpdateSchema = menuCategoryCoreSchema
  .omit({ establishment_id: true })
  .partial();

export type MenuCategoryInput = z.infer<typeof menuCategorySchema>;
export type MenuCategoryUpdateInput = z.infer<typeof menuCategoryUpdateSchema>;

// ============================================================================
// Sections (chapitres de la carte, migration 107)
// ============================================================================

const menuSectionCoreSchema = z.object({
  establishment_id: z.number().int().positive("Établissement requis"),
  title: z.string().trim().min(1, "Titre requis").max(120),
  description: z.string().max(2000).nullable().optional(),
});

export const menuSectionSchema = menuSectionCoreSchema;
export const menuSectionUpdateSchema = menuSectionCoreSchema
  .omit({ establishment_id: true })
  .partial();

export type MenuSectionInput = z.infer<typeof menuSectionSchema>;
export type MenuSectionUpdateInput = z.infer<typeof menuSectionUpdateSchema>;

// ============================================================================
// Items de carte
// ============================================================================

/**
 * Le champ `label` ne porte que le format : « 25 cl », « Bouteille 75 cl ». Le
 * tarif happy hour se déclare avec `is_happy_hour`, jamais dans le libellé —
 * c'est la dette que l'import de la 099 a précisément soldée.
 */
export const menuItemVariantSchema = z.object({
  id: z.number().int().positive().optional(),
  label: z
    .string()
    .max(60)
    .nullable()
    .optional()
    .refine(
      (v) => !v || !/happy\s*hour/i.test(v),
      "Ne pas écrire « happy hour » dans le libellé : utiliser l'interrupteur dédié",
    ),
  /** NULL = prix non communiqué, affiché « — » sur la carte. Distinct de 0. */
  price: z.number().min(0, "Prix négatif impossible").nullable().optional(),
  is_happy_hour: z.boolean().default(false),
  position: z.number().int().min(0).default(0),
});

/** Liste complète des formats d'un item, telle que `replaceMenuItemVariants` la remplace. */
export const menuItemVariantsSchema = z.array(menuItemVariantSchema);

/**
 * Même règle que pour les catégories : aucun `.default()` ici, sinon un
 * `update({ category_id })` effacerait les formats (`variants: []`) et
 * retirerait le coup de cœur (`is_featured: false`) au passage.
 */
const menuItemCoreSchema = z.object({
  establishment_id: z.number().int().positive("Établissement requis"),
  /** NULL = disponible mais hors carte affichée. */
  category_id: z.number().int().positive().nullable().optional(),
  item_type_id: z.number().int().positive("Famille de produit requise"),

  // Exactement une des trois sources de descriptif.
  beer_id: z.number().int().positive().nullable().optional(),
  catalog_product_id: z.number().int().positive().nullable().optional(),
  title: z.string().max(200).nullable().optional(),

  description: z.string().max(4000).nullable().optional(),
  featured_image: z.string().max(500).nullable().optional(),
  allergens: z.string().max(1000).nullable().optional(),
  precision: z.string().max(200).nullable().optional(),
  position: z.number().int().min(0),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  variants: menuItemVariantsSchema,
});

const menuItemBaseSchema = menuItemCoreSchema.extend({
  position: menuItemCoreSchema.shape.position.default(0),
  is_active: menuItemCoreSchema.shape.is_active.default(true),
  is_featured: menuItemCoreSchema.shape.is_featured.default(false),
  variants: menuItemVariantsSchema.default([]),
});

/**
 * Reproduit `ck_menu_items_one_source` : un item tire son descriptif d'une bière
 * du catalogue, d'un produit partagé, ou de ses propres colonnes. Jamais de deux
 * sources à la fois, jamais d'aucune.
 */
function assertOneSource(
  v: { beer_id?: number | null; catalog_product_id?: number | null; title?: string | null },
  ctx: z.RefinementCtx,
) {
  const sources = [v.beer_id, v.catalog_product_id, v.title?.trim() || null].filter(
    (x) => x !== null && x !== undefined,
  );
  if (sources.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["title"],
      message: "Choisir une bière, un produit du catalogue, ou saisir un nom",
    });
  } else if (sources.length > 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["title"],
      message: "Une seule source de descriptif : bière, catalogue, ou nom local",
    });
  }
}

export const menuItemSchema = menuItemBaseSchema.superRefine(assertOneSource);

/**
 * En modification, ni l'établissement ni la source ne changent : déplacer un
 * item d'un établissement à l'autre ou le rebrancher sur une autre bière n'a pas
 * de sens métier, on supprime et on recrée.
 */
export const menuItemUpdateSchema = menuItemCoreSchema
  .omit({ establishment_id: true, beer_id: true, catalog_product_id: true })
  .partial();

export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type MenuItemUpdateInput = z.infer<typeof menuItemUpdateSchema>;
export type MenuItemVariantInput = z.infer<typeof menuItemVariantSchema>;

// ============================================================================
// Catalogue partagé
// ============================================================================

const menuCatalogProductBaseSchema = z.object({
  item_type_id: z.number().int().positive("Famille de produit requise"),
  title: z.string().min(1, "Nom requis").max(200),
  description: z.string().max(4000).nullable().optional(),
  featured_image: z.string().max(500).nullable().optional(),
  allergens: z.string().max(1000).nullable().optional(),
  precision: z.string().max(200).nullable().optional(),
  is_active: z.boolean().default(true),
});

export const menuCatalogProductSchema = menuCatalogProductBaseSchema;
export const menuCatalogProductUpdateSchema = menuCatalogProductBaseSchema.partial();

export type MenuCatalogProductInput = z.infer<typeof menuCatalogProductSchema>;
export type MenuCatalogProductUpdateInput = z.infer<
  typeof menuCatalogProductUpdateSchema
>;
