"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clapperboard, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getVideoRenders,
  getVideoSignedUrl,
  requestVideoRender,
  updateReportOptions,
} from "@/lib/services/emailReportService";
import { emailReportKeys } from "@/lib/queries/keys";
import { formatDateTime } from "@/lib/utils";
import type { EmailReport } from "@/types/database";

interface VideoCardProps {
  report: EmailReport;
}

/**
 * Carte « Vidéo » du détail d'un rapport.
 *
 * L'admin ne voit jamais HyperFrames : il active la pièce jointe, consulte le
 * dernier rendu, le regarde, et peut le relancer. Le rendu lui-même vit dans
 * un service séparé (`royaume-video-renderer`), appelé via la route serveur
 * `/api/reports/[key]/video-render` pour que le secret partagé ne descende
 * jamais dans le navigateur.
 */
export function VideoCard({ report }: VideoCardProps) {
  const queryClient = useQueryClient();
  const [previewPeriod, setPreviewPeriod] = useState<string | null>(null);

  const enabled = report.options?.video === true;

  const rendersQuery = useQuery({
    queryKey: emailReportKeys.videoRenders(report.id),
    queryFn: () => getVideoRenders(report.id),
    // Un rendu prend quelques minutes : on rafraîchit tant qu'il tourne.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((r) => r.status === "rendering") ? 15_000 : false,
  });

  const renders = rendersQuery.data ?? [];
  const latest = renders[0] ?? null;

  const previewQuery = useQuery({
    queryKey: emailReportKeys.videoUrl(report.key, previewPeriod ?? ""),
    queryFn: () => getVideoSignedUrl(report.key, previewPeriod as string),
    enabled: previewPeriod !== null,
  });

  const toggleMutation = useMutation({
    mutationFn: (checked: boolean) =>
      updateReportOptions(report.id, { ...(report.options ?? {}), video: checked }),
    onSuccess: (_data, checked) => {
      queryClient.invalidateQueries({ queryKey: emailReportKeys.all });
      toast.success(
        checked
          ? "La vidéo sera jointe aux prochains envois."
          : "La vidéo ne sera plus jointe.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const renderMutation = useMutation({
    mutationFn: (periodIdentifier?: string) =>
      requestVideoRender({ reportKey: report.key, periodIdentifier, force: true }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: emailReportKeys.videoRenders(report.id) });
      if (result.status === "rendering") {
        toast.success("Rendu lancé. Comptez quelques minutes.");
      } else {
        toast.info(result.reason ?? "Aucun rendu à lancer.");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vidéo du classement</CardTitle>
        <CardDescription>
          Jointe à l&apos;e-mail et réutilisable sur les réseaux sociaux. Conservée 7 jours,
          puis supprimée automatiquement.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="video-enabled" className="text-sm font-medium">
              Joindre une vidéo à ce rapport
            </Label>
            <p className="text-xs text-muted-foreground">
              Si la vidéo manque le jour de l&apos;envoi, le rapport part quand même, avec
              un encart qui explique pourquoi.
            </p>
          </div>
          <Switch
            id="video-enabled"
            checked={enabled}
            disabled={toggleMutation.isPending}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={renderMutation.isPending}
            onClick={() => renderMutation.mutate(undefined)}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${renderMutation.isPending ? "animate-spin" : ""}`}
            />
            Générer un aperçu
          </Button>
          {latest?.status === "ready" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewPeriod(latest.period_identifier)}
            >
              Regarder la dernière vidéo
            </Button>
          )}
        </div>

        {previewPeriod !== null && (
          <div className="space-y-2">
            {previewQuery.isLoading ? (
              <div className="aspect-[9/16] w-full max-w-[280px] animate-pulse rounded-lg bg-muted" />
            ) : previewQuery.data ? (
              <video
                key={previewQuery.data}
                src={previewQuery.data}
                controls
                className="w-full max-w-[280px] rounded-lg border"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Fichier indisponible : il a probablement été purgé après 7 jours.
                Relancez un rendu pour le régénérer.
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Derniers rendus</p>
          {rendersQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
            </div>
          ) : renders.length === 0 ? (
            <EmptyState
              icon={Clapperboard}
              title="Aucun rendu"
              description="Aucune vidéo n'a encore été produite pour ce rapport."
            />
          ) : (
            <ul className="divide-y rounded-lg border">
              {renders.map((render) => (
                <li
                  key={render.period_identifier}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{render.period_identifier}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatDateTime(render.updated_at)}
                      {render.attempts > 1 ? ` · ${render.attempts} tentatives` : ""}
                    </span>
                    {render.last_error && (
                      <p className="mt-1 break-words text-xs text-destructive">
                        {render.last_error}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={render.status} />
                    {render.status !== "rendering" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={renderMutation.isPending}
                        onClick={() => renderMutation.mutate(render.period_identifier)}
                      >
                        Relancer
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
