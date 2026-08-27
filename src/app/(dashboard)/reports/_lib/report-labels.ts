import type {
  EmailReport,
  EmailReportPeriodScope,
  EmailReportPeriodType,
} from "@/types/database";

/**
 * Libelles de periodicite des rapports e-mail.
 *
 * Deux notions distinctes depuis la migration 079, a ne pas confondre :
 *   - le RYTHME d'envoi (`period_type`) : chaque lundi, ou le 1er du mois ;
 *   - la PERIODE COUVERTE (`period_scope`) : la periode ecoulee pour un bilan
 *     chiffre, la periode qui s'ouvre pour une annonce (defis de la semaine).
 *
 * Les trois rapports d'origine sont tous des bilans, d'ou l'ancien raccourci
 * « chaque rapport porte sur la periode ecoulee » qui n'est plus vrai.
 */

type ReportPeriod = Pick<EmailReport, "period_type" | "period_scope">;

const CADENCE: Record<EmailReportPeriodType, string> = {
  weekly: "Chaque lundi",
  monthly: "Le 1er de chaque mois",
};

const COVERAGE: Record<EmailReportPeriodType, Record<EmailReportPeriodScope, string>> = {
  weekly: { previous: "semaine ecoulee", current: "semaine en cours" },
  monthly: { previous: "mois ecoule", current: "mois en cours" },
};

/** Article de la periode, pour composer une phrase (« la » semaine, « le » mois). */
const ARTICLE: Record<EmailReportPeriodType, string> = {
  weekly: "la",
  monthly: "le",
};

/** Rythme d'envoi seul : « Chaque lundi ». */
export function cadenceLabel(periodType: EmailReportPeriodType): string {
  return CADENCE[periodType] ?? periodType;
}

/** Periode couverte seule : « semaine en cours ». */
export function coverageLabel(report: ReportPeriod): string {
  return COVERAGE[report.period_type]?.[report.period_scope] ?? report.period_type;
}

/** Rythme + periode couverte : « Chaque lundi, sur la semaine en cours ». */
export function scheduleLabel(report: ReportPeriod): string {
  const article = ARTICLE[report.period_type] ?? "la";
  return `${cadenceLabel(report.period_type)}, sur ${article} ${coverageLabel(report)}`;
}

/**
 * Periode visee par defaut lors d'un envoi manuel, en toutes lettres :
 * « la derniere periode ecoulee » ou « la periode en cours ».
 */
export function defaultPeriodLabel(report: ReportPeriod): string {
  return report.period_scope === "current"
    ? "la periode en cours"
    : "la derniere periode ecoulee";
}
