"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UtensilsCrossed, Lock } from "lucide-react";
import {
  findMenuRedirectLink,
  getEstablishmentMenuSummaries,
} from "@/lib/services/menuService";
import { getRedirectLinks } from "@/lib/services/redirectLinkService";
import { menuKeys, redirectLinkKeys } from "@/lib/queries/keys";
import { useMenuAccess } from "./_lib/access";
import { EstablishmentMenuCard } from "./_components/establishment-menu-card";
import { MenuQrSheet } from "./_components/menu-qr-sheet";

const SKELETON_COUNT = 6;

export default function MenusPage() {
  // Un admin ne modifie que la carte de son établissement de rattachement
  // (migration 109) : on la met en tête et on signale les autres en lecture seule.
  const access = useMenuAccess();
  const mine = access.attachedEstablishmentId;

  const summariesQuery = useQuery({
    queryKey: menuKeys.summaries(),
    queryFn: getEstablishmentMenuSummaries,
  });

  // Les liens courts que les QR codes des tables encodent : un par carte,
  // rapproché par sa cible (aucune FK vers les établissements).
  const linksQuery = useQuery({
    queryKey: redirectLinkKeys.lists(),
    queryFn: getRedirectLinks,
  });

  const rows = useMemo(() => {
    const list = summariesQuery.data ?? [];
    if (mine === null) return list;
    // Tri stable : l'ordre alphabétique du service est conservé derrière.
    return [...list].sort(
      (a, b) => Number(b.establishment_id === mine) - Number(a.establishment_id === mine),
    );
  }, [summariesQuery.data, mine]);

  const mineTitle = rows.find((r) => r.establishment_id === mine)?.establishment_title;

  // Établissement dont le QR code est ouvert. On garde le dernier affiché
  // pendant l'animation de fermeture (dérivé en rendu, pas dans un effet).
  const [qrEstablishmentId, setQrEstablishmentId] = useState<number | null>(null);
  const [displayedQrId, setDisplayedQrId] = useState<number | null>(null);
  if (qrEstablishmentId !== null && qrEstablishmentId !== displayedQrId) {
    setDisplayedQrId(qrEstablishmentId);
  }
  const qrRow = rows.find((r) => r.establishment_id === displayedQrId) ?? null;
  const qrLink = qrRow ? findMenuRedirectLink(linksQuery.data ?? [], qrRow.slug) : null;

  const loading = summariesQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartes & menus"
        description="La carte de chaque établissement, telle que la voient les clients à table."
      />

      {!access.isLoading && !access.isSuperAdmin && (
        <p className="text-muted-foreground flex items-start gap-2 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {mine !== null ? (
            <span>
              Vous pouvez modifier la carte de <strong>{mineTitle ?? "votre établissement"}</strong>.
              Les autres cartes s&apos;ouvrent en lecture seule.
            </span>
          ) : (
            <span>
              Votre compte n&apos;est rattaché à aucun établissement : les cartes
              s&apos;ouvrent en lecture seule. Demandez à un super admin de le
              rattacher pour en modifier une.
            </span>
          )}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="flex items-center gap-3 p-4">
                <div className="bg-muted h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="bg-muted h-4 w-2/3 rounded" />
                  <div className="bg-muted h-3 w-1/2 rounded" />
                </div>
              </div>
              <div className="border-t px-4 py-3">
                <div className="bg-muted ml-auto h-3 w-24 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={UtensilsCrossed}
            title="Aucun établissement"
            description="Les cartes se rattachent aux établissements du Royaume."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <EstablishmentMenuCard
              key={r.establishment_id}
              summary={r}
              link={findMenuRedirectLink(linksQuery.data ?? [], r.slug)}
              isMine={r.establishment_id === mine}
              readOnly={!access.isLoading && !access.isSuperAdmin && r.establishment_id !== mine}
              onShowQr={() => setQrEstablishmentId(r.establishment_id)}
            />
          ))}
        </div>
      )}

      {qrRow && qrLink && (
        <MenuQrSheet
          open={qrEstablishmentId !== null}
          onOpenChange={(open) => {
            if (!open) setQrEstablishmentId(null);
          }}
          establishmentTitle={qrRow.establishment_title}
          link={qrLink}
        />
      )}

    </div>
  );
}
