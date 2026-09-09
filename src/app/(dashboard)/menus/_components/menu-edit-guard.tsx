"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useMenuAccess } from "../_lib/access";

interface MenuEditGuardProps {
  establishmentId: number;
  children: React.ReactNode;
}

/**
 * Enveloppe les écrans d'édition d'une carte (formulaire produit) : rend ses
 * enfants si l'admin peut écrire sur cet établissement, sinon explique la
 * règle et renvoie vers la carte. La RLS refuserait de toute façon (migrations
 * 109 + 113), mais mieux vaut ne pas laisser remplir un formulaire qui
 * n'aboutira pas.
 */
export function MenuEditGuard({ establishmentId, children }: MenuEditGuardProps) {
  const access = useMenuAccess(establishmentId);

  if (access.isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-muted h-9 w-64 animate-pulse rounded" />
        <div className="bg-muted h-96 w-full animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!access.canEdit) {
    return (
      <EmptyState
        icon={Lock}
        title="Carte en lecture seule"
        description={
          access.attachedEstablishmentId !== null
            ? "Vous ne pouvez modifier que les cartes de votre établissement de référence et de son groupe."
            : "Votre compte n'est rattaché à aucun établissement : demandez à un super admin de le rattacher pour modifier une carte."
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/menus/${establishmentId}`}>Voir cette carte</Link>
            </Button>
            {access.attachedEstablishmentId !== null && (
              <Button asChild>
                <Link href={`/menus/${access.attachedEstablishmentId}`}>Ouvrir ma carte</Link>
              </Button>
            )}
          </div>
        }
      />
    );
  }

  return <>{children}</>;
}
