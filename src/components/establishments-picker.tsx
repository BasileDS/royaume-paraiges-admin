"use client";

import { useEffect, useState } from "react";
import { Loader2, Globe, Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getEstablishments, type Establishment } from "@/lib/services/contentService";

interface EstablishmentsPickerProps {
  value: number[];
  onChange: (ids: number[]) => void;
  /** Optionnel : désactive le picker pendant un submit en cours. */
  disabled?: boolean;
}

/**
 * Picker M2M d'établissements pour le scoping des quêtes (table
 * `quests_establishments`, migration 020). Sémantique :
 *
 *   - `value === []` → quête **globale** (aucune entrée en BDD, applicable
 *     à tous les établissements).
 *   - `value.length > 0` → quête **locale**, restreinte aux établissements
 *     sélectionnés.
 *
 * Les triggers de la migration 021 bloquent toute sélection qui créerait
 * une redondance avec une autre quête active de même signature.
 */
export function EstablishmentsPicker({ value, onChange, disabled }: EstablishmentsPickerProps) {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getEstablishments();
      if (!cancelled) {
        setEstablishments(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isGlobal = value.length === 0;
  const selectedSet = new Set(value);

  const toggleEstablishment = (id: number) => {
    if (disabled) return;
    const next = selectedSet.has(id)
      ? value.filter((x) => x !== id)
      : [...value, id];
    onChange(next);
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(establishments.map((e) => e.id));
  };

  const makeGlobal = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isGlobal ? (
            <Badge variant="secondary" className="gap-1">
              <Globe className="h-3 w-3" />
              Quête globale
            </Badge>
          ) : (
            <Badge variant="default" className="gap-1">
              <Building2 className="h-3 w-3" />
              Quête locale — {value.length} établissement{value.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {!isGlobal && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={makeGlobal}
              disabled={disabled}
            >
              Rendre globale
            </Button>
          )}
          {isGlobal && establishments.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAll}
              disabled={disabled}
            >
              Tout sélectionner
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Aucune coche = quête <strong>globale</strong>, applicable dans tous les établissements.
        Cochez pour restreindre la quête à un sous-ensemble.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des établissements…
        </div>
      ) : establishments.length === 0 ? (
        <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
          Aucun établissement disponible.
        </div>
      ) : (
        <ScrollArea className="h-56 rounded-md border">
          <div className="divide-y">
            {establishments.map((est) => {
              const checked = selectedSet.has(est.id);
              const inputId = `establishment-${est.id}`;
              return (
                <label
                  key={est.id}
                  htmlFor={inputId}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50"
                >
                  <Checkbox
                    id={inputId}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggleEstablishment(est.id)}
                  />
                  <div className="flex flex-1 flex-col">
                    <Label htmlFor={inputId} className="cursor-pointer font-medium">
                      {est.title}
                    </Label>
                    {est.city && (
                      <span className="text-xs text-muted-foreground">{est.city}</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
