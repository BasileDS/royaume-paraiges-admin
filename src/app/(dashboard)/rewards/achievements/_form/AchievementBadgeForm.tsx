"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import type {
  AchievementBadgePayload,
  AchievementCriterionType,
  BadgeRarity,
  EvaluationMode,
} from "@/lib/services/achievementBadgeService";

const CRITERION_OPTIONS: {
  value: AchievementCriterionType;
  label: string;
  defaultMode: EvaluationMode;
}[] = [
  { value: "first_order", label: "Première commande", defaultMode: "realtime" },
  { value: "orders_threshold", label: "Nombre total de commandes ≥ X", defaultMode: "realtime" },
  { value: "cities_visited", label: "Villes différentes visitées ≥ X", defaultMode: "realtime" },
  { value: "all_establishments_visited", label: "Tous les établissements visités", defaultMode: "realtime" },
  { value: "establishments_threshold", label: "Établissements distincts visités ≥ X", defaultMode: "realtime" },
  { value: "consecutive_weekly_quests", label: "Quêtes hebdo complétées N semaines d'affilée", defaultMode: "cron" },
];

const RARITY_OPTIONS: BadgeRarity[] = ["common", "rare", "epic", "legendary"];

function generateSlug(name: string): string {
  return (
    "achievement_" +
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
  );
}

interface FormState {
  slug: string;
  name: string;
  description: string;
  lore: string;
  icon: string;
  rarity: BadgeRarity;
  criterion_type: AchievementCriterionType;
  threshold: string;
  min_cities: string;
  n_weeks: string;
  evaluation_mode: EvaluationMode;
}

function buildCriterionParams(state: FormState): Record<string, unknown> {
  switch (state.criterion_type) {
    case "orders_threshold":
    case "establishments_threshold":
      return { threshold: parseInt(state.threshold, 10) || 0 };
    case "cities_visited":
      return { min_cities: parseInt(state.min_cities, 10) || 0 };
    case "consecutive_weekly_quests":
      return { n_weeks: parseInt(state.n_weeks, 10) || 0 };
    case "first_order":
    case "all_establishments_visited":
    default:
      return {};
  }
}

function validateParams(state: FormState): string | null {
  switch (state.criterion_type) {
    case "orders_threshold":
    case "establishments_threshold": {
      const n = parseInt(state.threshold, 10);
      if (!n || n < 2) return "Le seuil doit être ≥ 2.";
      return null;
    }
    case "cities_visited": {
      const n = parseInt(state.min_cities, 10);
      if (!n || n < 2) return "Le nombre minimum de villes doit être ≥ 2.";
      return null;
    }
    case "consecutive_weekly_quests": {
      const n = parseInt(state.n_weeks, 10);
      if (!n || n < 2) return "Le nombre de semaines doit être ≥ 2.";
      return null;
    }
    default:
      return null;
  }
}

interface Props {
  initial?: Partial<FormState>;
  submitLabel: string;
  onSubmit: (payload: AchievementBadgePayload) => Promise<void>;
  onCancel: () => void;
  lockSlug?: boolean;
}

