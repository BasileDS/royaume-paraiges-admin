"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, MailCheck, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getEmailReports, setReportActive } from "@/lib/services/emailReportService";
import { emailReportKeys } from "@/lib/queries/keys";
import { formatDateTime } from "@/lib/utils";
import type { EmailReportWithStats } from "@/types/database";
import { cadenceLabel, coverageLabel } from "./_lib/report-labels";

export default function ReportsPage() {
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
        description: "Ajoutez au moins une adresse avant d'activer ce rapport.",
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
        description="Envois automatiques vers une liste d'adresses internes. Les bilans chiffres portent sur la periode ecoulee, les annonces sur la periode qui s'ouvre."
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
            <Card key={report.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      <Link
                        href={`/reports/${report.key}`}
                        className="hover:underline"
                      >
                        {report.name}
                      </Link>
                    </CardTitle>
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
