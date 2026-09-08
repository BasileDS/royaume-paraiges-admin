"use client";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Beer, Package, Star, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItemWithDetails } from "@/types/database";

/** Prix en euros. `null` = prix non communiqué, affiché « — » comme sur la carte. */
function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return `${price.toFixed(2).replace(".", ",")} €`;
}

/**
 * D'où vient le descriptif de l'item. La distinction compte : un item lié tire
 * son nom du catalogue et n'est pas modifiable ici, un produit privé l'est.
 */
function SourceBadge({ source }: { source: MenuItemWithDetails["source"] }) {
  if (source === "beer") {
    return (
      <Badge variant="outline" className="gap-1 font-normal">
        <Beer className="h-3 w-3" aria-hidden="true" />
        Catalogue bières
      </Badge>
    );
  }
  if (source === "catalog") {
    return (
      <Badge variant="outline" className="gap-1 font-normal">
        <Package className="h-3 w-3" aria-hidden="true" />
        Catalogue partagé
      </Badge>
    );
  }
  return null;
}

interface MenuItemRowProps {
  item: MenuItemWithDetails;
  onToggleActive: (item: MenuItemWithDetails) => void;
  onToggleFeatured: (item: MenuItemWithDetails) => void;
  onUnplace: (item: MenuItemWithDetails) => void;
  busy?: boolean;
}

export function MenuItemRow({
  item,
  onToggleActive,
  onToggleFeatured,
  onUnplace,
  busy,
}: MenuItemRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between",
        !item.is_active && "bg-muted/30",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "font-medium",
              !item.is_active && "text-muted-foreground line-through",
            )}
          >
            {item.resolved_title}
          </span>
          {item.is_featured && (
            <Badge className="gap-1">
              <Star className="h-3 w-3" aria-hidden="true" />
              Coup de cœur
            </Badge>
          )}
          {!item.is_active && <Badge variant="secondary">En rupture</Badge>}
          <SourceBadge source={item.source} />
          {item.type_label && (
            <span className="text-muted-foreground text-xs">{item.type_label}</span>
          )}
        </div>

        {item.description && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
            {item.description}
          </p>
        )}
        {item.precision && (
          <p className="text-muted-foreground mt-0.5 text-xs italic">
            {item.precision}
          </p>
        )}

        {item.variants.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {item.variants.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-baseline gap-1.5 text-sm tabular-nums"
              >
                {v.label && (
                  <span className="text-muted-foreground">{v.label}</span>
                )}
                <span className="font-medium">{formatPrice(v.price)}</span>
                {v.is_happy_hour && (
                  <Badge variant="outline" className="px-1 py-0 text-[10px]">
                    HH
                  </Badge>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground mt-2 text-xs">
            Aucun format tarifé : le produit n&apos;apparaît pas sur la carte
            publique.
          </p>
        )}
      </div>

      <div
        className="flex shrink-0 items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="flex items-center gap-2 text-xs">
          <Switch
            checked={item.is_active}
            onCheckedChange={() => onToggleActive(item)}
            disabled={busy}
            aria-label={`${item.is_active ? "Mettre en rupture" : "Remettre en vente"} ${item.resolved_title}`}
          />
          <span className="text-muted-foreground hidden sm:inline">Disponible</span>
        </label>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={busy}
          aria-label={`${item.is_featured ? "Retirer des" : "Mettre en"} coups de cœur : ${item.resolved_title}`}
          onClick={() => onToggleFeatured(item)}
        >
          <Star
            className={cn(
              "h-4 w-4",
              item.is_featured && "fill-current text-amber-500",
            )}
            aria-hidden="true"
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={busy}
          aria-label={`Retirer de la carte : ${item.resolved_title}`}
          title="Retirer de la carte (le produit reste disponible)"
          onClick={() => onUnplace(item)}
        >
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
