"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Check,
  ChevronLeft,
  EyeOff,
  FolderInput,
  Loader2,
  Pencil,
} from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MenuItemVariantInput } from "@/lib/schemas/menu.schema";
import type { MenuCategory, MenuItemWithDetails } from "@/types/database";
import { ActionRow, RowGroup, ToggleRow } from "./sheet-rows";
import { HappyHourTag } from "./menu-item-row";
import { SOURCE_LABELS } from "../_lib/labels";
import { formatPriceInput, parsePriceInput, priceInputSchema } from "../_lib/price";

interface MenuItemSheetProps {
  /** `null` = feuille fermée. */
  item: MenuItemWithDetails | null;
  categories: MenuCategory[];
  /** Base de l'URL d'édition : `/menus/<establishmentId>/produit`. */
  editHref: string;
  busy: boolean;
  onClose: () => void;
  onToggleActive: (item: MenuItemWithDetails) => void;
  onToggleFeatured: (item: MenuItemWithDetails) => void;
  onUnplace: (item: MenuItemWithDetails) => void;
  onMove: (item: MenuItemWithDetails, categoryId: number | null) => void;
  onSavePrices: (item: MenuItemWithDetails, variants: MenuItemVariantInput[]) => Promise<void>;
}

/**
 * Fiche d'actions rapides d'un produit : tout ce qu'on fait en service depuis
 * un téléphone sans ouvrir le formulaire complet : disponibilité, coup de
 * cœur, prix, déplacement de catégorie, retrait de la carte.
 */
export function MenuItemSheet(props: MenuItemSheetProps) {
  const { item, onClose } = props;

  // Le dernier produit affiché reste rendu le temps de l'animation de fermeture,
  // sinon la feuille se viderait avant d'avoir glissé.
  const [displayed, setDisplayed] = useState(item);
  if (item !== null && item !== displayed) setDisplayed(item);
  const shown = item ?? displayed;

  return (
    <BottomSheet
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={shown?.resolved_title ?? ""}
      description={shown ? `${shown.type_label} · ${SOURCE_LABELS[shown.source]}` : undefined}
    >
      {shown && <SheetBody key={shown.id} {...props} item={shown} />}
    </BottomSheet>
  );
}

// ============================================================================
// Corps : vue principale ou choix de la catégorie
// ============================================================================

type SheetBodyProps = Omit<MenuItemSheetProps, "item"> & { item: MenuItemWithDetails };

