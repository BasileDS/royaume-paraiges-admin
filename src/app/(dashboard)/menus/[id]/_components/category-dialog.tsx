"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
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
import {
  createMenuCategory,
  createMenuSection,
  updateMenuCategory,
  describeMenuError,
} from "@/lib/services/menuService";
import { menuKeys } from "@/lib/queries/keys";
import type { MenuCategory, MenuSection } from "@/types/database";

/** Valeur du sélecteur de chapitre qui ouvre la saisie d'un nouveau titre. */
const NEW_SECTION = "__new__";

const formSchema = z
  .object({
    title: z.string().min(1, "Titre requis").max(120),
    parent_id: z.string(),
    section_id: z.string(),
    new_section_title: z.string().max(120),
    description: z.string().max(2000),
    position: z.string().refine(
      (v) => v.trim() === "" || Number.isInteger(Number(v)),
      "Position invalide",
    ),
    is_active: z.boolean(),
  })
  .refine((v) => v.section_id !== NEW_SECTION || v.new_section_title.trim().length > 0, {
    message: "Titre du chapitre requis",
    path: ["new_section_title"],
  });

type FormInput = z.infer<typeof formSchema>;

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  establishmentId: number;
  /** Toutes les catégories de l'établissement, pour le choix du parent. */
  categories: MenuCategory[];
  /** Les chapitres de l'établissement, pour le rattachement d'une racine. */
  sections: MenuSection[];
  /** Absent = création. */
  category?: MenuCategory;
}

/**
 * Création et édition d'une catégorie. Feuille en bas de l'écran sur
 * téléphone, dialog centré au-delà (`BottomSheet` gère les deux).
 */
export function CategoryDialog({
  open,
  onOpenChange,
  establishmentId,
  categories,
  sections,
  category,
}: CategoryDialogProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(category);

  const form = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    // Le composant est monté à l'ouverture et démonté à la fermeture (cf. la
    // page qui le rend conditionnellement) : les valeurs par défaut suffisent,
    // pas d'effet de resynchronisation, donc pas de setState dans un effet.
    defaultValues: {
      title: category?.title ?? "",
      parent_id: category?.parent_id ? String(category.parent_id) : "",
      section_id: category?.section_id ? String(category.section_id) : "",
      new_section_title: "",
      description: category?.description ?? "",
      position: String(category?.position ?? 0),
      is_active: category?.is_active ?? true,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = form;

  /**
   * Les parents possibles sont les seules catégories racines, et jamais
   * soi-même : la hiérarchie est bornée à deux niveaux par le trigger
   * `trg_menu_categories_depth`.
   */
  const possibleParents = categories.filter(
    (c) => c.parent_id === null && c.id !== category?.id,
  );

  /** Une catégorie qui a des enfants ne peut pas devenir elle-même une sous-catégorie. */
  const hasChildren = categories.some((c) => c.parent_id === category?.id);

  // Une sous-catégorie suit le chapitre de son parent : le trigger
  // `trg_menu_categories_section` refuse un chapitre posé dessus, le sélecteur
  // se désactive donc dès qu'un parent est choisi.
  const parentId = useWatch({ control, name: "parent_id" });
  const sectionChoice = useWatch({ control, name: "section_id" });
  const isChild = parentId !== "";

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      // Le chapitre est créé avant la catégorie : s'il échoue, rien n'est écrit.
      let sectionId: number | null = null;
      if (!values.parent_id) {
        if (values.section_id === NEW_SECTION) {
          const created = await createMenuSection({
            establishment_id: establishmentId,
            title: values.new_section_title.trim(),
          });
          sectionId = created.id;
        } else if (values.section_id) {
          sectionId = Number(values.section_id);
        }
      }
      const payload = {
        title: values.title.trim(),
        parent_id: values.parent_id ? Number(values.parent_id) : null,
        section_id: sectionId,
        description: values.description.trim() || null,
        position: values.position.trim() === "" ? 0 : Number(values.position),
        is_active: values.is_active,
      };
      if (category) {
        await updateMenuCategory(category.id, payload);
        toast.success("Catégorie enregistrée");
      } else {
        await createMenuCategory({ establishment_id: establishmentId, ...payload });
        toast.success("Catégorie créée");
      }
      queryClient.invalidateQueries({ queryKey: menuKeys.all });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setServerError(describeMenuError(err));
    }
  });

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Modifier la catégorie" : "Nouvelle catégorie"}
      description="Une catégorie peut n'être qu'un bloc de texte : sans produit mais avec une description, elle s'affiche comme une section rédigée de la carte."
    >
      <form onSubmit={submit} className="space-y-4 pt-1">
        <div>
          <Label htmlFor="cat-title">Titre</Label>
          <Input
            id="cat-title"
            className="mt-1.5 h-11 md:h-10"
            {...register("title")}
            placeholder="Pressions"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="cat-parent">Catégorie parente</Label>
          <Controller
            control={control}
            name="parent_id"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                disabled={hasChildren}
              >
                <SelectTrigger id="cat-parent" className="mt-1.5 h-11 md:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune : catégorie racine</SelectItem>
                  {possibleParents.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {hasChildren
              ? "Cette catégorie a des sous-catégories : elle doit rester à la racine."
              : "Deux niveaux au plus : une sous-catégorie ne peut pas en contenir d'autres."}
          </p>
        </div>

        <div>
          <Label htmlFor="cat-section">Chapitre</Label>
          <Controller
            control={control}
            name="section_id"
            render={({ field }) => (
              <Select
                value={isChild ? "none" : field.value || "none"}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                disabled={isChild}
              >
                <SelectTrigger id="cat-section" className="mt-1.5 h-11 md:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun : à plat sur la carte</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.title}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_SECTION}>Nouveau chapitre…</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {!isChild && sectionChoice === NEW_SECTION && (
            <>
              <Input
                className="mt-2 h-11 md:h-10"
                {...register("new_section_title")}
                placeholder="Titre du chapitre, par exemple « Les Cocktails »"
                aria-label="Titre du nouveau chapitre"
                autoFocus
              />
              {errors.new_section_title && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.new_section_title.message}
                </p>
              )}
            </>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {isChild
              ? "Une sous-catégorie suit le chapitre de son parent."
              : "Un chapitre rassemble plusieurs catégories sous un même accordéon, à la place de la première d'entre elles."}
          </p>
        </div>

        <div>
          <Label htmlFor="cat-description">Description</Label>
          <Textarea
            id="cat-description"
            className="mt-1.5"
            rows={3}
            {...register("description")}
          />
        </div>

        <div className="flex items-end gap-6">
          <div className="w-28">
            <Label htmlFor="cat-position">Position</Label>
            <Input
              id="cat-position"
              className="mt-1.5 h-11 md:h-10"
              {...register("position")}
              inputMode="numeric"
            />
            {errors.position && (
              <p className="mt-1 text-xs text-destructive">{errors.position.message}</p>
            )}
          </div>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex h-11 items-center gap-3 text-sm md:h-10">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                <span>Visible sur la carte</span>
              </label>
            )}
          />
        </div>

        {serverError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <div className="flex gap-2 pt-2 md:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 md:h-10 md:flex-none"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button type="submit" className="h-11 flex-[1.5] md:h-10 md:flex-none" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
