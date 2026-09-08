"use client";

import { useCurrentAdmin } from "@/components/providers/CurrentAdminProvider";

/**
 * Ce que l'admin connecté peut faire sur les cartes (migration 109).
 *
 * Un admin ne modifie que la carte de son établissement de rattachement
 * (`profiles.attached_establishment_id`) ; un super admin les modifie toutes ;
 * les autres cartes restent consultables en lecture seule. La règle est
 * appliquée en RLS, ce hook ne sert qu'à ne pas proposer des gestes qui
 * échoueraient.
 */
export interface MenuAccess {
  /** L'admin peut écrire sur la carte de l'établissement demandé. */
  canEdit: boolean;
  /** Profil pas encore chargé : ne pas trancher entre lecture et édition. */
  isLoading: boolean;
  isSuperAdmin: boolean;
  /** Établissement de rattachement, `null` pour un compte sans rattachement. */
  attachedEstablishmentId: number | null;
}

export function useMenuAccess(establishmentId?: number): MenuAccess {
  const { profile, isSuperAdmin, isLoading } = useCurrentAdmin();
  const attachedEstablishmentId = profile?.attached_establishment_id ?? null;

  const canEdit =
    !isLoading &&
    profile !== null &&
    (isSuperAdmin ||
      (establishmentId !== undefined &&
        attachedEstablishmentId !== null &&
        attachedEstablishmentId === establishmentId));

  return { canEdit, isLoading, isSuperAdmin, attachedEstablishmentId };
}
