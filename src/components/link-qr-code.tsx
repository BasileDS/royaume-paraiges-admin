"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildShortUrl } from "@/lib/services/redirectLinkService";
import { cn } from "@/lib/utils";

const PNG_SIZE = 1024;

interface LinkQrCodeProps {
  /** Slug du lien court : le QR encode `redirects.auxparaiges.fr/<slug>`. */
  slug: string;
  /** Taille du rendu à l'écran, en pixels (les exports ne dépendent pas de cette valeur). */
  size?: number;
  className?: string;
}

/**
 * QR code d'un lien court, téléchargeable en SVG (impression) et PNG.
 *
 * Partagé entre la fiche d'un lien (`/links/[id]`) et les cartes de `/menus` :
 * le QR encode toujours l'URL courte, jamais la cible, pour rester valable
 * après impression quand la destination change.
 */
export function LinkQrCode({ slug, size = 200, className }: LinkQrCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shortUrl = buildShortUrl(slug);

  const getSvgMarkup = (): string | null => {
    const svg = containerRef.current?.querySelector("svg");
    return svg ? new XMLSerializer().serializeToString(svg) : null;
  };

  const triggerDownload = (href: string, filename: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
  };

  const downloadSvg = () => {
    const markup = getSvgMarkup();
    if (!markup) return;
    const url = URL.createObjectURL(
      new Blob([markup], { type: "image/svg+xml" }),
    );
    triggerDownload(url, `qr-${slug}.svg`);
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    const markup = getSvgMarkup();
    if (!markup) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = PNG_SIZE;
      canvas.height = PNG_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, PNG_SIZE, PNG_SIZE);
      // Marge blanche autour du code pour une lecture fiable une fois imprimé
      const margin = PNG_SIZE / 16;
      ctx.drawImage(img, margin, margin, PNG_SIZE - 2 * margin, PNG_SIZE - 2 * margin);
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Erreur", { description: "Export PNG impossible" });
          return;
        }
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `qr-${slug}.png`);
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div ref={containerRef} className="rounded-xl bg-white p-4">
        <QRCodeSVG
          value={shortUrl}
          size={size}
          fgColor="#1a1208"
          bgColor="#FFFFFF"
          level="M"
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={downloadSvg}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          SVG
        </Button>
        <Button variant="outline" size="sm" onClick={downloadPng}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          PNG
        </Button>
      </div>
    </div>
  );
}
