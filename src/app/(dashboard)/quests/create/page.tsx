"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Loader2, X } from "lucide-react";
import { PeriodCalendar } from "@/components/period-calendar";
import { createQuest, setQuestPeriods } from "@/lib/services/questService";
import { getActiveTemplates } from "@/lib/services/templateService";
import {
  getAvailablePeriodsByType,
  getCurrentPeriodIdentifier,
} from "@/lib/services/periodService";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import type {
  CouponTemplate,
  QuestInsert,
  PeriodType,
  QuestType,
  AvailablePeriod,
} from "@/types/database";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function CreateQuestPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<CouponTemplate[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<AvailablePeriod[]>([]);
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

  // Charger les templates au montage
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await getActiveTemplates();
        setTemplates(data || []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchTemplates();
  }, []);

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
    fetchPeriods();
  }, [form.periodType]);

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

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

      const quest: QuestInsert = {
        name: form.name,
        description: form.description || null,
        slug: form.slug,
        quest_type: form.questType,
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

      const createdQuest = await createQuest(quest);

      // Sauvegarder les périodes si elles sont définies
      if (form.periods.length > 0) {
        await setQuestPeriods(createdQuest.id, form.periods);
      }

      toast({ title: "Quête créée avec succès" });
      router.push("/quests");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la quête",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/quests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nouvelle quête</h1>
          <p className="text-muted-foreground">
            Créez un nouveau défi périodique
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Configuration de la quête</CardTitle>
            <CardDescription>
              Définissez l&apos;objectif et les récompenses
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
                  onChange={(e) => handleNameChange(e.target.value)}
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

            {/* Type et objectif */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Type de quête *</Label>
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
                <Label htmlFor="targetValue">
                  Objectif {form.questType === "amount_spent" ? "(€)" : ""} *
                </Label>
                <Input
                  id="targetValue"
                  type="number"
                  step={form.questType === "amount_spent" ? "0.01" : "1"}
                  placeholder={
                    form.questType === "xp_earned"
                      ? "500"
                      : form.questType === "amount_spent"
                      ? "50"
                      : form.questType === "establishments_visited"
                      ? "3"
                      : "5"
                  }
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
                </p>
              </div>

              <div className="space-y-2">
                <Label>Période *</Label>
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
                <Label>Périodes spécifiques (optionnel)</Label>
                <p className="text-sm text-muted-foreground">
                  Laissez vide pour activer la quête sur toutes les périodes.
                  Sinon, sélectionnez les périodes sur lesquelles cette quête sera active.
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

            {/* Recompenses */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Récompenses</h3>
              <p className="text-sm text-muted-foreground">
                Configurez au moins une récompense pour cette quete
              </p>

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
                            ? ` (${formatCurrency(template.amount)} - Bonus CB immédiat)`
                            : template.percentage
                            ? ` (${template.percentage}% - Coupon sur commande)`
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
                    placeholder="0"
                    value={form.bonusXp}
                    onChange={(e) => setForm({ ...form, bonusXp: e.target.value })}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    XP supplémentaire attribué à la complétion
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bonusCashback">Bonus Cashback (EUR)</Label>
                  <Input
                    id="bonusCashback"
                    type="number"
                    placeholder="0"
                    value={form.bonusCashback}
                    onChange={(e) => setForm({ ...form, bonusCashback: e.target.value })}
                    min={0}
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cashback supplémentaire (ex: 5 = 5€)
                  </p>
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
                Créer la quête
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
