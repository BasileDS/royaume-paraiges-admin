"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

/**
 * Feuille d'actions : glisse depuis le bas sur téléphone, dialog centré au-delà
 * de `md`. Même primitive Radix Dialog dans les deux cas (focus, échap,
 * overlay, verrou du scroll), seul l'habillage change.
 *
 * Sur mobile, la poignée et l'en-tête se tirent vers le bas pour fermer : le
 * geste natif attendu d'une feuille. Le corps défile indépendamment, le pied
 * reste collé au bas avec la marge de sécurité de l'appareil.
 */

const MOBILE_QUERY = "(max-width: 767px)";
/** Distance ou vitesse de glissement à partir desquelles la feuille se ferme. */
const DISMISS_DISTANCE_PX = 96;
const DISMISS_VELOCITY_PX_PER_MS = 0.6;

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Cache l'en-tête à l'écran : le titre reste annoncé aux lecteurs d'écran. */
  hideHeader?: boolean;
  children: React.ReactNode;
  /** Actions collées en bas, hors du défilement du corps. */
  footer?: React.ReactNode;
  /** Classes du panneau (largeur desktop, par exemple). */
  className?: string;
  /** Classes du corps défilant. */
  bodyClassName?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  hideHeader = false,
  children,
  footer,
  className,
  bodyClassName,
}: BottomSheetProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ startY: number; startTime: number; dy: number } | null>(
    null,
  );

  // ------------------------------------------------------------ glissement
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobile || e.button !== 0) return;
    dragRef.current = { startY: e.clientY, startTime: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    const el = contentRef.current;
    if (el) el.style.transition = "none";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = contentRef.current;
    if (!drag || !el) return;
    drag.dy = Math.max(0, e.clientY - drag.startY);
    el.style.transform = `translateY(${drag.dy}px)`;
  };

  const endDrag = () => {
    const drag = dragRef.current;
    const el = contentRef.current;
    dragRef.current = null;
    if (!drag || !el) return;

    const elapsed = Math.max(1, performance.now() - drag.startTime);
    const velocity = drag.dy / elapsed;
    const dismiss =
      drag.dy > DISMISS_DISTANCE_PX || velocity > DISMISS_VELOCITY_PX_PER_MS;

    el.style.transition = "transform 180ms ease-out";
    if (!dismiss) {
      el.style.transform = "";
      return;
    }
    // On termine le geste à la main puis on ferme sans l'animation de sortie
    // Radix : elle repartirait de la position d'origine et ferait sauter la
    // feuille avant de la faire glisser.
    el.dataset.dragClose = "true";
    el.style.transform = "translateY(100%)";
    window.setTimeout(() => onOpenChange(false), 170);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={contentRef}
          // Sans description, Radix avertit en console : on lui dit explicitement
          // qu'il n'y en a pas. Avec, on le laisse relier la sienne.
          {...(description ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={(e) => {
            // Sur téléphone, laisser Radix focaliser le premier champ ferait
            // surgir le clavier à l'ouverture : on focalise le panneau lui-même.
            if (!isMobile) return;
            e.preventDefault();
            contentRef.current?.focus();
          }}
          className={cn(
            "fixed z-50 flex flex-col bg-background text-foreground outline-none",
            isMobile
              ? "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom data-[state=open]:duration-300 data-[state=closed]:duration-200 data-[drag-close=true]:!animate-none"
              : "left-1/2 top-1/2 max-h-[85vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            className,
          )}
        >
          {/* Poignée + en-tête : zone de glissement sur mobile. */}
          <div
            className={cn("shrink-0 select-none", isMobile && "touch-none")}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {isMobile && (
              <div className="flex justify-center pb-1 pt-2.5" aria-hidden="true">
                <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              </div>
            )}
            <div
              className={cn(
                "px-5 pb-3 pr-14 md:px-6 md:pt-6",
                isMobile ? "pt-1" : "pt-6",
                hideHeader && "sr-only",
              )}
            >
              <DialogPrimitive.Title className="text-lg font-semibold leading-tight tracking-tight">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          </div>

          <DialogPrimitive.Close
            className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:right-4 md:top-4 md:h-8 md:w-8"
            aria-label="Fermer"
          >
            <X className="h-5 w-5 md:h-4 md:w-4" aria-hidden="true" />
          </DialogPrimitive.Close>

          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 md:px-6",
              footer
                ? "pb-4"
                : "pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-6",
              bodyClassName,
            )}
          >
            {children}
          </div>

          {footer && (
            <div className="shrink-0 border-t bg-background px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-6 md:pb-4">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
