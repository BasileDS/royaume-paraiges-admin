import { z } from "zod";

/**
 * Validation des payloads des rapports e-mail (migration 076).
 *
 * Le format d'adresse reprend le CHECK BDD `ck_email_report_recipient_email`
 * (volontairement permissif : pas de validation TLD). La normalisation en
 * minuscules est faite par un trigger cote base ; on l'applique aussi ici pour
 * que l'UI affiche immediatement ce qui sera stocke.
 */
export const recipientSchema = z.object({
  email: z
    .string()
    .min(1, "Adresse requise")
    .max(320, "Adresse trop longue")
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Adresse e-mail invalide")
    .transform((value) => value.trim().toLowerCase()),
  label: z.string().max(120, "Libelle trop long").nullable().optional(),
});

export type RecipientInput = z.infer<typeof recipientSchema>;

/**
 * Identifiant de periode : semaine ISO (2026-W33) ou mois (2026-07). Sert au
 * champ "renvoyer une periode passee" de la page de detail.
 */
export const periodIdentifierSchema = z
  .string()
  .regex(
    /^\d{4}-(W\d{2}|\d{2})$/,
    "Format attendu : 2026-W33 (semaine) ou 2026-07 (mois)",
  );
