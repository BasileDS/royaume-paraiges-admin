import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type {
  EmailReport,
  EmailReportContact,
  EmailReportRecipient,
  EmailReportRun,
  EmailReportWithStats,
  EmailReportsDatabase,
  ReportRecipientOption,
  ReportVideoRender,
} from "@/types/database";
import {
  contactSchema,
  contactUpdateSchema,
  type ContactInput,
  type ContactUpdateInput,
} from "@/lib/schemas/emailReport.schema";
import { assertWriteTouched } from "@/lib/supabase/access-errors";

/**
 * Acces aux rapports e-mail automatises (migrations 076/077).
 *
 * RLS admin-only, avec feature gating `admin_has_feature('reports')` en
 * ecriture : le controle d'acces est delegue a PostgreSQL, pas de verification
 * ici. Un admin prive de la fonctionnalite verra la lecture fonctionner et
 * toute ecriture echouer - c'est voulu, le blocage dur est cote middleware.
 */

/**
 * Client typé sur le schema local des tables de rapports. Necessaire tant que
 * `database.generated.ts` ne les connait pas (cf. commentaire dans
 * database.helpers.ts). Le client sous-jacent est strictement le meme.
 */
function reportsClient(): SupabaseClient<EmailReportsDatabase> {
  return createClient() as unknown as SupabaseClient<EmailReportsDatabase>;
}

// ============================================================================
// Lecture
// ============================================================================

/**
 * Liste des rapports, enrichie du nombre de destinataires actifs et du dernier
 * envoi. Requetes a plat plutot qu'un select imbrique : PostgREST ne sait pas
 * ramener "la derniere ligne par groupe" en une passe, et le volume est de
 * l'ordre de la dizaine de lignes.
 */
export async function getEmailReports(): Promise<EmailReportWithStats[]> {
  const supabase = reportsClient();

  const reportsRes = await supabase
    .from("email_reports")
    .select("*")
    .order("period_type")
    .order("key");
  if (reportsRes.error) throw reportsRes.error;
  const reports = (reportsRes.data ?? []) as EmailReport[];
  if (reports.length === 0) return [];

  const ids = reports.map((r) => r.id);

  const [recipientsRes, contactsRes] = await Promise.all([
    supabase
      .from("email_report_recipients")
      .select("report_id, contact_id")
      .in("report_id", ids),
    supabase.from("email_report_contacts").select("id").eq("is_active", true),
  ]);
  if (recipientsRes.error) throw recipientsRes.error;
  if (contactsRes.error) throw contactsRes.error;

  const [runsRes, videosRes] = await Promise.all([
    supabase
      .from("email_report_runs")
      .select("*")
      .in("report_id", ids)
      .order("started_at", { ascending: false }),
    supabase
      .from("report_video_renders")
      .select("*")
      .in("report_id", ids)
      .order("updated_at", { ascending: false }),
  ]);
  if (runsRes.error) throw runsRes.error;
  if (videosRes.error) throw videosRes.error;

  // Un contact suspendu ne compte pas : il est exclu de tous les envois.
  const activeContactIds = new Set(
    ((contactsRes.data ?? []) as Pick<EmailReportContact, "id">[]).map((c) => c.id),
  );
  const activeCounts = new Map<string, number>();
  for (const row of (recipientsRes.data ?? []) as Pick<EmailReportRecipient, "report_id" | "contact_id">[]) {
    if (!activeContactIds.has(row.contact_id)) continue;
    activeCounts.set(row.report_id, (activeCounts.get(row.report_id) ?? 0) + 1);
  }

  // Les runs arrivent tries du plus recent au plus ancien : le premier vu pour
  // un rapport est donc le dernier envoi.
  const lastRuns = new Map<string, EmailReportRun>();
  for (const run of (runsRes.data ?? []) as EmailReportRun[]) {
    if (!lastRuns.has(run.report_id)) lastRuns.set(run.report_id, run);
  }

  // Une video `ready` encore en bucket prime sur un rendu plus recent mais
  // inexploitable (en cours, en erreur, purge) : c'est elle qu'on peut lire.
  const readyVideos = new Map<string, ReportVideoRender>();
  const lastVideos = new Map<string, ReportVideoRender>();
  for (const render of (videosRes.data ?? []) as ReportVideoRender[]) {
    if (!lastVideos.has(render.report_id)) lastVideos.set(render.report_id, render);
    if (render.status === "ready" && !readyVideos.has(render.report_id)) {
      readyVideos.set(render.report_id, render);
    }
  }

  return reports.map((report) => ({
    ...report,
    recipients_count: activeCounts.get(report.id) ?? 0,
    last_run: lastRuns.get(report.id) ?? null,
    latest_video: readyVideos.get(report.id) ?? lastVideos.get(report.id) ?? null,
  }));
}

