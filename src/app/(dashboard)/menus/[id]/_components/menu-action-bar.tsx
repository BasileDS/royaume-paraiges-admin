"use client";

import Link from "next/link";
import { FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MenuActionBarProps {
  addProductHref: string;
  onAddCategory: () => void;
}

/**
 * Barre d'actions fixée en bas de l'écran sur téléphone : les deux créations
 * restent sous le pouce quelle que soit la position dans la carte. Au-delà de
 * `md`, ce sont les boutons de l'en-tête qui servent.
 */
export function MenuActionBar({ addProductHref, onAddCategory }: MenuActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t bg-background/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:hidden">
      <Button
        type="button"
        variant="outline"
        className="h-12 flex-1 text-base"
        onClick={onAddCategory}
      >
        <FolderPlus className="mr-2 h-5 w-5" aria-hidden="true" />
        Catégorie
      </Button>
      <Button asChild className="h-12 flex-[1.4] text-base">
        <Link href={addProductHref}>
          <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
          Produit
        </Link>
      </Button>
    </div>
  );
}
