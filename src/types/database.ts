/**
 * Barrel d'export pour les types Supabase.
 *
 * - `./database.generated` : types générés par `npm run supabase:types`
 *   (le script cible explicitement ce fichier pour ne pas écraser les
 *   helpers manuels).
 * - `./database.helpers` : alias manuels (QuestType, Profile, ReceiptLine,
 *   etc.), ne sont jamais régénérés.
 *
 * Les consommateurs importent depuis `@/types/database` et reçoivent
 * les deux transparentement.
 */

export * from "./database.generated";
export * from "./database.helpers";