export function AchievementBadgeForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  lockSlug,
}: Props) {
  const [state, setState] = useState<FormState>({
    slug: initial?.slug ?? "",
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    lore: initial?.lore ?? "",
    icon: initial?.icon ?? "🏅",
    rarity: (initial?.rarity as BadgeRarity) ?? "common",
    criterion_type: (initial?.criterion_type as AchievementCriterionType) ?? "first_order",
    threshold: initial?.threshold ?? "",
    min_cities: initial?.min_cities ?? "",
    n_weeks: initial?.n_weeks ?? "",
    evaluation_mode: (initial?.evaluation_mode as EvaluationMode) ?? "realtime",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (name: string) => {
    setState((prev) => ({
      ...prev,
      name,
      slug: lockSlug || prev.slug ? prev.slug : generateSlug(name),
    }));
  };

  const handleCriterionChange = (value: string) => {
    const opt = CRITERION_OPTIONS.find((o) => o.value === value);
    setState((prev) => ({
      ...prev,
      criterion_type: value as AchievementCriterionType,
      evaluation_mode: opt?.defaultMode ?? prev.evaluation_mode,
      threshold: "",
      min_cities: "",
      n_weeks: "",
    }));
  };

  const handleSubmit = async () => {
    const paramError = validateParams(state);
    if (!state.name.trim()) {
      setError("Le nom est requis.");
      return;
    }
    if (!state.slug.trim()) {
      setError("Le slug est requis.");
      return;
    }
    if (paramError) {
      setError(paramError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        slug: state.slug.trim(),
        name: state.name.trim(),
        description: state.description.trim() || null,
        lore: state.lore.trim() || null,
        icon: state.icon.trim() || null,
        rarity: state.rarity,
        criterion_type: state.criterion_type,
        criterion_params: buildCriterionParams(state),
        evaluation_mode: state.evaluation_mode,
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
          <CardDescription>
            Nom affiché, slug technique unique, visuel et texte narratif.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Nom</Label>
            <Input
              value={state.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="ex: Habitué"
            />
          </div>
          <div className="grid gap-2">
            <Label>Slug (unique)</Label>
            <Input
              value={state.slug}
              onChange={(e) => setState({ ...state, slug: e.target.value })}
              placeholder="achievement_orders_10"
              disabled={lockSlug}
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label>Icône (emoji)</Label>
            <Input
              value={state.icon}
              onChange={(e) => setState({ ...state, icon: e.target.value })}
              placeholder="🏅"
              maxLength={6}
            />
          </div>
          <div className="grid gap-2">
            <Label>Description (phrase courte)</Label>
            <Input
              value={state.description}
              onChange={(e) => setState({ ...state, description: e.target.value })}
              placeholder="10 commandes au compteur."
            />
          </div>
          <div className="grid gap-2">
            <Label>Lore (narratif, 1-2 lignes)</Label>
            <Textarea
              value={state.lore}
              onChange={(e) => setState({ ...state, lore: e.target.value })}
              rows={3}
              placeholder="Dix coupes, dix signatures sur le registre des Compagnons…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Critère de déblocage</CardTitle>
          <CardDescription>
            Le choix du type de critère détermine les paramètres à renseigner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Type de critère</Label>
            <Select
              value={state.criterion_type}
              onValueChange={handleCriterionChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRITERION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(state.criterion_type === "orders_threshold" ||
            state.criterion_type === "establishments_threshold") && (
            <div className="grid gap-2">
              <Label>Seuil (≥ 2)</Label>
              <Input
                type="number"
                min={2}
                value={state.threshold}
                onChange={(e) => setState({ ...state, threshold: e.target.value })}
                placeholder="10"
              />
            </div>
          )}

          {state.criterion_type === "cities_visited" && (
            <div className="grid gap-2">
              <Label>Nombre minimum de villes (≥ 2)</Label>
              <Input
                type="number"
                min={2}
                value={state.min_cities}
                onChange={(e) => setState({ ...state, min_cities: e.target.value })}
                placeholder="2"
              />
            </div>
          )}

          {state.criterion_type === "consecutive_weekly_quests" && (
            <div className="grid gap-2">
              <Label>Nombre de semaines d&apos;affilée (≥ 2)</Label>
              <Input
                type="number"
                min={2}
                value={state.n_weeks}
                onChange={(e) => setState({ ...state, n_weeks: e.target.value })}
                placeholder="4"
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Mode d&apos;évaluation</Label>
            <Select
              value={state.evaluation_mode}
              onValueChange={(v) =>
                setState({ ...state, evaluation_mode: v as EvaluationMode })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Temps réel (hook create_receipt)</SelectItem>
                <SelectItem value="cron">Cron nocturne (02:00 UTC)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Les critères de streak (N semaines d&apos;affilée) sont recommandés en mode cron.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rareté</CardTitle>
          <CardDescription>
            Définie manuellement à la création, modifiable à tout moment ci-dessous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label>Rareté</Label>
            <Select
              value={state.rarity}
              onValueChange={(v) =>
                setState({ ...state, rarity: v as BadgeRarity })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RARITY_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