export async function getEmailReportByKey(key: string): Promise<EmailReport> {
  const { data, error } = await reportsClient()
    .from("email_reports")
    .select("*")
    .eq("key", key)
    .single();
  if (error) throw error;
  return data as EmailReport;
}

/** Annuaire complet, dans l'ordre de saisie. */
export async function getContacts(): Promise<EmailReportContact[]> {
  const { data, error } = await reportsClient()
    .from("email_report_contacts")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as EmailReportContact[];
}

/**
 * Toutes les lignes du pivot rapport <-> contact. Sert a l'annuaire pour
 * afficher, par contact, les rapports auxquels il est abonne.
 */
export async function getRecipientLinks(): Promise<EmailReportRecipient[]> {
  const { data, error } = await reportsClient()
    .from("email_report_recipients")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as EmailReportRecipient[];
}

/**
 * Liste a cocher d'un rapport : chaque contact de l'annuaire, avec l'id du
 * pivot s'il est abonne. Deux requetes a plat plutot qu'un embed : le schema
 * local `EmailReportsDatabase` ne declare pas de relations, et le volume est
 * de quelques lignes.
 */
export async function getReportRecipients(reportId: string): Promise<ReportRecipientOption[]> {
  const supabase = reportsClient();
  const [contactsRes, linksRes] = await Promise.all([
    supabase.from("email_report_contacts").select("*").order("created_at"),
    supabase.from("email_report_recipients").select("*").eq("report_id", reportId),
  ]);
  if (contactsRes.error) throw contactsRes.error;
  if (linksRes.error) throw linksRes.error;

  const linkByContact = new Map<string, string>();
  for (const link of (linksRes.data ?? []) as EmailReportRecipient[]) {
    linkByContact.set(link.contact_id, link.id);
  }

  return ((contactsRes.data ?? []) as EmailReportContact[]).map((contact) => ({
    contact,
    recipient_id: linkByContact.get(contact.id) ?? null,
  }));
}

/** Nombre de destinataires qui recevront effectivement le rapport. */
export function countActiveRecipients(options: ReportRecipientOption[]): number {
  return options.filter((o) => o.recipient_id !== null && o.contact.is_active).length;
}

