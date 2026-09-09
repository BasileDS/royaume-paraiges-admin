"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentAdmin } from "@/components/providers/CurrentAdminProvider";
import { getEditableMenuEstablishments } from "@/lib/services/menuService";
import { menuKeys } from "@/lib/queries/keys";

/**
 * Ce que l'admin connecté peut faire sur les cartes (migrations 109 + 113).
 *
 * Un admin modifie la carte de son établissement de rattachement
 * (`profiles.attached_establishment_id`) et celles des établissements de son
 * groupe (`establishments.group_id`) ; un super admin les modifie toutes ;
 * les autres cartes restent consultables en lecture seule. La règle est
 * appliquée en RLS et le périmètre est calculé en base
 * (`admin_editable_menu_establishments`) : ce hook ne sert qu'à ne pas
 * proposer des gestes qui échoueraient, sans recalculer la règle ici.
 */
export interface MenuAccess {
  /** L'admin peut écrire sur la carte de l'établissement demandé. */
  canEdit: boolean;
  /** Profil ou périmètre pas encore chargés : ne pas trancher entre lecture et édition. */
  isLoading: boolean;
  isSuperAdmin: boolean;
  /** Établissement de rattachement, `null` pour un compte sans rattachement. */
  attachedEstablishmentId: number | null;
  /** Établissements dont la carte est modifiable (rattachement + groupe, ou tous). */
  editableEstablishmentIds: number[];
}

export function useMenuAccess(establishmentId?: number): MenuAccess {
  const { profile, isSuperAdmin, isLoading: adminLoading } = useCurrentAdmin();
  const attachedEstablishmentId = profile?.attached_establishment_id ?? null;

  const editableQuery = useQuery({
    queryKey: menuKeys.editable(),
    queryFn: getEditableMenuEstablishments,
    enabled: profile !== null,
    staleTime: 60_000,
  });

  const editableEstablishmentIds = useMemo(
    () => editableQuery.data ?? [],
    [editableQuery.data],
  );

  const isLoading = adminLoading || (profile !== null && editableQuery.isLoading);

  const canEdit =
    !isLoading &&
    profile !== null &&
    establishmentId !== undefined &&
    editableEstablishmentIds.includes(establishmentId);

  return {
    canEdit,
    isLoading,
    isSuperAdmin,
    attachedEstablishmentId,
    editableEstablishmentIds,
  };
}

/**
 * « la carte de X », « les cartes de X et Y », « les cartes de X, Y et Z » :
 * pour les bandeaux qui nomment le périmètre modifiable.
 */
export function formatEditableScope(titles: string[]): string {
  if (titles.length === 0) return "la carte de votre établissement";
  if (titles.length === 1) return `la carte de ${titles[0]}`;
  const head = titles.slice(0, -1).join(", ");
  return `les cartes de ${head} et ${titles[titles.length - 1]}`;
}
