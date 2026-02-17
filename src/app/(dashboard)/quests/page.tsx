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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Calendar,
  Filter,
  X,
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

function getPlaceholder(periodType: PeriodType): string {
  switch (periodType) {
    case "weekly":
      return "2026-W05";
    case "monthly":
      return "2026-01";
    case "yearly":
      return "2026";
  }
}

const periodLabels: Record<PeriodType, string> = {
  weekly: "Hebdomadaire",
  monthly: "Mensuel",
  yearly: "Annuel",
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
  const [periodFilter, setPeriodFilter] = useState("");
  const [showPeriodFilter, setShowPeriodFilter] = useState(false);
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

  // Filtrer par type de période
  let filteredQuests = quests.filter((q) => q.period_type === selectedPeriod);

  // Filtrer par période spécifique si un filtre est actif
  if (periodFilter) {
    filteredQuests = filteredQuests.filter((quest) => {
      const periods = quest.quest_periods || [];
      // Si pas de période assignée, la quête est active sur toutes les périodes
      if (periods.length === 0) return true;
      // Sinon, vérifier si cette période est dans la liste
      return periods.some((p) => p.period_identifier === periodFilter);
    });
  }

  const handlePeriodTabChange = (value: PeriodType) => {
    setSelectedPeriod(value);
    setPeriodFilter("");
    setShowPeriodFilter(false);
  };

  const handleApplyCurrentPeriodFilter = () => {
    setPeriodFilter(getCurrentPeriodIdentifier(selectedPeriod));
  };

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
            <div className="flex items-center justify-between gap-2 mb-4">
              <TabsList>
                <TabsTrigger value="weekly" className="text-xs sm:text-sm">Hebdo</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs sm:text-sm">Mensuel</TabsTrigger>
                <TabsTrigger value="yearly" className="text-xs sm:text-sm">Annuel</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {periodFilter && (
                  <Badge variant="secondary" className="hidden gap-1 sm:flex">
                    <Calendar className="h-3 w-3" />
                    {periodFilter}
                    <button
                      onClick={() => setPeriodFilter("")}
                      className="ml-1 rounded-full hover:bg-muted"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPeriodFilter(!showPeriodFilter)}
                >
                  <Filter className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filtrer par période</span>
                </Button>
              </div>
            </div>

            {showPeriodFilter && (
              <div className="mb-4 p-4 border rounded-lg space-y-3">
                <Label>Filtrer les quêtes actives pour une période spécifique</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={getPlaceholder(selectedPeriod)}
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleApplyCurrentPeriodFilter}
                  >
                    Période actuelle
                  </Button>
                  {periodFilter && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setPeriodFilter("")}
                    >
                      Effacer
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Affiche uniquement les quêtes actives pour cette période (ou celles sans restriction de période)
                </p>
              </div>
            )}

            <TabsContent value={selectedPeriod}>
              {filteredQuests.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Aucune quête configurée pour cette période
                </div>
              ) : (
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
                    {filteredQuests
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((quest) => {
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
