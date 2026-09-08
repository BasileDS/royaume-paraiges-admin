"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import {
  createMenuSection,
  updateMenuSection,
  describeMenuError,
} from "@/lib/services/menuService";
import { menuKeys } from "@/lib/queries/keys";
import type { MenuSection } from "@/types/database";

const formSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(120),
  description: z.string().max(2000),
});

type FormInput = z.infer<typeof formSchema>;

interface SectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  establishmentId: number;
  /** Absent = création. */
  section?: MenuSection;
}

/**
 * Création et édition d'un chapitre de la carte (migration 107). Un chapitre
 * n'a ni position ni interrupteur de visibilité : il se place à l'emplacement
 * de sa première catégorie et disparaît avec sa dernière catégorie visible.
 * On le crée le plus souvent depuis la fiche d'une catégorie.
 */
export function SectionDialog({ open, onOpenChange, establishmentId, section }: SectionDialogProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = Boolean(section);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: section?.title ?? "",
      description: section?.description ?? "",
    },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    const payload = {
      title: values.title.trim(),
      description: values.description.trim() || null,
    };
    try {
      if (section) {
        await updateMenuSection(section.id, payload);
        toast.success("Chapitre enregistré");
      } else {
        await createMenuSection({ establishment_id: establishmentId, ...payload });
        toast.success("Chapitre créé");
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
      title={isEdit ? "Modifier le chapitre" : "Nouveau chapitre"}
      description="Un chapitre rassemble plusieurs catégories sous un même titre, en accordéon sur la carte. Il prend la place de sa première catégorie."
    >
      <form onSubmit={submit} className="space-y-4 pt-1">
        <div>
          <Label htmlFor="sec-title">Titre</Label>
          <Input
            id="sec-title"
            className="mt-1.5 h-11 md:h-10"
            {...register("title")}
            placeholder="Les Cocktails"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="sec-description">Phrase d&apos;introduction</Label>
          <Textarea
            id="sec-description"
            className="mt-1.5"
            rows={3}
            {...register("description")}
            placeholder="Facultative, affichée sous le titre du chapitre."
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
