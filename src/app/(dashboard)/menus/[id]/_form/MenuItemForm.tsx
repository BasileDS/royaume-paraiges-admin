"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Beer, Package, PenLine } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { menuKeys } from "@/lib/queries/keys";
import {
  createMenuItem,
  updateMenuItem,
  getMenuItemTypes,
  getMenuCatalogProducts,
  getMenuCategories,
  getUsedCatalogSources,
  describeMenuError,
} from "@/lib/services/menuService";
import { getBeers } from "@/lib/services/contentService";
import type { MenuItemWithDetails } from "@/types/database";
import { formatPriceInput, parsePriceInput, priceInputSchema } from "../_lib/price";

/**
 * Le formulaire travaille en chaînes : les inputs HTML ne rendent que ça, et la
 * conversion vers les types du service se fait au submit. Le prix est saisi en
 * euros avec virgule ou point, vide = prix non communiqué (NULL en base, « — »
 * sur la carte), ce qui est distinct de zéro.
 */
const variantSchema = z.object({
  label: z
    .string()
    .max(60)
    .refine(
      (v) => !/happy\s*hour/i.test(v),
      "Ne pas écrire « happy hour » ici : utiliser l'interrupteur",
    ),
  price: priceInputSchema,
  is_happy_hour: z.boolean(),
});

const formSchema = z.object({
  source: z.enum(["beer", "catalog", "private"]),
  beer_id: z.string(),
  catalog_product_id: z.string(),
  title: z.string().max(200),
  item_type_id: z.string().min(1, "Famille requise"),
  category_id: z.string(),
  description: z.string().max(4000),
  precision: z.string().max(200),
  allergens: z.string().max(1000),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  variants: z.array(variantSchema),
});

type FormInput = z.infer<typeof formSchema>;

const BEER_TYPES = ["biere", "cidre"];

