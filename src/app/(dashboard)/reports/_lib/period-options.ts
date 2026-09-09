import { getPeriodBounds, shiftPeriod } from "@/components/period-range";
import { getPeriodIdentifier } from "@/lib/utils";
import type { EmailReportPeriodScope, EmailReportPeriodType } from "@/types/database";

/**
 * Liste des periodes proposees pour un envoi manuel de rapport.
 *
 * Remplace la saisie libre d'un identifiant (`2026-W33`, `2026-07`), trop
 * facile a mal former. Les periodes sont generees localement plutot que lues
 * dans `available_periods` : la table ne couvre pas forcement l'horizon voulu
 * et un rapport se renvoie surtout sur les dernieres semaines ou les derniers
 * mois.
 *
 * Contenu : la periode en cours, les `PAST_PERIODS` precedentes, plus la
 * periode suivante pour un rapport d'annonce (`period_scope = current`), ce
 * qui permet de previsualiser par avance les defis de la semaine a venir.
 * L'identifiant de semaine suit la convention ISO 8601 de `getPeriodIdentifier`,
 * alignee sur la SQL `get_period_identifier`.
 */

export interface ReportPeriodOption {
  /** Identifiant tel qu'attendu par l'Edge Function (`2026-W33` ou `2026-07`). */
  identifier: string;
  /** Libelle lisible : « Semaine 33, 2026 » ou « Aout 2026 ». */
  label: string;
  /** Bornes calendaires : « 11 août → 17 août ». */
  range: string;
  /** Vrai pour la periode que viserait l'envoi sans choix explicite. */
  isDefault: boolean;
  /** Vrai pour la periode contenant aujourd'hui. */
  isCurrent: boolean;
}

const PAST_PERIODS = 12;

const MODE = { weekly: "week", monthly: "month" } as const;

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function humanLabel(periodType: EmailReportPeriodType, identifier: string): string {
  if (periodType === "weekly") {
    const match = identifier.match(/^(\d{4})-W(\d{2})$/);
    return match ? `Semaine ${parseInt(match[2] ?? "0", 10)}, ${match[1]}` : identifier;
  }
  const match = identifier.match(/^(\d{4})-(\d{2})$/);
  return match ? `${MONTHS[parseInt(match[2] ?? "0", 10) - 1] ?? ""} ${match[1]}` : identifier;
}

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function buildReportPeriodOptions(
  periodType: EmailReportPeriodType,
  periodScope: EmailReportPeriodScope,
  today: Date = new Date(),
): ReportPeriodOption[] {
  const mode = MODE[periodType];
  // Ancre = premier jour de la periode courante, en date locale. Partir du
  // debut de periode evite le debordement d'un 31 decale d'un mois (31 mars
  // - 1 mois = 3 mars en JS) ; shiftPeriod raisonne en UTC sur du YYYY-MM-DD.
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const anchor = getPeriodBounds(mode, todayISO).startDate;

  const offsets: number[] = [];
  if (periodScope === "current") offsets.push(1);
  for (let i = 0; i <= PAST_PERIODS; i++) offsets.push(-i);
  const defaultOffset = periodScope === "current" ? 0 : -1;

  return offsets.map((offset) => {
    let dateISO = anchor;
    for (let i = 0; i < Math.abs(offset); i++) {
      dateISO = shiftPeriod(dateISO, mode, offset < 0 ? -1 : 1);
    }
    const { startDate, endDate } = getPeriodBounds(mode, dateISO);
    const identifier = getPeriodIdentifier(periodType, new Date(`${startDate}T12:00:00`));
    return {
      identifier,
      label: humanLabel(periodType, identifier),
      range: `${shortDate(startDate)} → ${shortDate(endDate)}`,
      isDefault: offset === defaultOffset,
      isCurrent: offset === 0,
    };
  });
}
