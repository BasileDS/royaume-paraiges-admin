"use client";

import { useState } from "react";
import { Pencil, Ungroup } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import type { MenuSection } from "@/types/database";
import { ActionRow, RowGroup } from "./sheet-rows";

interface SectionActionsSheetProps {
  /** `null` = feuille fermée. */
  section: MenuSection | null;
  count: number;
  busy: boolean;
  onClose: () => void;
  onEdit: (section: MenuSection) => void;
  onDelete: (section: MenuSection) => void;
}

/** Fiche d'actions d'un chapitre, ouverte d'un tap sur son en-tête. */
export function SectionActionsSheet({
  section,
  count,
  busy,
  onClose,
  onEdit,
  onDelete,
}: SectionActionsSheetProps) {
  const [displayed, setDisplayed] = useState(section);
  if (section !== null && section !== displayed) setDisplayed(section);
  const shown = section ?? displayed;

  return (
    <BottomSheet
      open={section !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={shown?.title ?? ""}
      description={shown ? `Chapitre · ${count} catégorie${count > 1 ? "s" : ""}` : undefined}
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
              icon={Pencil}
              label="Modifier le chapitre"
              hint="Titre et phrase d'introduction"
              onClick={() => onEdit(shown)}
              chevron
            />
          </RowGroup>

          <RowGroup>
            <ActionRow
              icon={Ungroup}
              label="Dissoudre le chapitre"
              hint="Ses catégories restent sur la carte, à plat"
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
