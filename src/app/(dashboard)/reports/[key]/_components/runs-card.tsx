"use client";

import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRuns } from "@/lib/services/emailReportService";
import { emailReportKeys } from "@/lib/queries/keys";
import { formatDateTime } from "@/lib/utils";

interface RunsCardProps {
  reportId: string;
}

const SOURCE_LABEL: Record<string, string> = {
  cron: "Automatique",
  manual: "Manuel",
  test: "Test",
};

export function RunsCard({ reportId }: RunsCardProps) {
  const runsQuery = useQuery({
    queryKey: emailReportKeys.runs(reportId),
    queryFn: () => getRuns(reportId),
  });

  const runs = runsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historique des envois</CardTitle>
        <CardDescription>20 dernieres tentatives, la plus recente en tete.</CardDescription>
      </CardHeader>
      <CardContent>
        {runsQuery.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <EmptyState
            icon={History}
            title="Aucun envoi"
            description="Les tentatives d'envoi, reussies ou non, apparaitront ici."
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Origine</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Envoyes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(run.started_at)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {run.period_identifier}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {SOURCE_LABEL[run.trigger_source] ?? run.trigger_source}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <StatusBadge status={run.status} />
                        {run.error_message && (
                          <p className="max-w-[320px] text-xs text-muted-foreground">
                            {run.error_message}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {run.sent_count}
                      {run.failed_count > 0 && (
                        <span className="text-destructive"> / {run.failed_count} KO</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
