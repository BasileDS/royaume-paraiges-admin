"use client";

import Link from "next/link";
import { ExternalLink, Settings2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { LinkQrCode } from "@/components/link-qr-code";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildShortUrl } from "@/lib/services/redirectLinkService";
import type { RedirectLink } from "@/types/database";

interface MenuQrSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  establishmentTitle: string;
  /** Lien court dont la cible est la carte publique de l'établissement. */
  link: RedirectLink;
}

/**
 * QR code de la carte d'un établissement, à visualiser et télécharger sans
 * quitter `/menus`. Le QR encode le lien court géré dans `/links` : un lien
 * inactif renvoie vers `auxparaiges.fr`, le code imprimé reste le même.
 */
export function MenuQrSheet({
  open,
  onOpenChange,
  establishmentTitle,
  link,
}: MenuQrSheetProps) {
  const shortUrl = buildShortUrl(link.slug);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`QR code · ${establishmentTitle}`}
      description={
        <a
          href={shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 break-all underline-offset-4 hover:underline"
        >
          {shortUrl}
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
        </a>
      }
      footer={
        <Button variant="outline" className="w-full" asChild>
          <Link href={`/links/${link.id}`}>
            <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Gérer le lien court
          </Link>
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        <LinkQrCode slug={link.slug} />

        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Lien court</span>
          <StatusBadge
            status={link.is_active ? "active" : "inactive"}
            label={link.is_active ? "Actif" : "Inactif"}
            tone={link.is_active ? "success" : "warning"}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {link.is_active ? (
            <>
              Le QR code encode l&apos;URL courte : la destination reste
              modifiable après impression.
            </>
          ) : (
            <>
              Tant que le lien est inactif, ce QR code renvoie vers{" "}
              <span className="font-mono">auxparaiges.fr</span>. Activez-le
              une fois la carte saisie.
            </>
          )}
        </p>
      </div>
    </BottomSheet>
  );
}
