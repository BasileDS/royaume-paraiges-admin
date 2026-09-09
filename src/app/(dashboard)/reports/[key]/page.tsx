"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, MailCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  countActiveRecipients,
  getEmailReportByKey,
  getReportRecipients,
  setReportActive,
} from "@/lib/services/emailReportService";
import { emailReportKeys } from "@/lib/queries/keys";
import { formatDateTime } from "@/lib/utils";
import { RecipientsCard } from "./_components/recipients-card";
import { ReportActionsCard } from "./_components/report-actions-card";
import { RunsCard } from "./_components/runs-card";
import { VideoCard } from "./_components/video-card";
import { scheduleLabel } from "../_lib/report-labels";

export default function ReportDetailPage() {
  const { key } = useParams<{ key: string }>();
  const queryClient = useQueryClient();

  const reportQuery = useQuery({
    queryKey: emailReportKeys.detail(key),
    queryFn: () => getEmailReportByKey(key),
  });

  const report = reportQuery.data;

  const recipientsQuery = useQuery({
    queryKey: emailReportKeys.recipients(report?.id ?? ""),
    queryFn: () => getReportRecipients(report!.id),
    enabled: !!report,
  });

  const activeRecipients = countActiveRecipients(recipientsQuery.data ?? []);

  const toggleActive = async () => {
    if (!report) return;
    if (!report.is_active && activeRecipients === 0) {
      toast.error("Aucun destinataire", {
        description: "Cochez au moins un destinataire actif avant d'activer l'envoi.",
      });
      return;
    }
    try {
      await setReportActive(report.id, !report.is_active);
      queryClient.invalidateQueries({ queryKey: emailReportKeys.all });
      toast.success(report.is_active ? "Envoi automatique desactive" : "Envoi automatique active", {
        description: report.is_active
          ? undefined
          : "Le premier envoi aura lieu au prochain changement de periode : rien ne part retroactivement.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Erreur", { description: "Modification impossible" });
    }
  };

  if (reportQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-72 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-[420px] animate-pulse rounded-lg bg-muted" />
          <div className="h-[420px] animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (reportQuery.isError || !report) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/reports">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Rapports e-mail
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={MailCheck}
              title="Rapport introuvable"
              description={`Aucun rapport ne porte la cle « ${key} ».`}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/reports">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Rapports e-mail
        </Link>
      </Button>

      <PageHeader
        title={report.name}
        description={report.description ?? undefined}
        actions={
          <div className="flex items-center gap-3">
            <Label htmlFor="report-active" className="text-sm text-muted-foreground">
              Envoi automatique
            </Label>
            <Switch
              id="report-active"
              checked={report.is_active}
              onCheckedChange={toggleActive}
            />
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-6 text-sm">
          <Badge variant="outline" className="gap-1">
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
            {scheduleLabel(report)}
          </Badge>
          <div className="text-muted-foreground">
            Objet :{" "}
            <span className="font-medium text-foreground">{report.subject_template}</span>
          </div>
          <div className="text-muted-foreground">
            Derniere periode envoyee :{" "}
            <span className="font-mono text-foreground">
              {report.last_period_sent ?? "aucune"}
            </span>
          </div>
          {report.last_run_at && (
            <div className="text-muted-foreground">
              Dernier passage : {formatDateTime(report.last_run_at)}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecipientsCard reportId={report.id} />
        <ReportActionsCard report={report} recipientsCount={activeRecipients} />
      </div>

      {/* Templates video a date : classement (leaderboard) et defis de la periode (new_quests). */}
      {(report.report_type === "leaderboard" || report.report_type === "new_quests") && (
        <VideoCard report={report} />
      )}

      <RunsCard reportId={report.id} />
    </div>
  );
}
