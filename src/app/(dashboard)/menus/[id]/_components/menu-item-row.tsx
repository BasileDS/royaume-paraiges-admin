"use client";

import Link from "next/link";
import { Beer, EyeOff, Package, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { MenuItemVariant, MenuItemWithDetails } from "@/types/database";
import { formatPrice } from "../_lib/price";
import { SOURCE_LABELS } from "../_lib/labels";
import { findHighlightRanges } from "../_lib/search";

/** Surligne dans `text` les mots de la recherche en cours. */
export function Highlighted({ text, tokens }: { text: string; tokens?: string[] }) {
  const ranges = tokens && tokens.length > 0 ? findHighlightRanges(text, tokens) : [];
  if (ranges.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], n) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark
        key={n}
        className="rounded-sm bg-amber-200/70 px-0 text-inherit dark:bg-amber-500/30"
      >
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export function SourceIcon({
  source,
  className,
}: {
  source: MenuItemWithDetails["source"];
  className?: string;
}) {
  if (source === "beer") {
    return <Beer className={className} aria-label={SOURCE_LABELS.beer} role="img" />;
  }
  if (source === "catalog") {
    return <Package className={className} aria-label={SOURCE_LABELS.catalog} role="img" />;
  }
  return null;
}

/** Étiquette « HH » d'un tarif happy hour, compacte pour tenir dans une ligne de prix. */
export function HappyHourTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded border border-amber-500/50 px-1 text-[10px] font-semibold uppercase leading-4 text-amber-700 dark:text-amber-400",
        className,
      )}
      title="Tarif happy hour"
    >
      HH
    </span>
  );
}

function PriceLine({ variants, muted }: { variants: MenuItemVariant[]; muted: boolean }) {
  if (variants.length === 0) {
    return (
      <span className="text-xs text-amber-700 dark:text-amber-400">
        Aucun format tarifé : invisible sur la carte publique
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm tabular-nums text-muted-foreground">
      {variants.map((v) => (
        <span key={v.id} className="inline-flex items-baseline gap-1">
          {v.label && <span>{v.label}</span>}
          <span className={cn("font-medium", muted ? "text-muted-foreground" : "text-foreground")}>
            {formatPrice(v.price)}
          </span>
          {v.is_happy_hour && <HappyHourTag />}
        </span>
      ))}
    </span>
  );
}

interface MenuItemRowProps {
  item: MenuItemWithDetails;
  /** Base de l'URL d'édition : `/menus/<establishmentId>/produit`. */
  editHref: string;
  busy?: boolean;
  /** Mots de la recherche en cours, surlignés dans le nom. */
  highlightTokens?: string[];
  /** Tap sur la ligne : ouvre la fiche d'actions rapides. */
  onOpen: (item: MenuItemWithDetails) => void;
  onToggleActive: (item: MenuItemWithDetails) => void;
  onToggleFeatured: (item: MenuItemWithDetails) => void;
  onUnplace: (item: MenuItemWithDetails) => void;
}

/**
 * Une ligne de la carte. Sur téléphone : le nom et les prix sont la cible qui
 * ouvre la fiche, l'interrupteur de disponibilité reste à portée directe (c'est
 * le geste le plus fréquent en service). Au-delà de `md`, les raccourcis coup
 * de cœur / modifier / retirer restent visibles pour garder l'accès en un clic.
 */
export function MenuItemRow({
  item,
  editHref,
  busy,
  highlightTokens,
  onOpen,
  onToggleActive,
  onToggleFeatured,
  onUnplace,
}: MenuItemRowProps) {
  const inactive = !item.is_active;

  return (
    <div
      className={cn(
        "flex items-stretch border-b last:border-b-0",
        inactive && "bg-muted/30",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-haspopup="dialog"
        className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-4 py-3 text-left transition-colors active:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted/60 md:hover:bg-muted/40"
      >
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {item.is_featured && (
            <Star
              className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500"
              aria-label="Coup de cœur"
              role="img"
            />
          )}
          <span
            className={cn(
              "font-medium leading-snug",
              inactive && "text-muted-foreground",
            )}
          >
            <Highlighted text={item.resolved_title} tokens={highlightTokens} />
          </span>
          {item.precision && (
            <span className="text-xs italic text-muted-foreground">{item.precision}</span>
          )}
          {inactive && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Rupture
            </span>
          )}
          <SourceIcon source={item.source} className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        </span>
        {item.description && (
          <span className="hidden line-clamp-1 text-sm text-muted-foreground md:block">
            {item.description}
          </span>
        )}
        <PriceLine variants={item.variants} muted={inactive} />
      </button>

      <div className="flex shrink-0 items-center pr-2 md:pr-3">
        <label className="flex h-12 items-center px-2" title={inactive ? "Remettre en vente" : "Mettre en rupture"}>
          <Switch
            checked={item.is_active}
            onCheckedChange={() => onToggleActive(item)}
            disabled={busy}
            aria-label={`${inactive ? "Remettre en vente" : "Mettre en rupture"} ${item.resolved_title}`}
          />
        </label>

        <div className="hidden items-center md:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled={busy}
            aria-label={`${item.is_featured ? "Retirer des" : "Mettre en"} coups de cœur : ${item.resolved_title}`}
            title={
              item.is_featured
                ? "Retirer le coup de cœur"
                : "Coup de cœur de la catégorie (remplace le précédent)"
            }
            onClick={() => onToggleFeatured(item)}
          >
            <Star
              className={cn("h-4 w-4", item.is_featured && "fill-current text-amber-500")}
              aria-hidden="true"
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            asChild
            aria-label={`Modifier ${item.resolved_title}`}
          >
            <Link href={`${editHref}/${item.id}`} title="Modifier la fiche">
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          {item.category_id !== null && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              disabled={busy}
              aria-label={`Retirer de la carte : ${item.resolved_title}`}
              title="Retirer de la carte (le produit reste disponible)"
              onClick={() => onUnplace(item)}
            >
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
