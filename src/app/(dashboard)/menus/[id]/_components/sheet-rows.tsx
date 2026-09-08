"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Briques des feuilles d'actions de la carte : des lignes pleine largeur,
 * hautes d'au moins 48 px, pensées pour le pouce. Groupées dans un `RowGroup`
 * qui trace les séparateurs.
 */

export function RowGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("divide-y overflow-hidden rounded-xl border bg-card", className)}>
      {children}
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** Interrupteur pleine largeur : toute la ligne est la cible. */
export function ToggleRow({ label, hint, checked, onCheckedChange, disabled }: ToggleRowProps) {
  return (
    <label
      className={cn(
        "flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-colors active:bg-muted/60",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </label>
  );
}

interface ActionRowProps {
  icon: LucideIcon;
  label: string;
  hint?: string;
  /** Lien plutôt que bouton : navigation vers une autre page. */
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "destructive";
  /** Affiche un chevron à droite (navigation ou sous-vue). */
  chevron?: boolean;
}

export function ActionRow({
  icon: Icon,
  label,
  hint,
  href,
  onClick,
  disabled,
  tone = "default",
  chevron,
}: ActionRowProps) {
  const className = cn(
    "flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors active:bg-muted/60 md:hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/60 disabled:pointer-events-none disabled:opacity-50",
    tone === "destructive" && "text-destructive",
  );
  const body = (
    <>
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          tone === "destructive" ? "text-destructive" : "text-muted-foreground",
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      {(chevron || href) && (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-disabled={disabled}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {body}
    </button>
  );
}
