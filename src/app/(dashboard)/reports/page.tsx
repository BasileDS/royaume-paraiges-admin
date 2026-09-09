"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Clapperboard, MailCheck, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getEmailReports, setReportActive } from "@/lib/services/emailReportService";
import { emailReportKeys } from "@/lib/queries/keys";
import { formatDateTime } from "@/lib/utils";
import type { EmailReportWithStats } from "@/types/database";
import { cadenceLabel, coverageLabel } from "./_lib/report-labels";

/**
 * Mention de la video dans la liste. Une video `ready` est lisible depuis le
 * detail du rapport ; les autres etats disent ou en est le rendu. Un rapport
 * sans option video ni rendu n'affiche rien : la video n'est pas son sujet.
 */
function VideoBadge({ report }: { report: EmailReportWithStats }) {
  const video = report.latest_video;
  const enabled = report.options?.video === true;
  if (!video && !enabled) return null;

  let label: string;
  let className = "";
  if (video?.status === "ready") {
    label = `Vidéo prête · ${video.period_identifier}`;
    className = "border-emerald-500/40 text-emerald-700 dark:text-emerald-400";
  } else if (video?.status === "rendering" || video?.status === "queued") {
    label = `Vidéo en cours · ${video.period_identifier}`;
  } else if (video?.status === "error") {
    label = `Vidéo en erreur · ${video.period_identifier}`;
    className = "border-destructive/40 text-destructive";
  } else if (enabled) {
    label = "Vidéo jointe, aucun rendu disponible";
  } else {
    // Rendu purge apres 7 jours, option desactivee depuis : rien a lire.
    return null;
  }

  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <Clapperboard className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const reportsQuery = useQuery({
    queryKey: emailReportKeys.lists(),
    queryFn: getEmailReports,
  });

  const reports = reportsQuery.data ?? [];

  const toggleActive = async (report: EmailReportWithStats) => {
    // Un rapport sans destinataire actif ne partirait nulle part : autant le
    // dire tout de suite plutot que de laisser l'admin decouvrir un run
    // "skipped" le lendemain.
    if (!report.is_active && report.recipients_count === 0) {
      toast.error("Aucun destinataire", {
        description: "Cochez au moins un destinataire avant d'activer ce rapport.",
      });
      return;
    }
    try {
      await setReportActive(report.id, !report.is_active);
      queryClient.invalidateQueries({ queryKey: emailReportKeys.all });
      toast.success(
        report.is_active
          ? `${report.name} desactive`
          : `${report.name} active`,
        {
          description: report.is_active
            ? undefined
            : "Le premier envoi aura lieu au prochain changement de periode. Utilisez « Envoyer maintenant » pour ne pas attendre.",
        },
      );
    } catch (err) {
      console.error(err);
      toast.error("Erreur", { description: "Impossible de modifier ce rapport" });
    }
  };

  if (reportsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-72 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (reportsQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Rapports e-mail" />
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={MailCheck}
              title="Chargement impossible"
              description="Les rapports n'ont pas pu etre charges. Rechargez la page."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports e-mail"
        description="Envois automatiques vers des adresses internes definies une fois dans l'annuaire, puis cochees rapport par rapport. Les bilans chiffres portent sur la periode ecoulee, les annonces sur la periode qui s'ouvre."
        actions={
          <Button variant="outline" asChild>
            <Link href="/reports/recipients">
              <Users className="mr-2 h-4 w-4" aria-hidden="true" />
              Annuaire des destinataires
            </Link>
          </Button>
        }
      />

      {reports.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={MailCheck}
              title="Aucun rapport configure"
              description="Les rapports sont crees par migration SQL. Contactez la personne qui gere la base."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <Card
              key={report.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/reports/${report.key}`)}
              onKeyDown={(e) => {
                // Ne reagir qu'aux touches recues par la carte elle-meme :
                // Espace/Entree sur l'interrupteur ne doivent pas naviguer.
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/reports/${report.key}`);
                }
              }}
              aria-label={`Ouvrir le rapport ${report.name}`}
              className="flex cursor-pointer flex-col transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{report.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-3">
                      {report.description}
                    </CardDescription>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={report.is_active}
                      onCheckedChange={() => toggleActive(report)}
                      aria-label={
                        report.is_active
                          ? `Desactiver ${report.name}`
                          : `Activer ${report.name}`
                      }
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="mt-auto space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="gap-1">
                    <CalendarClock className="h-3 w-3" aria-hidden="true" />
                    {cadenceLabel(report.period_type)}
                  </Badge>
                  <Badge variant="outline">{coverageLabel(report)}</Badge>
                  <Badge
                    variant={report.recipients_count > 0 ? "outline" : "destructive"}
                    className="gap-1"
                  >
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {report.recipients_count} destinataire
                    {report.recipients_count > 1 ? "s" : ""}
                  </Badge>
                  <VideoBadge report={report} />
                </div>

                <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <span>Dernier envoi</span>
                  {report.last_run ? (
                    <span className="flex items-center gap-2">
                      <StatusBadge status={report.last_run.status} />
                      {formatDateTime(report.last_run.started_at)}
                    </span>
                  ) : (
                    <span>jamais</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
