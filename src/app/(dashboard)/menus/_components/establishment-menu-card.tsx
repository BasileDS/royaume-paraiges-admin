"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, ExternalLink, EyeOff, Lock, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getImageUrl } from "@/lib/services/contentService";
import { buildPublicMenuUrl } from "@/lib/services/menuService";
import { cn } from "@/lib/utils";
import type { EstablishmentMenuSummary, RedirectLink } from "@/types/database";

/** « 17:00:00 » -> « 17h00 ». Les colonnes BDD sont des `time` sans fuseau. */
function formatTime(t: string | null): string | null {
  if (!t) return null;
  const [h, m] = t.split(":");
  return `${h}h${m}`;
}

interface EstablishmentMenuCardProps {
  summary: EstablishmentMenuSummary;
  /** Lien court dont la cible est la carte publique, `null` si aucun n'existe. */
  link: RedirectLink | null;
  isMine: boolean;
  readOnly: boolean;
  onShowQr: () => void;
}

/**
 * Une carte par établissement sur `/menus`.
 *
 * Toute la carte ouvre l'édition (`/menus/[id]`) via un lien étiré ; les deux
 * icônes de l'en-tête passent au-dessus et gardent leur propre geste : ouvrir
 * la carte publique dans un nouvel onglet, et voir / télécharger le QR code
 * du lien court géré dans `/links`.
 */
export function EstablishmentMenuCard({
  summary: r,
  link,
  isMine,
  readOnly,
  onShowQr,
}: EstablishmentMenuCardProps) {
  // La carte publique se rend à partir de la première catégorie saisie ; avant,
  // le bouton n'ouvrirait qu'une page vide.
  const hasMenu = r.categories_count > 0 || r.items_count > 0;
  const publicUrl = buildPublicMenuUrl(r.slug);
  const logoUrl = getImageUrl(r.logo, { width: 96, height: 96 });

  return (
    <Card
      className={cn(
        "relative flex flex-col transition-colors hover:border-primary/50 focus-within:border-primary/50",
        isMine && "border-primary/40",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            className="bg-muted text-muted-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
            aria-hidden="true"
          >
            {r.establishment_title.charAt(0)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/menus/${r.establishment_id}`}
              className="font-semibold leading-tight after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
            >
              {r.establishment_title}
            </Link>
            {isMine && <Badge className="font-normal">Votre établissement</Badge>}
          </div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            <span className="font-mono">/{r.slug}</span>
            {r.city ? ` · ${r.city}` : ""}
            {readOnly && (
              <span className="inline-flex items-center gap-1">
                {" · "}
                <Lock className="h-3 w-3" aria-hidden="true" />
                lecture seule
              </span>
            )}
          </div>
        </div>

        {/* Au-dessus du lien étiré : ces gestes ne doivent pas ouvrir l'édition. */}
        <div className="relative z-10 -mr-2 -mt-2 flex shrink-0 items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={hasMenu ? -1 : 0}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Ouvrir la carte publique dans un nouvel onglet"
                  disabled={!hasMenu}
                  asChild={hasMenu}
                >
                  {hasMenu ? (
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {hasMenu ? "Ouvrir la carte publique" : "Carte non saisie : rien à afficher"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={link ? -1 : 0}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Voir et télécharger le QR code"
                  disabled={!link}
                  onClick={onShowQr}
                >
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {link
                ? "QR code de la carte"
                : "Aucun lien court ne cible cette carte (à créer dans Liens)"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t px-4 py-2.5 text-xs">
        {!hasMenu && <span>Carte vide</span>}
        {r.unplaced_count > 0 && (
          <Badge variant="outline" className="gap-1 font-normal">
            <EyeOff className="h-3 w-3" aria-hidden="true" />
            {r.unplaced_count} hors carte
          </Badge>
        )}
        {r.inactive_count > 0 && (
          <Badge variant="secondary" className="font-normal">
            {r.inactive_count} en rupture
          </Badge>
        )}
        {r.happy_hour_start && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Happy hour {formatTime(r.happy_hour_start)} - {formatTime(r.happy_hour_end)}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              link === null
                ? "bg-muted-foreground/40"
                : link.is_active
                  ? "bg-green-500"
                  : "bg-amber-500",
            )}
            aria-hidden="true"
          />
          {link === null
            ? "Aucun lien court"
            : link.is_active
              ? "Lien court actif"
              : "Lien court inactif"}
        </span>
      </div>
    </Card>
  );
}
