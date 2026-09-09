import { z } from "zod";

/**
 * Validation des payloads des rapports e-mail (migrations 076 + 112).
 *
 * Le format d'adresse reprend le CHECK BDD `ck_email_report_contact_email`
 * (volontairement permissif : pas de validation TLD). La normalisation en
 * minuscules est faite par un trigger cote base ; on l'applique aussi ici pour
 * que l'UI affiche immediatement ce qui sera stocke.
 */
const contactEmailSchema = z
  .string()
  .min(1, "Adresse requise")
  .max(320, "Adresse trop longue")
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Adresse e-mail invalide")
  .transform((value) => value.trim().toLowerCase());

const contactLabelSchema = z
  .string()
  .max(120, "Libelle trop long")
  .nullable()
  .optional();

/** Creation d'un contact de l'annuaire (`email_report_contacts`). */
export const contactSchema = z.object({
  email: contactEmailSchema,
  label: contactLabelSchema,
});

export type ContactInput = z.infer<typeof contactSchema>;

/**
 * Mise a jour partielle d'un contact. Derive d'un noyau sans `.default()` :
 * en Zod 4, `.partial()` conserve les defauts et un update partiel ecraserait
 * les champs non fournis.
 */
export const contactUpdateSchema = z
  .object({
    email: contactEmailSchema,
    label: contactLabelSchema,
    is_active: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Aucune modification");

export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;

/**
 * Identifiant de periode : semaine ISO (2026-W33) ou mois (2026-07). Plus
 * utilise par l'UI depuis que l'envoi manuel propose une liste de periodes
 * (`reports/_lib/period-options.ts`) ; conserve pour valider un identifiant
 * venu d'ailleurs (URL, import).
 */
export const periodIdentifierSchema = z
  .string()
  .regex(
    /^\d{4}-(W\d{2}|\d{2})$/,
    "Format attendu : 2026-W33 (semaine) ou 2026-07 (mois)",
  );