function SheetBody({
  item,
  categories,
  editHref,
  busy,
  onToggleActive,
  onToggleFeatured,
  onUnplace,
  onMove,
  onSavePrices,
}: SheetBodyProps) {
  const [view, setView] = useState<"main" | "move">("main");
  const currentCategory = categories.find((c) => c.id === item.category_id);
  const placed = item.category_id !== null;

  if (view === "move") {
    return (
      <CategoryPicker
        categories={categories}
        current={item.category_id}
        busy={busy}
        onBack={() => setView("main")}
        onPick={(categoryId) => onMove(item, categoryId)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {item.description && (
        <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
      )}

      <RowGroup>
        <ToggleRow
          label="Disponible"
          hint="Décoché = à la carte mais en rupture"
          checked={item.is_active}
          onCheckedChange={() => onToggleActive(item)}
          disabled={busy}
        />
        {(placed || item.is_featured) && (
          <ToggleRow
            label="Coup de cœur"
            hint="Un seul par catégorie : le poser ici le retire du produit qui l'avait"
            checked={item.is_featured}
            onCheckedChange={() => onToggleFeatured(item)}
            disabled={busy}
          />
        )}
      </RowGroup>

      <PriceQuickForm
        // Les identifiants de formats changent à chaque enregistrement : la clé
        // remonte le formulaire à neuf dès que la carte est rafraîchie.
        key={item.variants.map((v) => `${v.id}:${v.price ?? ""}`).join("|")}
        item={item}
        editHref={editHref}
        busy={busy}
        onSave={onSavePrices}
      />

      <RowGroup>
        <ActionRow
          icon={Pencil}
          label="Modifier la fiche complète"
          hint="Descriptif, famille, formats, allergènes, suppression"
          href={`${editHref}/${item.id}`}
        />
        <ActionRow
          icon={FolderInput}
          label={placed ? "Changer de catégorie" : "Placer sur la carte"}
          hint={placed ? `Actuellement dans « ${currentCategory?.title ?? "?"} »` : "Disponible mais hors carte pour l'instant"}
          onClick={() => setView("move")}
          disabled={busy}
          chevron
        />
        {placed && (
          <ActionRow
            icon={EyeOff}
            label="Retirer de la carte"
            hint={
              item.source === "beer"
                ? "Reste disponible dans l'application des Compagnons"
                : "Reste disponible, disparaît de la carte affichée"
            }
            onClick={() => onUnplace(item)}
            disabled={busy}
          />
        )}
      </RowGroup>
    </div>
  );
}

// ============================================================================
// Prix : modification rapide, sans passer par le formulaire complet
// ============================================================================

const pricesFormSchema = z.object({
  prices: z.array(z.object({ price: priceInputSchema })),
});
type PricesFormInput = z.infer<typeof pricesFormSchema>;

interface PriceQuickFormProps {
  item: MenuItemWithDetails;
  editHref: string;
  busy: boolean;
  onSave: (item: MenuItemWithDetails, variants: MenuItemVariantInput[]) => Promise<void>;
}

function PriceQuickForm({ item, editHref, busy, onSave }: PriceQuickFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PricesFormInput>({
    resolver: zodResolver(pricesFormSchema),
    defaultValues: {
      prices: item.variants.map((v) => ({ price: formatPriceInput(v.price) })),
    },
  });

  const submit = handleSubmit(async (values) => {
    // Seuls les prix bougent : libellés, happy hour et ordre sont repris tels quels.
    const variants: MenuItemVariantInput[] = item.variants.map((v, n) => ({
      label: v.label,
      price: parsePriceInput(values.prices[n]?.price ?? ""),
      is_happy_hour: v.is_happy_hour,
      position: n + 1,
    }));
    try {
      await onSave(item, variants);
      reset(values);
    } catch {
      // La page a déjà affiché l'erreur : la saisie reste en place pour corriger.
    }
  });

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-baseline justify-between px-4 pb-1 pt-3">
        <span className="text-sm font-medium">Formats et prix</span>
        {item.variants.length > 0 && (
          <span className="text-xs text-muted-foreground">en euros</span>
        )}
      </div>

      {item.variants.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">
          Aucun format tarifé : le produit n&apos;apparaît pas sur la carte publique.{" "}
          <Link href={`${editHref}/${item.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
            Ajouter un format
          </Link>
        </p>
      ) : (
        <form onSubmit={submit}>
          <div className="divide-y">
            {item.variants.map((v, n) => {
              const error = errors.prices?.[n]?.price?.message;
              return (
                <div key={v.id} className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor={`price-${v.id}`}
                      className="flex min-w-0 flex-1 items-center gap-2 text-sm"
                    >
                      <span className="truncate">{v.label ?? "Prix"}</span>
                      {v.is_happy_hour && <HappyHourTag />}
                    </label>
                    <div className="relative w-28 shrink-0">
                      <Input
                        id={`price-${v.id}`}
                        inputMode="decimal"
                        placeholder="—"
                        autoComplete="off"
                        className={cn(
                          "h-11 pr-7 text-right tabular-nums md:h-10",
                          error && "border-destructive",
                        )}
                        {...register(`prices.${n}.price`)}
                      />
                      <span
                        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                        aria-hidden="true"
                      >
                        €
                      </span>
                    </div>
                  </div>
                  {error && <p className="mt-1 text-right text-xs text-destructive">{error}</p>}
                </div>
              );
            })}
          </div>

          {isDirty && (
            <div className="flex gap-2 border-t bg-muted/30 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 md:h-10"
                onClick={() => reset()}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="h-11 flex-[1.5] md:h-10"
                disabled={isSubmitting || busy}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                Enregistrer les prix
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

// ============================================================================
// Choix de la catégorie
// ============================================================================

interface CategoryPickerProps {
  categories: MenuCategory[];
  current: number | null;
  busy: boolean;
  onBack: () => void;
  onPick: (categoryId: number | null) => void;
}

function CategoryPicker({ categories, current, busy, onBack, onPick }: CategoryPickerProps) {
  const roots = categories.filter((c) => c.parent_id === null);
  const options = roots.flatMap((root) => [
    { category: root, depth: 0 as const },
    ...categories
      .filter((c) => c.parent_id === root.id)
      .map((child) => ({ category: child, depth: 1 as const })),
  ]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex h-9 items-center gap-1 rounded-md px-1 text-sm text-muted-foreground transition-colors active:text-foreground md:hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Retour
      </button>

      <RowGroup>
        {options.map(({ category, depth }) => (
          <PickerOption
            key={category.id}
            label={category.title}
            hint={category.is_active ? undefined : "Catégorie masquée sur la carte"}
            depth={depth}
            selected={category.id === current}
            disabled={busy}
            onClick={() => onPick(category.id)}
          />
        ))}
        <PickerOption
          label="Hors carte"
          hint="Disponible, mais absent de la carte affichée"
          depth={0}
          selected={current === null}
          disabled={busy}
          onClick={() => onPick(null)}
        />
      </RowGroup>
    </div>
  );
}

interface PickerOptionProps {
  label: string;
  hint?: string;
  depth: 0 | 1;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}

function PickerOption({ label, hint, depth, selected, disabled, onClick }: PickerOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || selected}
      aria-pressed={selected}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors active:bg-muted/60 md:hover:bg-muted/40 disabled:opacity-100",
        depth > 0 && "pl-9",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className={cn("block", depth === 0 && "font-medium")}>{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      {selected && (
        <Check className="h-4 w-4 shrink-0 text-primary" aria-label="Catégorie actuelle" />
      )}
    </button>
  );
}
