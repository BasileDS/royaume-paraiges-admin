"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type NavSection = { id: string; label: string };

/** Variable CSS exposant la hauteur de la barre, lue par le `scroll-mt` des sections. */
export const NAV_HEIGHT_VAR = "--menu-nav-h";
/** Classe à poser sur chaque section ciblée pour qu'elle s'arrête sous la barre. */
export const SECTION_SCROLL_MARGIN = "scroll-mt-[calc(var(--menu-nav-h,0px)+0.75rem)]";

/** Après un tap sur une puce, l'observateur se tait le temps du défilement animé. */
const CLICK_LOCK_MS = 700;

interface CategoryNavProps {
  sections: NavSection[];
  query: string;
  onQueryChange: (query: string) => void;
  /** Nombre de produits affichés par la recherche, `null` hors recherche. */
  resultCount: number | null;
  totalCount: number;
}

/**
 * Barre collée en haut de la page : champ de recherche, puis puces de
 * catégories défilantes à l'horizontale (un tap fait défiler jusqu'à la
 * section, la puce active suit la lecture). Pendant une recherche, les puces
 * laissent place au décompte des résultats.
 *
 * `-top-4` : le `sticky` s'arrête au bord du contenu de `<main>`, sous son
 * padding ; le décalage négatif recolle la barre au header.
 */
export function CategoryNav({
  sections,
  query,
  onQueryChange,
  resultCount,
  totalCount,
}: CategoryNavProps) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);
  const navRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const scrollLock = useRef(false);
  const searching = resultCount !== null;

  // Hauteur réelle de la barre → variable CSS, pour le scroll-margin des sections.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty(NAV_HEIGHT_VAR, `${el.offsetHeight}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(NAV_HEIGHT_VAR);
    };
  }, []);

  // Section en cours de lecture : la première, dans l'ordre du document, qui
  // coupe la bande située juste sous la barre. La racine est le conteneur qui
  // défile (`<main>`), pas la fenêtre : le header n'entre pas dans le calcul.
  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const visible = new Set<string>();
    const navHeight = navRef.current?.offsetHeight ?? 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        if (scrollLock.current) return;
        const first = sections.find((s) => visible.has(s.id));
        if (first) setActive(first.id);
      },
      {
        root: navRef.current?.closest("main") ?? null,
        rootMargin: `-${navHeight + 8}px 0px -55% 0px`,
        threshold: 0,
      },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // La puce active reste visible dans la bande défilante.
  useEffect(() => {
    const strip = stripRef.current;
    const chip = active ? chipRefs.current.get(active) : undefined;
    if (!strip || !chip) return;
    const left = chip.offsetLeft - strip.clientWidth / 2 + chip.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active, searching]);

  const jumpTo = (id: string) => {
    scrollLock.current = true;
    window.setTimeout(() => {
      scrollLock.current = false;
    }, CLICK_LOCK_MS);
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const clear = () => {
    onQueryChange("");
    inputRef.current?.focus();
  };

  return (
    <nav
      ref={navRef}
      aria-label="Recherche et catégories de la carte"
      className="sticky -top-4 z-30 -mx-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 md:-top-6 md:-mx-6"
    >
      <div className="flex flex-col gap-2 px-4 py-2 md:flex-row md:items-center md:gap-3 md:px-6">
        {/* Champ de recherche. `type="text"` plutôt que `search` : WebKit y
            ajoute sa propre croix, qui doublonnerait la nôtre. */}
        <div className="relative md:w-72 md:shrink-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onQueryChange("");
                e.currentTarget.blur();
              }
            }}
            placeholder="Rechercher un produit, un prix, « rupture »…"
            aria-label="Rechercher un produit"
            className="h-10 pl-9 pr-10 md:h-9"
          />
          {query && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:bg-muted"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {searching ? (
          <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
            {resultCount === 0
              ? "Aucun produit ne correspond"
              : `${resultCount} produit${resultCount > 1 ? "s" : ""} sur ${totalCount}`}
          </p>
        ) : (
          sections.length >= 2 && (
            <div
              ref={stripRef}
              className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:min-w-0 md:flex-1 md:px-0 [&::-webkit-scrollbar]:hidden"
            >
              {sections.map((s) => {
                const isActive = active === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    ref={(el) => {
                      if (el) chipRefs.current.set(s.id, el);
                      else chipRefs.current.delete(s.id);
                    }}
                    onClick={() => jumpTo(s.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground active:bg-muted md:hover:bg-muted",
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>
    </nav>
  );
}
