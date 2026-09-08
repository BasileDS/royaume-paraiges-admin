"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MenuSection } from "@/types/database";

interface SectionGroupProps {
  section: MenuSection;
  /** Nombre de catégories affichées dans le chapitre. */
  count: number;
  onOpenSection: (section: MenuSection) => void;
  onEditSection: (section: MenuSection) => void;
  onDeleteSection: (section: MenuSection) => void;
  children: React.ReactNode;
}

/**
 * Un chapitre de la carte (migration 107) : son en-tête, puis ses catégories
 * telles quelles, retenues par un filet à gauche. Pas de carte englobante :
 * les catégories gardent leur ancre et leur place dans la barre de navigation.
 */
export function SectionGroup({
  section,
  count,
  onOpenSection,
  onEditSection,
  onDeleteSection,
  children,
}: SectionGroupProps) {
  const titleId = `sec-${section.id}-title`;
  return (
    <section aria-labelledby={titleId} className="space-y-3">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => onOpenSection(section)}
          aria-haspopup="dialog"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-left transition-colors active:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted/60 md:hover:bg-muted/40"
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Chapitre
          </span>
          <span id={titleId} className="truncate text-base font-semibold leading-tight">
            {section.title}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {count} catégorie{count > 1 ? "s" : ""}
          </span>
          <MoreHorizontal
            className="ml-auto h-5 w-5 shrink-0 text-muted-foreground/70 md:hidden"
            aria-hidden="true"
          />
        </button>

        <div className="hidden items-center gap-0.5 md:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label={`Modifier le chapitre ${section.title}`}
            onClick={() => onEditSection(section)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label={`Dissoudre le chapitre ${section.title}`}
            onClick={() => onDeleteSection(section)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-4 border-l-2 border-border pl-3">{children}</div>
    </section>
  );
}
