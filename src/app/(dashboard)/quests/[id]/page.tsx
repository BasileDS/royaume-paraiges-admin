"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Trash2, X, Calendar } from "lucide-react";
import { getQuest, updateQuest, deleteQuest, setQuestPeriods } from "@/lib/services/questService";
import { getActiveTemplates } from "@/lib/services/templateService";
import {
  getAvailablePeriodsByType,
  getCurrentPeriodIdentifier,
  formatPeriodLabel,
  getAvailableYears,
} from "@/lib/services/periodService";
import { useToast } from "@/components/ui/use-toast";
import type {
  CouponTemplate,
  QuestUpdate,
  PeriodType,
  QuestType,
  AvailablePeriod,
} from "@/types/database";

export default function EditQuestPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const id = Number(params.id);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [templates, setTemplates] = useState<CouponTemplate[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<AvailablePeriod[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loadingPeriods, setLoadingPeriods] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    slug: "",
    questType: "orders_count" as QuestType,
    targetValue: "",
    periodType: "weekly" as PeriodType,
    couponTemplateId: "none",
    bonusXp: "0",
    bonusCashback: "0",
    displayOrder: "0",
    isActive: true,
    periods: [] as string[],
  });

  // Charger les données de la quête et les templates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quest, templatesData, years] = await Promise.all([
          getQuest(id),
          getActiveTemplates(),
          getAvailableYears(),
        ]);

        setTemplates(templatesData || []);
        setAvailableYears(years);

        if (quest) {
          const periods = quest.quest_periods?.map((p) => p.period_identifier) || [];
          setForm({
            name: quest.name,
            description: quest.description || "",
            slug: quest.slug,
            questType: quest.quest_type,
            targetValue: quest.target_value.toString(),
            periodType: quest.period_type,
            couponTemplateId: quest.coupon_template_id?.toString() || "none",
            bonusXp: quest.bonus_xp.toString(),
            bonusCashback: quest.bonus_cashback.toString(),
            displayOrder: quest.display_order.toString(),
            isActive: quest.is_active,
            periods,
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger la quete",
        });
        router.push("/quests");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [id, router, toast]);

  // Charger les périodes quand le type ou l'année change
  useEffect(() => {
    const fetchPeriods = async () => {
      setLoadingPeriods(true);
      try {
        const periods = await getAvailablePeriodsByType(form.periodType, {
          year: selectedYear,
        });
        setAvailablePeriods(periods);
      } catch (error) {
        console.error(error);
        setAvailablePeriods([]);
      } finally {
        setLoadingPeriods(false);
      }
    };
    if (!loadingData) {
      fetchPeriods();
    }
  }, [form.periodType, selectedYear, loadingData]);

  const handlePeriodTypeChange = (value: PeriodType) => {
    setForm({ ...form, periodType: value, periods: [] });
  };

  const handleTogglePeriod = (periodIdentifier: string) => {
    setForm((prev) => ({
      ...prev,
      periods: prev.periods.includes(periodIdentifier)
        ? prev.periods.filter((p) => p !== periodIdentifier)
        : [...prev.periods, periodIdentifier],
    }));
  };

  const handleRemovePeriod = (period: string) => {
    setForm({ ...form, periods: form.periods.filter((p) => p !== period) });
  };

  const handleAddCurrentPeriod = () => {
    const current = getCurrentPeriodIdentifier(form.periodType);
    if (!form.periods.includes(current)) {
      setForm({ ...form, periods: [...form.periods, current] });
    }
  };

  const handleSelectAllYear = () => {
    const yearPeriods = availablePeriods.map((p) => p.period_identifier);
    const allSelected = yearPeriods.every((p) => form.periods.includes(p));

    if (allSelected) {
      setForm({
        ...form,
        periods: form.periods.filter((p) => !yearPeriods.includes(p)),
      });
    } else {
      const newPeriods = [...new Set([...form.periods, ...yearPeriods])];
      setForm({ ...form, periods: newPeriods });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const quest: QuestUpdate = {
        name: form.name,
        description: form.description || null,
        slug: form.slug,
        quest_type: form.questType,
        target_value: parseInt(form.targetValue),
        period_type: form.periodType,
        coupon_template_id:
          form.couponTemplateId && form.couponTemplateId !== "none"
            ? parseInt(form.couponTemplateId)
            : null,
        bonus_xp: parseInt(form.bonusXp) || 0,
        bonus_cashback: parseInt(form.bonusCashback) || 0,
        display_order: parseInt(form.displayOrder) || 0,
        is_active: form.isActive,
      };

      await updateQuest(id, quest);
      await setQuestPeriods(id, form.periods);

      toast({ title: "Quete modifiee avec succes" });
      router.push("/quests");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier la quete",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteQuest(id);
      toast({ title: "Quete supprimee" });
      router.push("/quests");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer la quete",
      });
      setDeleting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const yearPeriods = availablePeriods.map((p) => p.period_identifier);
  const allYearSelected =
    yearPeriods.length > 0 && yearPeriods.every((p) => form.periods.includes(p));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/quests">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Modifier la quete</h1>
            <p className="text-muted-foreground">{form.name}</p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={deleting}>
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Supprimer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette quete ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irreversible. Toutes les progressions et
                completions associees seront egalement supprimees.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Configuration de la quete</CardTitle>
            <CardDescription>
              Modifiez l&apos;objectif et les recompenses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nom et description */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la quete *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Habitue de la semaine"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Identifiant unique (slug) *</Label>
                <Input
                  id="slug"
                  placeholder="habitue_semaine"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Ex: Scannez 5 tickets cette semaine pour gagner une recompense"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Type et objectif */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Type de quete *</Label>
                <Select
                  value={form.questType}
                  onValueChange={(value: QuestType) =>
                    setForm({ ...form, questType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xp_earned">Gagner de l&apos;XP</SelectItem>
                    <SelectItem value="amount_spent">Dépenser de l&apos;argent</SelectItem>
                    <SelectItem value="establishments_visited">Visiter des établissements</SelectItem>
                    <SelectItem value="orders_count">Passer des commandes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetValue">Objectif *</Label>
                <Input
                  id="targetValue"
                  type="number"
                  value={form.targetValue}
                  onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                  required
                  min={1}
                />
                <p className="text-xs text-muted-foreground">
                  {form.questType === "xp_earned" && "Quantité d'XP à gagner"}
                  {form.questType === "amount_spent" && "Montant en centimes (ex: 5000 = 50€)"}
                  {form.questType === "establishments_visited" && "Nombre d'établissements à visiter"}
                  {form.questType === "orders_count" && "Nombre de commandes à passer"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Periode *</Label>
                <Select
                  value={form.periodType}
                  onValueChange={handlePeriodTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="yearly">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Périodes spécifiques */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label>Periodes specifiques (optionnel)</Label>
                <p className="text-sm text-muted-foreground">
                  Laissez vide pour activer la quete sur toutes les periodes.
                  Sinon, selectionnez les periodes sur lesquelles cette quete sera active.
                </p>
              </div>

              {/* Périodes sélectionnées */}
              {form.periods.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.periods.sort().map((period) => (
                    <Badge key={period} variant="secondary" className="gap-1">
                      {period}
                      <button
                        type="button"
                        onClick={() => handleRemovePeriod(period)}
                        className="ml-1 rounded-full hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {form.periods.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Aucune periode specifiee - la quete sera active sur toutes les periodes
                </p>
              )}

              {/* Sélecteur d'année et liste de périodes */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Label>Annee:</Label>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(v) => setSelectedYear(parseInt(v))}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCurrentPeriod}
                  >
                    Ajouter periode actuelle
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllYear}
                  >
                    {allYearSelected ? "Desélectionner" : "Selectionner"} tout {selectedYear}
                  </Button>
                </div>

                {loadingPeriods ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[200px] rounded-md border p-2">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {availablePeriods.map((period) => {
                        const isSelected = form.periods.includes(period.period_identifier);
                        return (
                          <label
                            key={period.id}
                            className={`flex items-center space-x-2 rounded-md border p-2 cursor-pointer transition-colors ${
                              isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleTogglePeriod(period.period_identifier)}
                            />
                            <span className="text-sm flex-1">
                              {formatPeriodLabel(form.periodType, period.period_identifier)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>

            {/* Recompenses */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Recompenses</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Template de coupon</Label>
                  <Select
                    value={form.couponTemplateId}
                    onValueChange={(value) =>
                      setForm({ ...form, couponTemplateId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun coupon</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                          {template.amount
                            ? ` (${(template.amount / 100).toFixed(2)}€)`
                            : template.percentage
                            ? ` (${template.percentage}%)`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Ordre d&apos;affichage</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                    min={0}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bonusXp">Bonus XP</Label>
                  <Input
                    id="bonusXp"
                    type="number"
                    value={form.bonusXp}
                    onChange={(e) => setForm({ ...form, bonusXp: e.target.value })}
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bonusCashback">Bonus Cashback (centimes)</Label>
                  <Input
                    id="bonusCashback"
                    type="number"
                    value={form.bonusCashback}
                    onChange={(e) => setForm({ ...form, bonusCashback: e.target.value })}
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* Activation */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Quete active</Label>
                <p className="text-sm text-muted-foreground">
                  Sera visible et accessible par les utilisateurs
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Link href="/quests">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