/** Bloc du formulaire : marges resserrées sur téléphone, où chaque bord compte. */
function FormSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  const hasHeader = Boolean(title || description);
  return (
    <Card>
      {hasHeader && (
        <CardHeader className="p-4 md:p-6">
          {title && <CardTitle className="text-lg md:text-2xl">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className={cn("space-y-4 p-4 md:p-6", hasHeader && "pt-0 md:pt-0")}>
        {children}
      </CardContent>
    </Card>
  );
}

interface MenuItemFormProps {
  establishmentId: number;
  item?: MenuItemWithDetails;
  /** Catégorie pré-sélectionnée à la création (arrivée depuis la fiche d'une catégorie). */
  defaultCategoryId?: number;
}

/** Formulaire partagé création + édition d'un produit de carte. */
export function MenuItemForm({ establishmentId, item, defaultCategoryId }: MenuItemFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(item);

  const typesQuery = useQuery({
    queryKey: menuKeys.itemTypes(),
    queryFn: getMenuItemTypes,
  });
  const catalogQuery = useQuery({
    queryKey: menuKeys.catalogProducts(),
    queryFn: getMenuCatalogProducts,
  });
  const categoriesQuery = useQuery({
    queryKey: menuKeys.categories(establishmentId),
    queryFn: () => getMenuCategories(establishmentId),
  });
  const beersQuery = useQuery({
    queryKey: ["beers", "list"],
    queryFn: getBeers,
    enabled: !isEdit,
  });
  const usedQuery = useQuery({
    queryKey: menuKeys.usedSources(establishmentId),
    queryFn: () => getUsedCatalogSources(establishmentId),
    enabled: !isEdit,
  });

  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: item?.source ?? "private",
      beer_id: item?.beer_id ? String(item.beer_id) : "",
      catalog_product_id: item?.catalog_product_id
        ? String(item.catalog_product_id)
        : "",
      title: item?.title ?? "",
      item_type_id: item ? String(item.item_type_id) : "",
      category_id: item
        ? item.category_id
          ? String(item.category_id)
          : ""
        : defaultCategoryId
          ? String(defaultCategoryId)
          : "",
      description: item?.description ?? "",
      precision: item?.precision ?? "",
      allergens: item?.allergens ?? "",
      is_active: item?.is_active ?? true,
      is_featured: item?.is_featured ?? false,
      variants:
        item?.variants.map((v) => ({
          label: v.label ?? "",
          price: formatPriceInput(v.price),
          is_happy_hour: v.is_happy_hour,
        })) ?? [{ label: "", price: "", is_happy_hour: false }],
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });
  const source = watch("source");

  const types = typesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const used = usedQuery.data;

  /** Les bières déjà à la carte sont retirées : l'index unique les refuserait. */
  const availableBeers = (beersQuery.data ?? []).filter(
    (b) => !used?.beerIds.has(b.id),
  );
  const availableCatalog = (catalogQuery.data ?? []).filter(
    (c) => !used?.catalogIds.has(c.id),
  );

  /**
   * Un item lié à une bière doit être de famille Bière ou Cidre : le trigger
   * `trg_menu_items_scope` le refuserait sinon. On restreint le sélecteur
   * plutôt que de laisser l'erreur remonter de la base.
   */
  const selectableTypes =
    source === "beer" ? types.filter((t) => BEER_TYPES.includes(t.slug)) : types;

  const submit = handleSubmit(async (values) => {
    setServerError(null);

    const variants = values.variants
      .filter((v) => v.label.trim() !== "" || v.price.trim() !== "")
      .map((v, n) => ({
        label: v.label.trim() || null,
        price: parsePriceInput(v.price),
        is_happy_hour: v.is_happy_hour,
        position: n + 1,
      }));

    const common = {
      item_type_id: Number(values.item_type_id),
      category_id: values.category_id ? Number(values.category_id) : null,
      description: values.description.trim() || null,
      precision: values.precision.trim() || null,
      allergens: values.allergens.trim() || null,
      is_active: values.is_active,
      is_featured: values.is_featured,
      variants,
    };

    try {
      if (item) {
        await updateMenuItem(item.id, {
          ...common,
          // Le titre local n'existe que pour un produit privé ; pour un item lié
          // il reste NULL, le catalogue faisant foi.
          title: item.source === "private" ? values.title.trim() : undefined,
        });
        toast.success("Produit enregistré");
      } else {
        await createMenuItem({
          establishment_id: establishmentId,
          ...common,
          position: 0,
          beer_id: values.source === "beer" ? Number(values.beer_id) : null,
          catalog_product_id:
            values.source === "catalog" ? Number(values.catalog_product_id) : null,
          title: values.source === "private" ? values.title.trim() : null,
        });
        toast.success("Produit ajouté à la carte");
      }
      queryClient.invalidateQueries({ queryKey: menuKeys.all });
      router.push(`/menus/${establishmentId}`);
    } catch (err) {
      console.error(err);
      setServerError(describeMenuError(err));
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4 md:space-y-6">
      {/* -------------------------------------------------- Source */}
      {!isEdit && (
        <FormSection
          title="D'où vient ce produit ?"
          description="Une bière ou un soft du catalogue garde le nom, la description et l'image du catalogue : la carte n'ajoute que le prix, le format et le placement. Un produit propre à cet établissement porte son propre descriptif."
        >
          <Controller
            control={control}
            name="source"
            render={({ field }) => (
              <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
                {(
                  [
                    { value: "beer", label: "Bière du catalogue", icon: Beer },
                    {
                      value: "catalog",
                      label: "Soft du catalogue",
                      icon: Package,
                    },
                    {
                      value: "private",
                      label: "Produit de cet établissement",
                      icon: PenLine,
                    },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.icon;
                  const active = field.value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        field.onChange(opt.value);
                        setValue("item_type_id", "");
                      }}
                      aria-pressed={active}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-lg border p-3 text-left text-sm transition",
                        active
                          ? "border-primary bg-primary/5 font-medium"
                          : "active:bg-muted/60 md:hover:bg-muted/50",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          />

          {source === "beer" && (
            <div>
              <Label htmlFor="beer_id">Bière</Label>
              <Controller
                control={control}
                name="beer_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="beer_id" className="mt-1.5">
                      <SelectValue placeholder="Choisir une bière du catalogue" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBeers.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.title}
                          {b.abv ? ` · ${b.abv}%` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Les bières déjà à la carte de cet établissement ne sont pas
                proposées. Mettre une bière à la carte la rend automatiquement
                disponible dans l&apos;application des Compagnons.
              </p>
            </div>
          )}

          {source === "catalog" && (
            <div>
              <Label htmlFor="catalog_product_id">Produit partagé</Label>
              <Controller
                control={control}
                name="catalog_product_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="catalog_product_id" className="mt-1.5">
                      <SelectValue placeholder="Choisir un produit du catalogue" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCatalog.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
        </FormSection>
      )}

      {/* -------------------------------------------------- Descriptif */}
      <FormSection
        title="Descriptif"
        description={
          isEdit && item?.source !== "private"
            ? "Le nom vient du catalogue et n'est pas modifiable ici. La description, la précision et les allergènes saisis ci-dessous priment sur ceux du catalogue pour cet établissement."
            : undefined
        }
      >
        {source === "private" ? (
          <div>
            <Label htmlFor="title">Nom du produit</Label>
            <Input id="title" className="mt-1.5" {...register("title")} placeholder="Mojito" />
            {errors.title && (
              <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Sans la quantité : elle se déclare dans les formats plus bas.
            </p>
          </div>
        ) : (
          isEdit && (
            <div>
              <Label>Nom</Label>
              <p className="mt-1 font-medium">{item?.resolved_title}</p>
            </div>
          )
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="item_type_id">Famille</Label>
            <Controller
              control={control}
              name="item_type_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="item_type_id" className="mt-1.5">
                    <SelectValue placeholder="Choisir une famille" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableTypes.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.item_type_id && (
              <p className="mt-1 text-xs text-destructive">{errors.item_type_id.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category_id">Catégorie sur la carte</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                >
                  <SelectTrigger id="category_id" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune : disponible, hors carte</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.parent_id ? "— " : ""}
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Sans catégorie, le produit reste disponible mais ne figure pas sur
              la carte affichée.
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" className="mt-1.5" rows={3} {...register("description")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="precision">Précision</Label>
            <Input
              id="precision"
              className="mt-1.5"
              {...register("precision")}
              placeholder="2 pers., fait maison…"
            />
          </div>
          <div>
            <Label htmlFor="allergens">Allergènes</Label>
            <Input id="allergens" className="mt-1.5" {...register("allergens")} />
          </div>
        </div>
      </FormSection>

      {/* -------------------------------------------------- Formats */}
      <FormSection
        title="Formats et prix"
        description="Un format par ligne de prix sur la carte. Le libellé ne porte que la quantité (« 25 cl », « Bouteille 75 cl ») : le tarif happy hour se déclare avec l'interrupteur, jamais dans le texte. Laisser le prix vide affiche « — » sur la carte, ce qui n'est pas la gratuité."
      >
        <div className="space-y-3">
          {fields.map((field, index) => (
            // Sur téléphone, chaque format est un encart sur deux lignes ; à
            // partir de `sm`, `contents` aplatit les groupes en une seule ligne.
            <div
              key={field.id}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-3 sm:rounded-none sm:border-0 sm:p-0"
            >
              <div className="flex gap-2 sm:contents">
                <div className="min-w-0 flex-1 sm:min-w-[9rem]">
                  <Input
                    {...register(`variants.${index}.label`)}
                    placeholder="25 cl"
                    aria-label={`Format ${index + 1}`}
                  />
                  {errors.variants?.[index]?.label && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.variants[index]?.label?.message}
                    </p>
                  )}
                </div>
                <div className="relative w-28 shrink-0">
                  <Input
                    {...register(`variants.${index}.price`)}
                    placeholder="4,10"
                    inputMode="decimal"
                    className="pr-7 text-right tabular-nums"
                    aria-label={`Prix du format ${index + 1}`}
                  />
                  <span
                    className="pointer-events-none absolute right-3 top-0 flex h-10 items-center text-sm text-muted-foreground"
                    aria-hidden="true"
                  >
                    €
                  </span>
                  {errors.variants?.[index]?.price && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.variants[index]?.price?.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between sm:contents">
                <Controller
                  control={control}
                  name={`variants.${index}.is_happy_hour`}
                  render={({ field: hh }) => (
                    <label className="flex h-10 items-center gap-2 text-sm">
                      <Switch
                        checked={hh.value}
                        onCheckedChange={hh.onChange}
                        aria-label={`Tarif happy hour pour le format ${index + 1}`}
                      />
                      <span className="text-muted-foreground">Happy hour</span>
                    </label>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 gap-1.5 px-2 text-muted-foreground sm:w-10 sm:px-0"
                  aria-label={`Supprimer le format ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span className="sm:hidden">Retirer</span>
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 w-full sm:h-9 sm:w-auto"
            onClick={() => append({ label: "", price: "", is_happy_hour: false })}
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Ajouter un format
          </Button>
        </div>
      </FormSection>

      {/* -------------------------------------------------- Statut */}
      <FormSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex min-h-11 items-center gap-3">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span className="text-sm">
                  Disponible
                  <span className="block text-xs text-muted-foreground">
                    Décoché = à la carte mais en rupture
                  </span>
                </span>
              </label>
            )}
          />
          <Controller
            control={control}
            name="is_featured"
            render={({ field }) => (
              <label className="flex min-h-11 items-center gap-3">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span className="text-sm">
                  Coup de cœur
                  <span className="block text-xs text-muted-foreground">
                    Un seul par catégorie : le poser ici le retire du produit
                    qui l&apos;avait
                  </span>
                </span>
              </label>
            )}
          />
        </div>
      </FormSection>

      {serverError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* Sur téléphone, les actions restent collées en bas de l'écran pendant
          la saisie ; au-delà de `md`, elles reprennent leur place en fin de page. */}
      <div className="sticky bottom-0 z-20 -mx-4 flex gap-2 border-t bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:static md:mx-0 md:justify-end md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 md:h-10 md:flex-none"
          onClick={() => router.push(`/menus/${establishmentId}`)}
        >
          Annuler
        </Button>
        <Button type="submit" className="h-11 flex-[1.5] md:h-10 md:flex-none" disabled={isSubmitting}>
          {isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {isEdit ? "Enregistrer" : "Ajouter à la carte"}
        </Button>
      </div>
    </form>
  );
}
