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
import { ArrowLeft, Loader2, Trash2, X } from "lucide-react";
import { PeriodCalendar } from "@/components/period-calendar";
import { EstablishmentsPicker } from "@/components/establishments-picker";
import { QuestConflictDialog } from "@/components/quest-conflict-dialog";
import {
  getQuest,
  updateQuest,
  deleteQuest,
  setQuestPeriods,
  getQuestEstablishments,
  setQuestEstablishments,
} from "@/lib/services/questService";
import { getActiveTemplates } from "@/lib/services/templateService";
import {
  getAvailablePeriodsByType,
  getCurrentPeriodIdentifier,
} from "@/lib/services/periodService";
import {
  parseQuestRedundancyError,
  type QuestRedundancyDetails,
} from "@/lib/supabase/errorParser";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import type {
  CouponTemplate,
  QuestUpdate,
  PeriodType,
  QuestType,
  AvailablePeriod,
  ConsumptionType,
} from "@/types/database";

const CONSUMPTION_TYPES: { value: ConsumptionType; label: string }[] = [
  { value: "biere", label: "Bières" },
  { value: "cocktail", label: "Cocktails" },
  { value: "alcool", label: "Alcools" },
  { value: "soft", label: "Sodas / softs" },
  { value: "boisson_chaude", label: "Boissons chaudes" },
  { value: "restauration", label: "Restauration" },
];

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
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [conflictDetails, setConflictDetails] = useState<QuestRedundancyDetails | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    lore: "",
    slug: "",
    questType: "orders_count" as QuestType,
    consumptionType: "" as ConsumptionType | "",
    targetValue: "",
    periodType: "weekly" as PeriodType,
    couponTemplateId: "none",
    bonusXp: "0",
    bonusCashback: "0",
    displayOrder: "0",
    isActive: true,
    periods: [] as string[],
    establishments: [] as number[],
  });

  // Charger les données de la quête et les templates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quest, templatesData, establishments] = await Promise.all([
          getQuest(id),
          getActiveTemplates(),
          getQuestEstablishments(id),
        ]);

        setTemplates(templatesData || []);

        if (quest) {
          const periods = quest.quest_periods?.map((p) => p.period_identifier) || [];
          // Conversion centimes → euros pour amount_spent
          const targetValueDisplay = quest.quest_type === "amount_spent"
            ? (quest.target_value / 100).toString()
            : quest.target_value.toString();
          setForm({
            name: quest.name,
            description: quest.description || "",
            lore: quest.lore || "",
            slug: quest.slug,
            questType: quest.quest_type,
            consumptionType: (quest.consumption_type as ConsumptionType | null) || "",
            targetValue: targetValueDisplay,
            periodType: quest.period_type as PeriodType,
            couponTemplateId: quest.coupon_template_id?.toString() || "none",
            bonusXp: quest.bonus_xp.toString(),
            bonusCashback: (quest.bonus_cashback / 100).toString(),
            displayOrder: quest.display_order.toString(),
            isActive: quest.is_active,
            periods,
            establishments,
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de charger la quête",
        });
        router.push("/quests");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [id, router, toast]);

  // Charger toutes les périodes quand le type change
  useEffect(() => {
    const fetchPeriods = async () => {
      setLoadingPeriods(true);
      try {
        const periods = await getAvailablePeriodsByType(form.periodType);
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
  }, [form.periodType, loadingData]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Conversion euros → centimes pour amount_spent
      const targetValue = form.questType === "amount_spent"
        ? Math.round(parseFloat(form.targetValue) * 100)
        : parseInt(form.targetValue);

      // Validation : consumption_type obligatoire si quest_type = consumption_count
      if (form.questType === "consumption_count" && !form.consumptionType) {
        toast({
          variant: "destructive",
          title: "Type de produit requis",
          description: "Sélectionnez le type de produit à compter.",
        });
        setLoading(false);
        return;
      }

      const quest: QuestUpdate = {
        name: form.name,
        description: form.description || null,
        lore: form.lore || null,
        slug: form.slug,
        quest_type: form.questType,
        consumption_type:
          form.questType === "consumption_count" && form.consumptionType
            ? (form.consumptionType as ConsumptionType)
            : null,
        target_value: targetValue,
        period_type: form.periodType,
        coupon_template_id:
          form.couponTemplateId && form.couponTemplateId !== "none"
            ? parseInt(form.couponTemplateId)
            : null,
        bonus_xp: parseInt(form.bonusXp) || 0,
        bonus_cashback: Math.round(parseFloat(form.bonusCashback) * 100) || 0,
        display_order: parseInt(form.displayOrder) || 0,
        is_active: form.isActive,
      };

      await updateQuest(id, quest);
      await setQuestPeriods(id, form.periods);
      await setQuestEstablishments(id, form.establishments);

      toast({ title: "Quête modifiée avec succes" });
      router.push("/quests");
    } catch (error) {
      const conflict = parseQuestRedundancyError(error);
      if (conflict) {
        setConflictDetails(conflict);
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de modifier la quête",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteQuest(id);
      toast({ title: "Quête supprimée" });
      router.push("/quests");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer la quête",
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
            <h1 className="text-3xl font-bold">Modifier la quête</h1>
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
              <AlertDialogTitle>Supprimer cette quête ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Toutes les progressions et
                completions associees seront egalement supprimées.
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
            <CardTitle>Configuration de la quête</CardTitle>
            <CardDescription>
              Modifiez l&apos;objectif et les récompenses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nom et description */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la quête *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Habitué de la semaine"
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
                placeholder="Ex: Scannez 5 tickets cette semaine pour gagner une récompense"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lore">Texte narratif (lore)</Label>
              <Textarea
                id="lore"
                placeholder="Ex: Les anciens racontent que seuls les plus assidus peuvent relever ce défi..."
                value={form.lore}
                onChange={(e) => setForm({ ...form, lore: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Texte immersif affiché dans la modale de la quête côté client
              </p>
            </div>

            {/* Type et objectif */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Type de quête *</Label>
                <Select
                  value={form.questType}
                  onValueChange={(value: QuestType) => {
                    const updates: Partial<typeof form> = { questType: value };
                    if (value === "quest_completed" && form.periodType === "weekly") {
                      updates.periodType = "monthly";
                      updates.periods = [];
                    }
                    if (value !== "consumption_count") {
                      updates.consumptionType = "";
                    }
                    setForm({ ...form, ...updates });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xp_earned">Gagner de l&apos;XP</SelectItem>
                    <SelectItem value="amount_spent">Dépenser de l&apos;argent</SelectItem>
                    <SelectItem value="establishments_visited">Visiter des établissements</SelectItem>
                    <SelectItem value="orders_count">Passer des commandes</SelectItem>
                    <SelectItem value="quest_completed">Compléter des quêtes</SelectItem>
                    <SelectItem value="consumption_count">Consommer un type de produit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetValue">
                  Objectif {form.questType === "amount_spent" ? "(€)" : ""} *
                </Label>
                <Input
                  id="targetValue"
                  type="number"
                  step={form.questType === "amount_spent" ? "0.01" : "1"}
                  value={form.targetValue}
                  onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                  required
                  min={form.questType === "amount_spent" ? 0.01 : 1}
                />
                <p className="text-xs text-muted-foreground">
                  {form.questType === "xp_earned" && "Quantité d'XP à gagner"}
                  {form.questType === "amount_spent" && "Montant en euros (ex: 50 = 50€)"}
                  {form.questType === "establishments_visited" && "Nombre d'établissements à visiter"}
                  {form.questType === "orders_count" && "Nombre de commandes à passer"}
                  {form.questType === "quest_completed" && "Nombre de sous-périodes avec au moins 1 quête complétée"}
                  {form.questType === "consumption_count" && "Quantité de produits du type sélectionné à consommer"}
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
                    <SelectItem value="weekly" disabled={form.questType === "quest_completed"}>Hebdomadaire</SelectItem>
                    <SelectItem value="monthly">Mensuel</SelectItem>
                    <SelectItem value="yearly">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type de produit (visible uniquement pour consumption_count) */}
            {form.questType === "consumption_count" && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <Label htmlFor="consumptionType">Type de produit à compter *</Label>
                <Select
                  value={form.consumptionType}
                  onValueChange={(value: ConsumptionType) =>
                    setForm({ ...form, consumptionType: value })
                  }
                >
                  <SelectTrigger id="consumptionType">
                    <SelectValue placeholder="Sélectionner un type de produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSUMPTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  La progression compte la somme des <code>quantity</code> dans <code>receipt_consumption_items</code> du type choisi sur la période.
                </p>
              </div>
            )}

            {/* Périodes spécifiques */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label>Périodes spécifiques (optionnel)</Label>
                <p className="text-sm text-muted-foreground">
                  Laissez vide pour activer la quête sur toutes les périodes.
                  Sinon, selectionnez les périodes sur lesquelles cette quête sera active.
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
                  Aucune période spécifiée - la quête sera active sur toutes les périodes
                </p>
              )}

              <div className="flex items-center gap-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCurrentPeriod}
                >
                  Ajouter période actuelle
                </Button>
              </div>

              <PeriodCalendar
                periodType={form.periodType}
                availablePeriods={availablePeriods}
                selectedPeriods={form.periods}
                onTogglePeriod={handleTogglePeriod}
                loadingPeriods={loadingPeriods}
              />
            </div>

            {/* Scoping établissements (M2M quests_establishments) */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label>Établissements ciblés</Label>
                <p className="text-sm text-muted-foreground">
                  Restreignez la quête à certains établissements ou laissez vide pour qu&apos;elle
                  soit globale. Les triggers de redondance bloquent toute configuration qui
                  créerait un conflit avec une autre quête active de même signature.
                </p>
              </div>
              <EstablishmentsPicker
                value={form.establishments}
                onChange={(establishments) => setForm((prev) => ({ ...prev, establishments }))}
                disabled={loading}
              />
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
                      <SelectValue placeholder="Sélectionner un template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun coupon</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                          {template.amount
                            ? ` (${formatCurrency(template.amount)})`
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
                  <Label htmlFor="bonusCashback">Bonus Cashback (EUR)</Label>
                  <Input
                    id="bonusCashback"
                    type="number"
                    value={form.bonusCashback}
                    onChange={(e) => setForm({ ...form, bonusCashback: e.target.value })}
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Activation */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Quête active</Label>
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

      <QuestConflictDialog
        open={conflictDetails !== null}
        onOpenChange={(open) => {
          if (!open) setConflictDetails(null);
        }}
        details={conflictDetails}
      />
    </div>
  );
}
