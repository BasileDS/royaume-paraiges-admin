"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { MenuEditGuard } from "../../../_components/menu-edit-guard";
import { MenuItemForm } from "../../_form/MenuItemForm";

function NewMenuItemContent() {
  const { id } = useParams<{ id: string }>();
  const establishmentId = Number(id);

  // `?category=<id>` : arrivée depuis la fiche d'une catégorie, qui pré-remplit
  // le placement. Toute autre valeur est ignorée.
  const searchParams = useSearchParams();
  const rawCategory = searchParams.get("category");
  const defaultCategoryId =
    rawCategory && /^\d+$/.test(rawCategory) ? Number(rawCategory) : undefined;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/menus/${establishmentId}`}>
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Retour à la carte
        </Link>
      </Button>

      {/* Un admin n'ajoute un produit qu'à la carte de son établissement (migration 109). */}
      <MenuEditGuard establishmentId={establishmentId}>
        <PageHeader
          title="Ajouter un produit"
          description="Une bière ou un soft du catalogue partagé, ou un produit propre à cet établissement."
        />

        <MenuItemForm establishmentId={establishmentId} defaultCategoryId={defaultCategoryId} />
      </MenuEditGuard>
    </div>
  );
}

export default function NewMenuItemPage() {
  // Suspense requis : le composant lit useSearchParams.
  return (
    <Suspense fallback={null}>
      <NewMenuItemContent />
    </Suspense>
  );
}
