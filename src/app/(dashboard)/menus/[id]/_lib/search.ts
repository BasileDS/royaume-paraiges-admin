import type { MenuItemWithDetails } from "@/types/database";
import { SOURCE_LABELS } from "./labels";

/**
 * Recherche dans la carte, pensée pour une saisie rapide au pouce : sans
 * casse ni accents, chaque mot tapé doit se retrouver quelque part dans la
 * fiche (nom, descriptif, catégorie, format, prix, état), et une faute de
 * frappe est tolérée à partir de quatre lettres.
 */

/** Minuscules, sans accents, ligatures dépliées. */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

/** Mots de la requête, normalisés ; vide = pas de recherche. */
export function tokenizeQuery(query: string): string[] {
  return normalizeSearch(query)
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export type SearchIndex = { text: string; words: string[] };

/** Concatène des fragments en un texte normalisé plus sa liste de mots. */
export function buildSearchIndex(parts: Array<string | null | undefined>): SearchIndex {
  const text = normalizeSearch(parts.filter((p): p is string => Boolean(p)).join(" "));
  const words = text.split(/[^a-z0-9]+/).filter((w) => w.length > 0);
  return { text, words };
}

/** Longueur à partir de laquelle une faute de frappe est tolérée. */
const FUZZY_MIN_LENGTH = 4;

/** Distance d'édition au plus 1 : une substitution, une insertion ou une suppression. */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (la === lb) {
      i++;
      j++;
    } else if (la > lb) {
      i++;
    } else {
      j++;
    }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

function tokenMatches(token: string, index: SearchIndex): boolean {
  if (index.text.includes(token)) return true;
  if (token.length < FUZZY_MIN_LENGTH) return false;
  return index.words.some(
    (w) =>
      w.length >= FUZZY_MIN_LENGTH - 1 &&
      (withinOneEdit(token, w) || withinOneEdit(token, w.slice(0, token.length))),
  );
}

/** Tous les mots de la requête doivent se retrouver, dans n'importe quel ordre. */
export function matchesAllTokens(index: SearchIndex, tokens: string[]): boolean {
  return tokens.every((t) => tokenMatches(t, index));
}

/**
 * Tout ce qu'on peut vouloir taper pour retrouver un produit. Le chemin de
 * catégorie en fait partie : « pression blonde » cible les blondes des
 * pressions. Les prix acceptent la virgule comme le point, et quelques
 * mots-clés d'état (« rupture », « hh », « coup de cœur », « hors carte »)
 * servent de filtres sans interface dédiée.
 */
export function buildItemSearchIndex(
  item: MenuItemWithDetails,
  categoryPath: string[],
): SearchIndex {
  const prices = item.variants.flatMap((v) =>
    v.price === null
      ? []
      : [v.price.toFixed(2).replace(".", ","), v.price.toFixed(2), String(v.price)],
  );
  return buildSearchIndex([
    item.resolved_title,
    item.description,
    item.precision,
    item.allergens,
    item.type_label,
    SOURCE_LABELS[item.source],
    ...categoryPath,
    ...item.variants.map((v) => v.label),
    ...prices,
    item.variants.some((v) => v.is_happy_hour) ? "happy hour hh" : null,
    item.is_active ? "disponible" : "rupture indisponible",
    item.is_featured ? "coup de coeur favori" : null,
    item.category_id === null ? "hors carte" : null,
  ]);
}

/**
 * Plages `[début, fin)` du texte d'origine couvertes par les mots de la
 * requête, pour le surlignage. Le texte est normalisé caractère par caractère
 * en gardant la correspondance des index : « é » et « e » se surlignent pareil.
 * Seules les correspondances exactes sont surlignées, pas les fautes tolérées.
 */
export function findHighlightRanges(text: string, tokens: string[]): Array<[number, number]> {
  if (!text || tokens.length === 0) return [];

  const chars: string[] = [];
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const n = normalizeSearch(text.charAt(i));
    for (let k = 0; k < n.length; k++) {
      chars.push(n.charAt(k));
      map.push(i);
    }
  }
  const norm = chars.join("");

  const ranges: Array<[number, number]> = [];
  for (const token of tokens) {
    let from = 0;
    for (;;) {
      const idx = norm.indexOf(token, from);
      if (idx === -1) break;
      const start = map[idx];
      const last = map[idx + token.length - 1];
      if (start === undefined || last === undefined) break;
      ranges.push([start, last + 1]);
      from = idx + token.length;
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}
