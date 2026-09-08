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
  price: z
    .string()
    .refine(
      (v) => v.trim() === "" || !Number.isNaN(Number(v.replace(",", "."))),
      "Prix invalide",
    )
    .refine(
      (v) => v.trim() === "" || Number(v.replace(",", ".")) >= 0,
      "Prix négatif impossible",
    ),
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

interface MenuItemFormProps {
  establishmentId: number;
  item?: MenuItemWithDetails;
}

/** Formulaire partagé création + édition d'un produit de carte. */
export function MenuItemForm({ establishmentId, item }: MenuItemFormProps) {
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
      category_id: item?.category_id ? String(item.category_id) : "",
      description: item?.description ?? "",
      precision: item?.precision ?? "",
      allergens: item?.allergens ?? "",
      is_active: item?.is_active ?? true,
      is_featured: item?.is_featured ?? false,
      variants:
        item?.variants.map((v) => ({
          label: v.label ?? "",
          price: v.price === null ? "" : String(v.price).replace(".", ","),
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
        price: v.price.trim() === "" ? null : Number(v.price.replace(",", ".")),
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
    <form onSubmit={submit} className="space-y-6">
      {/* -------------------------------------------------- Source */}
      {!isEdit && (
        <Card>
          <CardHeader>
            <CardTitle>D&apos;où vient ce produit ?</CardTitle>
            <CardDescription>
              Une bière ou un soft du catalogue garde le nom, la description et
              l&apos;image du catalogue : la carte n&apos;ajoute que le prix, le
              format et le placement. Un produit propre à cet établissement porte
              son propre descriptif.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <div className="grid gap-3 sm:grid-cols-3">
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
                        className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition ${
                          active
                            ? "border-primary bg-primary/5 font-medium"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
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
                      <SelectTrigger id="beer_id">
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
                <p className="text-muted-foreground mt-1 text-xs">
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
                      <SelectTrigger id="catalog_product_id">
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
          </CardContent>
        </Card>
      )}

      {/* -------------------------------------------------- Descriptif */}
      <Card>
        <CardHeader>
          <CardTitle>Descriptif</CardTitle>
          {isEdit && item?.source !== "private" && (
            <CardDescription>
              Le nom vient du catalogue et n&apos;est pas modifiable ici. La
              description, la précision et les allergènes saisis ci-dessous
              priment sur ceux du catalogue pour cet établissement.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {source === "private" ? (
            <div>
              <Label htmlFor="title">Nom du produit</Label>
              <Input id="title" {...register("title")} placeholder="Mojito" />
              {errors.title && (
                <p className="text-destructive mt-1 text-xs">
                  {errors.title.message}
                </p>
              )}
              <p className="text-muted-foreground mt-1 text-xs">
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
                    <SelectTrigger id="item_type_id">
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
                <p className="text-destructive mt-1 text-xs">
                  {errors.item_type_id.message}
                </p>
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
                    <SelectTrigger id="category_id">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        Aucune — disponible, hors carte
                      </SelectItem>
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
              <p className="text-muted-foreground mt-1 text-xs">
                Sans catégorie, le produit reste disponible mais ne figure pas sur
                la carte affichée.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="precision">Précision</Label>
              <Input
                id="precision"
                {...register("precision")}
                placeholder="2 pers., fait maison…"
              />
            </div>
            <div>
              <Label htmlFor="allergens">Allergènes</Label>
              <Input id="allergens" {...register("allergens")} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------- Formats */}
      <Card>
        <CardHeader>
          <CardTitle>Formats et prix</CardTitle>
          <CardDescription>
            Un format par ligne de prix sur la carte. Le libellé ne porte que la
            quantité (« 25 cl », « Bouteille 75 cl ») : le tarif happy hour se
            déclare avec l&apos;interrupteur, jamais dans le texte. Laisser le
            prix vide affiche « — » sur la carte, ce qui n&apos;est pas la
            gratuité.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-wrap items-start gap-3">
              <div className="min-w-[9rem] flex-1">
                <Input
                  {...register(`variants.${index}.label`)}
                  placeholder="25 cl"
                  aria-label={`Format ${index + 1}`}
                />
                {errors.variants?.[index]?.label && (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.variants[index]?.label?.message}
                  </p>
                )}
              </div>
              <div className="w-28">
                <Input
                  {...register(`variants.${index}.price`)}
                  placeholder="4,10"
                  inputMode="decimal"
                  aria-label={`Prix du format ${index + 1}`}
                />
                {errors.variants?.[index]?.price && (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.variants[index]?.price?.message}
                  </p>
                )}
              </div>
              <Controller
                control={control}
                name={`variants.${index}.is_happy_hour`}
                render={({ field: hh }) => (
                  <label className="flex h-9 items-center gap-2 text-sm">
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
                size="icon"
                className="h-9 w-9"
                aria-label={`Supprimer le format ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ label: "", price: "", is_happy_hour: false })}
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Ajouter un format
          </Button>
        </CardContent>
      </Card>

      {/* -------------------------------------------------- Statut */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:gap-8">
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span className="text-sm">
                  Disponible
                  <span className="text-muted-foreground block text-xs">
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
              <label className="flex items-center gap-3">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span className="text-sm">
                  Coup de cœur
                  <span className="text-muted-foreground block text-xs">
                    Un seul par catégorie : le poser ici le retire du produit
                    qui l&apos;avait
                  </span>
                </span>
              </label>
            )}
          />
        </CardContent>
      </Card>

      {serverError && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
          {serverError}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/menus/${establishmentId}`)}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {isEdit ? "Enregistrer" : "Ajouter à la carte"}
        </Button>
      </div>
    </form>
  );
}
