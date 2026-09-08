"use client";

import { useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { MenuCategory } from "@/types/database";
import { ActionRow, RowGroup } from "./sheet-rows";

interface CategoryActionsSheetProps {
  /** `null` = feuille fermée. */
  category: MenuCategory | null;
  /** URL du formulaire de création pré-rempli sur cette catégorie. */
  addProductHref: (categoryId: number) => string;
  busy: boolean;
  onClose: () => void;
  onEdit: (category: MenuCategory) => void;
  onToggleActive: (category: MenuCategory) => void;
  onDelete: (category: MenuCategory) => void;
}

/** Fiche d'actions d'une catégorie, ouverte d'un tap sur son en-tête. */
export function CategoryActionsSheet({
  category,
  addProductHref,
  busy,
  onClose,
  onEdit,
  onToggleActive,
  onDelete,
}: CategoryActionsSheetProps) {
  const [displayed, setDisplayed] = useState(category);
  if (category !== null && category !== displayed) setDisplayed(category);
  const shown = category ?? displayed;

  return (
    <BottomSheet
      open={category !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={shown?.title ?? ""}
      description={
        shown
          ? `${shown.parent_id ? "Sous-catégorie" : "Catégorie"} · ${
              shown.is_active ? "visible sur la carte" : "masquée sur la carte"
            }`
          : undefined
      }
    >
      {shown && (
        <div className="space-y-4">
          {shown.description && (
            <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
              {shown.description}
            </p>
          )}

          <RowGroup>
            <ActionRow
              icon={Plus}
              label="Ajouter un produit ici"
              hint="Le formulaire s'ouvre avec cette catégorie déjà choisie"
              href={addProductHref(shown.id)}
            />
            <ActionRow
              icon={Pencil}
              label="Modifier la catégorie"
              hint="Titre, description, position, catégorie parente"
              onClick={() => onEdit(shown)}
              chevron
            />
            <ActionRow
              icon={shown.is_active ? EyeOff : Eye}
              label={shown.is_active ? "Masquer sur la carte" : "Afficher sur la carte"}
              hint="Ses produits restent en place"
              onClick={() => onToggleActive(shown)}
              disabled={busy}
            />
          </RowGroup>

          <RowGroup>
            <ActionRow
              icon={Trash2}
              label="Supprimer la catégorie"
              hint="Ses produits redeviennent disponibles, hors carte"
              tone="destructive"
              onClick={() => onDelete(shown)}
              disabled={busy}
            />
          </RowGroup>
        </div>
      )}
    </BottomSheet>
  );
}
