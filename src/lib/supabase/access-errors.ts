/**
 * Refus d'écriture par la base (feature-gating, migrations 070 → 115).
 *
 * Deux formes arrivent de PostgREST avec le code `42501` :
 *   - une RPC gardée par `assert_admin_feature` : message `FEATURE_DISABLED: …` ;
 *   - une policy `WITH CHECK` : « new row violates row-level security policy ».
 * Ce module les traduit une fois pour toutes (le client navigateur applique
 * `translateAccessError` à chaque réponse en erreur), et fournit le garde des
 * suppressions unitaires, seules écritures que la RLS laisse silencieuses
 * (DELETE n'a pas de WITH CHECK : zéro ligne touchée, aucune erreur).
 */

export const ACCESS_DENIED_CODE = "42501";

const RLS_VIOLATION = "row-level security";
const FEATURE_DISABLED = /^FEATURE_DISABLED: fonctionnalité (.+?) désactivée/;

export function describeAccessDenied(message: string | undefined): string | null {
  if (!message) return null;
  const feature = FEATURE_DISABLED.exec(message);
  if (feature) {
    return `Action refusée : la fonctionnalité « ${feature[1]} » a été désactivée pour votre compte par un super admin.`;
  }
  if (message.includes(RLS_VIOLATION)) {
    return "Action refusée : cette fonctionnalité a été désactivée pour votre compte par un super admin, ou cette ligne est hors de votre périmètre.";
  }
  return null;
}

interface PostgrestErrorBody {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

/**
 * Corps d'erreur PostgREST → même corps avec un message lisible, ou `null` si
 * ce n'est pas un refus d'accès à traduire (les codes métier P04xx, les
 * messages MENU_* de la couche cartes, etc. passent tels quels).
 */
export function translateAccessError(body: unknown): PostgrestErrorBody | null {
  if (!body || typeof body !== "object") return null;
  const e = body as PostgrestErrorBody;
  if (e.code !== ACCESS_DENIED_CODE) return null;
  const message = describeAccessDenied(e.message);
  if (!message) return null;
  return { ...e, message, details: e.message ?? null };
}

/**
 * Garde des suppressions unitaires : la requête doit relire la ligne
 * supprimée (`.delete().eq(…).select("id")`). Aucune ligne = la RLS l'a
 * filtrée sans rien dire, on lève la même erreur qu'un refus explicite.
 */
export function assertWriteTouched(rows: unknown[] | null, what = "cet élément"): void {
  if (!rows || rows.length === 0) {
    throw Object.assign(
      new Error(
        `Action refusée : ${what} n'a pas été modifié. La fonctionnalité a sans doute été désactivée pour votre compte par un super admin.`,
      ),
      { code: ACCESS_DENIED_CODE, details: "WRITE_IGNORED" },
    );
  }
}