export async function getRuns(reportId: string, limit = 20): Promise<EmailReportRun[]> {
  const { data, error } = await reportsClient()
    .from("email_report_runs")
    .select("*")
    .eq("report_id", reportId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as EmailReportRun[];
}

// ============================================================================
// Ecriture
// ============================================================================

/**
 * Activer un rapport ne declenche PAS l'envoi de la periode deja ecoulee : un
 * trigger BDD (trg_email_report_activation) marque cette periode comme envoyee.
 * Pour l'envoyer quand meme, utiliser `triggerReport`.
 */
export async function setReportActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await reportsClient()
    .from("email_reports")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function updateReportOptions(
  id: string,
  options: { top_n?: number; video?: boolean },
): Promise<void> {
  const { error } = await reportsClient()
    .from("email_reports")
    .update({ options })
    .eq("id", id);
  if (error) throw error;
}

// ---- Annuaire ---------------------------------------------------------------

export async function createContact(input: ContactInput): Promise<EmailReportContact> {
  const payload = contactSchema.parse(input);
  const { data, error } = await reportsClient()
    .from("email_report_contacts")
    .insert({ email: payload.email, label: payload.label ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as EmailReportContact;
}

export async function updateContact(id: string, input: ContactUpdateInput): Promise<void> {
  const payload = contactUpdateSchema.parse(input);
  const { error } = await reportsClient()
    .from("email_report_contacts")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
}

/** Supprime le contact et, par cascade, tous ses abonnements. */
export async function deleteContact(id: string): Promise<void> {
  const { data, error } = await reportsClient()
    .from("email_report_contacts")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  assertWriteTouched(data, "ce contact");
}

// ---- Abonnements (cases a cocher) ------------------------------------------

/**
 * Coche ou decoche un contact pour un rapport. Idempotent : cocher un contact
 * deja abonne ne cree pas de doublon (contrainte uq_email_report_recipient),
 * decocher un contact non abonne ne fait rien.
 */
export async function setReportRecipient(
  reportId: string,
  contactId: string,
  subscribed: boolean,
): Promise<void> {
  const supabase = reportsClient();
  if (subscribed) {
    const { error } = await supabase
      .from("email_report_recipients")
      .upsert({ report_id: reportId, contact_id: contactId }, { onConflict: "report_id,contact_id" });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("email_report_recipients")
    .delete()
    .eq("report_id", reportId)
    .eq("contact_id", contactId);
  if (error) throw error;
}

/** Erreur 23505 : l'adresse existe deja dans l'annuaire. */
export function isDuplicateContactError(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  const message = err instanceof Error ? err.message : String(err);
  return code === "23505" || message.includes("uq_email_report_contact_email");
}

// ============================================================================
// Declenchement (Edge Function send-email-reports)
// ============================================================================

export interface TriggerReportResult {
  source: "cron" | "manual" | "test";
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  results: {
    report_key: string;
    period_identifier: string | null;
    status: "success" | "partial" | "error" | "skipped";
    sent_count: number;
    failed_count: number;
    error_message?: string;
    failures?: { email: string; error: string }[];
  }[];
}

export interface PreviewResult {
  subject: string;
  period: { identifier: string; label: string; start: string; end: string };
  html: string;
}

/**
 * Envoi immediat d'un rapport. Sans `periodIdentifier`, la periode visee est la
 * derniere periode ecoulee. Avec `testEmail`, l'envoi part vers cette seule
 * adresse et ne consomme pas la periode (last_period_sent inchange).
 */
export async function triggerReport(params: {
  reportKey: string;
  periodIdentifier?: string;
  testEmail?: string;
}): Promise<TriggerReportResult> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<TriggerReportResult>(
    "send-email-reports",
    {
      body: {
        report_key: params.reportKey,
        ...(params.periodIdentifier ? { period_identifier: params.periodIdentifier } : {}),
        ...(params.testEmail ? { test_email: params.testEmail } : {}),
      },
    },
  );
  if (error) throw error;
  if (!data) throw new Error("Reponse vide de send-email-reports");
  return data;
}

/** Rendu du rapport sans aucun envoi, pour la previsualisation dans l'admin. */
export async function previewReport(
  reportKey: string,
  periodIdentifier?: string,
): Promise<PreviewResult> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<PreviewResult>(
    "send-email-reports",
    {
      body: {
        report_key: reportKey,
        preview: true,
        ...(periodIdentifier ? { period_identifier: periodIdentifier } : {}),
      },
    },
  );
  if (error) throw error;
  if (!data) throw new Error("Reponse vide de send-email-reports");
  return data;
}

// ============================================================================
// Videos de classement (migration 082)
// ============================================================================

const VIDEO_BUCKET = "report-videos";

/**
 * Chemin de l'objet dans le bucket. Deterministe : c'est pour ca que
 * `report_video_renders` ne stocke aucune URL.
 */
export function videoObjectPath(reportKey: string, periodIdentifier: string): string {
  return `${reportKey}/${periodIdentifier}.mp4`;
}

/** Historique des rendus d'un rapport, le plus recent d'abord. */
export async function getVideoRenders(
  reportId: string,
  limit = 10,
): Promise<ReportVideoRender[]> {
  const { data, error } = await reportsClient()
    .from("report_video_renders")
    .select("*")
    .eq("report_id", reportId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ReportVideoRender[];
}

/**
 * URL signee de lecture du MP4, ou `null` si l'objet n'existe pas (purge, rendu
 * jamais abouti). Le bucket est prive : c'est le seul moyen de lire la video
 * depuis le navigateur, et la policy admin SELECT de la 082 autorise l'appel.
 */
export async function getVideoSignedUrl(
  reportKey: string,
  periodIdentifier: string,
  expiresInSeconds = 600,
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(videoObjectPath(reportKey, periodIdentifier), expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export interface VideoRenderRequestResult {
  status: "rendering" | "skipped";
  code?: string;
  reason?: string;
  period_identifier?: string;
  attempt?: number;
}

/**
 * Demande un (re-)rendu au service de rendu.
 *
 * Passe par une route serveur de l'admin plutot que d'appeler le renderer
 * directement : le bearer partage ne doit jamais atteindre le navigateur.
 */
export async function requestVideoRender(params: {
  reportKey: string;
  periodIdentifier?: string;
  force?: boolean;
}): Promise<VideoRenderRequestResult> {
  const response = await fetch(`/api/reports/${params.reportKey}/video-render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      period_identifier: params.periodIdentifier,
      force: params.force ?? false,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.reason ?? body?.error ?? `Echec de la demande (HTTP ${response.status})`);
  }
  return body as VideoRenderRequestResult;
}
