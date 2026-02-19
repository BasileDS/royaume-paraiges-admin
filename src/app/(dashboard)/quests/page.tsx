"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Loader2,
  Target,
  Zap,
  MapPin,
  Receipt,
  Archive,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";
import { getQuests, toggleQuestActive } from "@/lib/services/questService";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { QuestWithRelations, PeriodType, QuestType } from "@/types/database";

function getCurrentPeriodIdentifier(periodType: PeriodType): string {
  const now = new Date();
  const year = now.getFullYear();

  switch (periodType) {
    case "weekly": {
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
    }
    case "monthly":
      return `${year}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    case "yearly":
      return `${year}`;
  }
}

function isQuestForPeriod(quest: QuestWithRelations, periodId: string): boolean {
  const periods = quest.quest_periods || [];
  if (periods.length === 0) return true;
  return periods.some((p) => p.period_identifier === periodId);
}

function getLatestPeriod(quest: QuestWithRelations): string {
  const periods = quest.quest_periods || [];
  if (periods.length === 0) return "";
  return [...periods].map((p) => p.period_identifier).sort().reverse()[0];
}

const periodTypeLabels: Record<PeriodType, string> = {
  weekly: "Semaine",
  monthly: "Mois",
  yearly: "Année",
};

const questTypeLabels: Record<QuestType, string> = {
  xp_earned: "Gagner de l'XP",
  amount_spent: "Dépenser de l'argent",
  establishments_visited: "Visiter des établissements",
  orders_count: "Passer des commandes",
};

const questTypeIcons: Record<QuestType, typeof Target> = {
  xp_earned: Zap,
  amount_spent: Receipt,
  establishments_visited: MapPin,
  orders_count: ShoppingCart,
};

export default function QuestsPage() {
  const [quests, setQuests] = useState<QuestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("weekly");
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchQuests = async () => {
    try {
      const data = await getQuests();
      setQuests(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les quêtes",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await toggleQuestActive(id, isActive);
      setQuests((prev) =>
        prev.map((q) => (q.id === id ? { ...q, is_active: isActive } : q))
      );
      toast({
        title: isActive ? "Quête activée" : "Quête désactivée",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier la quête",
      });
    }
  };

  const handlePeriodTabChange = (value: PeriodType) => {
    setSelectedPeriod(value);
    setShowUpcoming(false);
    setShowArchives(false);
  };

  const currentPeriodId = getCurrentPeriodIdentifier(selectedPeriod);
  const questsForType = quests.filter((q) => q.period_type === selectedPeriod);
  const currentQuests = questsForType.filter((q) => isQuestForPeriod(q, currentPeriodId));
  const nonCurrentQuests = questsForType.filter((q) => !isQuestForPeriod(q, currentPeriodId));

  // Split non-current quests into upcoming (has future periods) vs archived (only past periods)
  const upcomingQuests = nonCurrentQuests.filter((q) => {
    const latestPeriod = getLatestPeriod(q);
    return latestPeriod > currentPeriodId;
  });
  const archivedQuests = nonCurrentQuests.filter((q) => {
    const latestPeriod = getLatestPeriod(q);
    return latestPeriod <= currentPeriodId;
  });

  // Group upcoming quests by their earliest future period, sorted ascending (nearest first)
  const upcomingByPeriod = new Map<string, QuestWithRelations[]>();
  upcomingQuests.forEach((quest) => {
    const periods = (quest.quest_periods || []).map((p) => p.period_identifier).filter((p) => p > currentPeriodId);
    const earliestFuture = periods.sort()[0] || getLatestPeriod(quest);
    if (!upcomingByPeriod.has(earliestFuture)) {
      upcomingByPeriod.set(earliestFuture, []);
    }
    upcomingByPeriod.get(earliestFuture)!.push(quest);
  });
  const sortedUpcomingPeriods = [...upcomingByPeriod.keys()].sort();

  // Group archived quests by their latest period identifier, sorted descending (most recent first)
  const archivesByPeriod = new Map<string, QuestWithRelations[]>();
  archivedQuests.forEach((quest) => {
    const latestPeriod = getLatestPeriod(quest);
    if (!archivesByPeriod.has(latestPeriod)) {
      archivesByPeriod.set(latestPeriod, []);
    }
    archivesByPeriod.get(latestPeriod)!.push(quest);
  });
  const sortedArchivePeriods = [...archivesByPeriod.keys()].sort().reverse();

  const renderQuestRow = (quest: QuestWithRelations) => {
    const Icon = questTypeIcons[quest.quest_type];
    return (
      <TableRow
        key={quest.id}
        className="cursor-pointer"
        onClick={() => router.push(`/quests/${quest.id}`)}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">{quest.name}</p>
              {quest.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {quest.description}
                </p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">
            {questTypeLabels[quest.quest_type]}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="font-medium">
            {quest.quest_type === "amount_spent"
              ? formatCurrency(quest.target_value)
              : quest.target_value}
          </span>
          <span className="text-muted-foreground ml-1">
            {quest.quest_type === "xp_earned" && "XP"}
            {quest.quest_type === "establishments_visited" && "établissements"}
            {quest.quest_type === "orders_count" && "commandes"}
          </span>
        </TableCell>
        <TableCell>
          {quest.quest_periods && quest.quest_periods.length > 0 ? (
            <div className="flex flex-wrap gap-1 max-w-[150px]">
              {quest.quest_periods.slice(0, 3).map((p) => (
                <Badge key={p.id} variant="outline" className="text-xs">
                  {p.period_identifier}
                </Badge>
              ))}
              {quest.quest_periods.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{quest.quest_periods.length - 3}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              Toutes
            </span>
          )}
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            {quest.coupon_templates && (
              <Badge variant="secondary" className="mr-1">
                {quest.coupon_templates.amount
                  ? formatCurrency(quest.coupon_templates.amount)
                  : quest.coupon_templates.percentage
                  ? formatPercentage(quest.coupon_templates.percentage)
                  : quest.coupon_templates.name}
              </Badge>
            )}
            {quest.badge_types && (
              <Badge variant="secondary" className="mr-1">
                {quest.badge_types.name}
              </Badge>
            )}
            {quest.bonus_xp > 0 && (
              <Badge variant="outline" className="mr-1">
                +{quest.bonus_xp} XP
              </Badge>
            )}
            {quest.bonus_cashback > 0 && (
              <Badge variant="outline">
                +{formatCurrency(quest.bonus_cashback)}
              </Badge>
            )}
            {!quest.coupon_templates &&
              !quest.badge_types &&
              quest.bonus_xp === 0 &&
              quest.bonus_cashback === 0 && (
                <span className="text-muted-foreground">
                  Aucune
                </span>
              )}
          </div>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={quest.is_active}
            onCheckedChange={(checked) =>
              handleToggleActive(quest.id, checked)
            }
          />
        </TableCell>
      </TableRow>
    );
  };

  const renderQuestTable = (questList: QuestWithRelations[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Quête</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Objectif</TableHead>
          <TableHead>Périodes</TableHead>
          <TableHead>Récompenses</TableHead>
          <TableHead>Active</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {questList
          .sort((a, b) => a.display_order - b.display_order)
          .map(renderQuestRow)}
      </TableBody>
    </Table>
  );

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
        <div>
          <h1 className="text-3xl font-bold">Quêtes</h1>
          <p className="text-muted-foreground">
            Configurez les défis périodiques pour les utilisateurs
          </p>
        </div>
        <Link href="/quests/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle quête
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des quêtes</CardTitle>
          <CardDescription>
            Définissez les objectifs et récompenses pour chaque période
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedPeriod}
            onValueChange={(v) => handlePeriodTabChange(v as PeriodType)}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="weekly" className="text-xs sm:text-sm">Hebdo</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs sm:text-sm">Mensuel</TabsTrigger>
              <TabsTrigger value="yearly" className="text-xs sm:text-sm">Annuel</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedPeriod}>
              {/* Current period section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {periodTypeLabels[selectedPeriod]} en cours
                  </h3>
                  <Badge>{currentPeriodId}</Badge>
                </div>

                {currentQuests.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground border rounded-lg">
                    Aucune quête configurée pour la période en cours
                  </div>
                ) : (
                  renderQuestTable(currentQuests)
                )}
              </div>

              {/* Upcoming section */}
              {upcomingQuests.length > 0 && (
                <div className="border-t pt-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowUpcoming(!showUpcoming)}
                  >
                    {showUpcoming ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <CalendarClock className="h-4 w-4" />
                    Quêtes à venir
                    <Badge variant="secondary" className="ml-1">
                      {upcomingQuests.length}
                    </Badge>
                  </Button>

                  {showUpcoming && (
                    <div className="mt-4 space-y-6">
                      {sortedUpcomingPeriods.map((period) => {
                        const periodQuests = upcomingByPeriod.get(period)!;
                        return (
                          <div key={period}>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{period}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {periodQuests.length} quête{periodQuests.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            {renderQuestTable(periodQuests)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Archives section */}
              {archivedQuests.length > 0 && (
                <div className="border-t pt-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowArchives(!showArchives)}
                  >
                    {showArchives ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Archive className="h-4 w-4" />
                    Archives
                    <Badge variant="secondary" className="ml-1">
                      {archivedQuests.length}
                    </Badge>
                  </Button>

                  {showArchives && (
                    <div className="mt-4 space-y-6">
                      {sortedArchivePeriods.map((period) => {
                        const periodQuests = archivesByPeriod.get(period)!;
                        return (
                          <div key={period}>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{period}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {periodQuests.length} quête{periodQuests.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            {renderQuestTable(periodQuests)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
