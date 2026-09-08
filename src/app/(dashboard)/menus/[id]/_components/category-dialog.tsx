"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  updateMenuCategory,
  describeMenuError,
} from "@/lib/services/menuService";
import { menuKeys } from "@/lib/queries/keys";
import type { MenuCategory } from "@/types/database";

const formSchema = z.object({
  title: z.string().min(1, "Titre requis").max(120),
  parent_id: z.string(),
  description: z.string().max(2000),
  position: z.string().refine(
    (v) => v.trim() === "" || Number.isInteger(Number(v)),
    "Position invalide",
  ),
  is_active: z.boolean(),
});

type FormInput = z.infer<typeof formSchema>;

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  establishmentId: number;
  /** Toutes les catégories de l'établissement, pour le choix du parent. */
  categories: MenuCategory[];
  /** Absent = création. */
  category?: MenuCategory;
}

export function CategoryDialog({
  open,
  onOpenChange,
  establishmentId,
  categories,
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

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const payload = {
      title: values.title.trim(),
      parent_id: values.parent_id ? Number(values.parent_id) : null,
      description: values.description.trim() || null,
      position: values.position.trim() === "" ? 0 : Number(values.position),
      is_active: values.is_active,
    };
    try {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
          <DialogDescription>
            Une catégorie peut n&apos;être qu&apos;un bloc de texte : sans
            produit mais avec une description, elle s&apos;affiche comme une
            section rédigée de la carte.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="cat-title">Titre</Label>
            <Input id="cat-title" {...register("title")} placeholder="Pressions" />
            {errors.title && (
              <p className="text-destructive mt-1 text-xs">{errors.title.message}</p>
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
                  <SelectTrigger id="cat-parent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune — catégorie racine</SelectItem>
                    {possibleParents.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              {hasChildren
                ? "Cette catégorie a des sous-catégories : elle doit rester à la racine."
                : "Deux niveaux au plus : une sous-catégorie ne peut pas en contenir d'autres."}
            </p>
          </div>

          <div>
            <Label htmlFor="cat-description">Description</Label>
            <Textarea id="cat-description" rows={3} {...register("description")} />
          </div>

          <div className="flex items-end gap-6">
            <div className="w-28">
              <Label htmlFor="cat-position">Position</Label>
              <Input id="cat-position" {...register("position")} inputMode="numeric" />
              {errors.position && (
                <p className="text-destructive mt-1 text-xs">
                  {errors.position.message}
                </p>
              )}
            </div>
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <label className="flex h-9 items-center gap-2 text-sm">
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                  <span>Visible sur la carte</span>
                </label>
              )}
            />
          </div>

          {serverError && (
            <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
