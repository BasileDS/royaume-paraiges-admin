"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, Send, TestTube } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  previewReport,
  triggerReport,
  type TriggerReportResult,
} from "@/lib/services/emailReportService";
import { emailReportKeys } from "@/lib/queries/keys";
import { periodIdentifierSchema } from "@/lib/schemas/emailReport.schema";
import type { EmailReport } from "@/types/database";

interface ReportActionsCardProps {
  report: EmailReport;
  recipientsCount: number;
}

const PERIOD_PLACEHOLDER: Record<string, string> = {
  weekly: "2026-W33",
  monthly: "2026-07",
};

/** Message utilisateur a partir du resume renvoye par l'Edge Function. */
function describeResult(result: TriggerReportResult): { ok: boolean; message: string } {
  const detail = result.results[0];
  if (!detail) return { ok: false, message: "Aucun rapport traite." };

  switch (detail.status) {
    case "success":
      return {
        ok: true,
        message: `${detail.sent_count} e-mail${detail.sent_count > 1 ? "s" : ""} envoye${detail.sent_count > 1 ? "s" : ""} pour ${detail.period_identifier}.`,
      };
    case "partial":
      return {
        ok: false,
        message: `${detail.sent_count} envoye(s), ${detail.failed_count} en echec : ${detail.failures?.map((f) => f.email).join(", ")}`,
      };
    case "skipped":
      return { ok: false, message: detail.error_message ?? "Envoi ignore." };
    default:
      return { ok: false, message: detail.error_message ?? "Envoi impossible." };
  }
}

export function ReportActionsCard({ report, recipientsCount }: ReportActionsCardProps) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState("");
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState<"send" | "test" | "preview" | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  /** Periode saisie validee, ou undefined si le champ est vide. `false` = invalide. */
  const resolvePeriod = (): string | undefined | false => {
    const trimmed = period.trim();
    if (!trimmed) return undefined;
    const parsed = periodIdentifierSchema.safeParse(trimmed);
    if (!parsed.success) {
      setPeriodError(parsed.error.issues[0]?.message ?? "Periode invalide");
      return false;
    }
    setPeriodError(null);
    return parsed.data;
  };

  const onSend = async () => {
    const resolved = resolvePeriod();
    if (resolved === false) return;
    setBusy("send");
    try {
      const result = await triggerReport({
        reportKey: report.key,
        periodIdentifier: resolved,
      });
      const { ok, message } = describeResult(result);
      if (ok) toast.success("Rapport envoye", { description: message });
      else toast.error("Envoi incomplet", { description: message });
      queryClient.invalidateQueries({ queryKey: emailReportKeys.all });
    } catch (err) {
      console.error(err);
      toast.error("Erreur", {
        description: "L'envoi a echoue. Verifiez les secrets Resend de la fonction.",
      });
    } finally {
      setBusy(null);
    }
  };

  const onTest = async () => {
    const resolved = resolvePeriod();
    if (resolved === false) return;
    if (!testEmail.trim()) return;
    setBusy("test");
    try {
      const result = await triggerReport({
        reportKey: report.key,
        periodIdentifier: resolved,
        testEmail: testEmail.trim(),
      });
      const { ok, message } = describeResult(result);
      if (ok) toast.success("E-mail de test envoye", { description: message });
      else toast.error("Test en echec", { description: message });
      queryClient.invalidateQueries({ queryKey: emailReportKeys.runs(report.id) });
    } catch (err) {
      console.error(err);
      toast.error("Erreur", { description: "Le test a echoue." });
    } finally {
      setBusy(null);
    }
  };

  const onPreview = async () => {
    const resolved = resolvePeriod();
    if (resolved === false) return;
    setBusy("preview");
    try {
      const { html } = await previewReport(report.key, resolved);
      // Blob plutot que document.write : le HTML est autonome et s'ouvre dans
      // un onglet isole, sans risque de blocage par le navigateur.
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      const opened = window.open(url, "_blank", "noopener");
      if (!opened) {
        toast.error("Fenetre bloquee", {
          description: "Autorisez les popups pour previsualiser le rapport.",
        });
      }
      // Le navigateur a besoin de l'URL le temps du chargement de l'onglet.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error(err);
      toast.error("Erreur", { description: "Previsualisation impossible." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Envoi manuel</CardTitle>
        <CardDescription>
          Sans periode precisee, le rapport porte sur la derniere periode ecoulee.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="period">Periode (optionnel)</Label>
          <Input
            id="period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder={PERIOD_PLACEHOLDER[report.period_type] ?? ""}
            autoComplete="off"
          />
          {periodError ? (
            <p className="text-sm text-destructive" role="alert">
              {periodError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Permet de renvoyer un rapport d&apos;une periode passee.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setConfirmSend(true)}
            disabled={busy !== null || recipientsCount === 0}
          >
            <Send className="mr-2 h-4 w-4" aria-hidden="true" />
            {busy === "send" ? "Envoi..." : "Envoyer maintenant"}
          </Button>
          <Button variant="outline" onClick={onPreview} disabled={busy !== null}>
            <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
            {busy === "preview" ? "Rendu..." : "Previsualiser"}
          </Button>
        </div>

        {recipientsCount === 0 && (
          <p className="text-sm text-muted-foreground">
            Ajoutez au moins un destinataire actif pour pouvoir envoyer.
          </p>
        )}

        <div className="space-y-1.5 border-t pt-4">
          <Label htmlFor="test-email">Envoi de test</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="votre@adresse.fr"
              className="max-w-xs"
              autoComplete="off"
            />
            <Button
              variant="outline"
              onClick={onTest}
              disabled={busy !== null || !testEmail.trim()}
            >
              <TestTube className="mr-2 h-4 w-4" aria-hidden="true" />
              {busy === "test" ? "Envoi..." : "Tester"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Part vers cette seule adresse et ne consomme pas la periode : l&apos;envoi
            automatique reste programme.
          </p>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title="Envoyer ce rapport maintenant ?"
        description={
          <>
            {recipientsCount} destinataire{recipientsCount > 1 ? "s" : ""} recevront{" "}
            <strong>{report.name}</strong>
            {period.trim() ? ` pour la periode ${period.trim()}` : " pour la periode ecoulee"}.
            Cette action est immediate et irreversible.
          </>
        }
        confirmLabel="Envoyer"
        onConfirm={onSend}
      />
    </Card>
  );
}
