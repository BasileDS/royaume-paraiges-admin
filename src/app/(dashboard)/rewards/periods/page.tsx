"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, PlayCircle, CheckCircle, XCircle, Clock, Settings, Plus } from "lucide-react";
import { getPeriodConfigs } from "@/lib/services/rewardService";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { PeriodRewardConfig, PeriodType, DistributionStatus } from "@/types/database";

const statusConfig: Record<
  DistributionStatus,
  { label: string; variant: "default" | "success" | "destructive" | "warning"; icon: typeof Clock }
> = {
  pending: { label: "En attente", variant: "warning", icon: Clock },
  distributed: { label: "Distribue", variant: "success", icon: CheckCircle },
  cancelled: { label: "Annule", variant: "destructive", icon: XCircle },
  failed: { label: "Echoue", variant: "destructive", icon: XCircle },
};

export default function PeriodsPage() {
  const [configs, setConfigs] = useState<PeriodRewardConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("weekly");
  const { toast } = useToast();

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const data = await getPeriodConfigs();
        setConfigs(data || []);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger les périodes",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, [toast]);

  const filteredConfigs = configs.filter((c) => c.period_type === selectedPeriod);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/rewards">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Périodes</h1>
            <p className="text-muted-foreground">
              Historique et configuration des périodes de distribution
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/rewards/periods/create">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle periode
            </Button>
          </Link>
          <Link href="/rewards/distribute">
            <Button>
              <PlayCircle className="mr-2 h-4 w-4" />
              Distribuer
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des périodes</CardTitle>
          <CardDescription>
            Visualisez l&apos;état des distributions par periode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedPeriod}
            onValueChange={(v) => setSelectedPeriod(v as PeriodType)}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="weekly">Hebdomadaire</TabsTrigger>
              <TabsTrigger value="monthly">Mensuel</TabsTrigger>
              <TabsTrigger value="yearly">Annuel</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedPeriod}>
              {filteredConfigs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Aucune periode configurée
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periode</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Configuration</TableHead>
                      <TableHead>Date de distribution</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConfigs.map((config) => {
                      const status = config.status ? statusConfig[config.status as DistributionStatus] : statusConfig.pending;
                      const StatusIcon = status.icon;
                      const hasCustomTiers = config.custom_tiers !== null;

                      return (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">
                            {config.period_identifier}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant as "default"}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={hasCustomTiers ? "secondary" : "outline"}>
                              {hasCustomTiers ? "Personnalisée" : "Par défaut"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {config.distributed_at
                              ? formatDateTime(config.distributed_at)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {config.notes || "-"}
                          </TableCell>
                          <TableCell>
                            <Link href={`/rewards/periods/${config.period_type}/${config.period_identifier}`}>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
