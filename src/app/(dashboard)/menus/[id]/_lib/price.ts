import { z } from "zod";

/**
 * Saisie et affichage des prix de la carte. Un seul endroit pour la règle :
 * saisie en euros avec virgule ou point, vide = prix non communiqué (NULL en
 * base, « — » sur la carte), ce qui n'est pas la gratuité (0).
 */

const toNumber = (v: string) => Number(v.trim().replace(",", "."));

/** Schéma d'un champ prix en chaîne, partagé par le formulaire complet et la modification rapide. */
export const priceInputSchema = z
  .string()
  .refine((v) => v.trim() === "" || !Number.isNaN(toNumber(v)), "Prix invalide")
  .refine((v) => v.trim() === "" || toNumber(v) >= 0, "Prix négatif impossible");

/** Chaîne saisie → valeur BDD. */
export function parsePriceInput(value: string): number | null {
  return value.trim() === "" ? null : toNumber(value);
}

/** Valeur BDD → chaîne pré-remplie dans un champ. */
export function formatPriceInput(price: number | null): string {
  return price === null ? "" : String(price).replace(".", ",");
}

/** Prix affiché : « 4,10 € », ou « — » si non communiqué, comme sur la carte. */
export function formatPrice(price: number | null): string {
  if (price === null) return "—";
  return `${price.toFixed(2).replace(".", ",")} €`;
}
