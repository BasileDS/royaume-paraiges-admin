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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createRewardTier } from "@/lib/services/rewardService";
import { getActiveTemplates } from "@/lib/services/templateService";
import { useToast } from "@/components/ui/use-toast";
import type { CouponTemplate, RewardTierInsert, PeriodType } from "@/types/database";

export default function CreateTierPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<CouponTemplate[]>([]);

  const [form, setForm] = useState({
    name: "",
    periodType: "weekly" as PeriodType,
    rankFrom: "",
    rankTo: "",
    couponTemplateId: "",
    displayOrder: "0",
    isActive: true,
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tier: RewardTierInsert = {
        name: form.name,
        period_type: form.periodType,
        rank_from: parseInt(form.rankFrom),
        rank_to: parseInt(form.rankTo),
        coupon_template_id: form.couponTemplateId
          ? parseInt(form.couponTemplateId)
          : null,
        display_order: parseInt(form.displayOrder),
        is_active: form.isActive,
      };

      await createRewardTier(tier);
      toast({ title: "Palier cree avec succes" });
      router.push("/rewards");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de creer le palier",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rewards">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nouveau palier</h1>
          <p className="text-muted-foreground">
            Creez un nouveau palier de recompenses
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Configuration du palier</CardTitle>
            <CardDescription>
              Definissez les rangs et les recompenses associees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du palier *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Champion, Podium, Top 10"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Type de periode *</Label>
                <Select
                  value={form.periodType}
                  onValueChange={(value: PeriodType) =>
                    setForm({ ...form, periodType: value })
                  }
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

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="rankFrom">Rang minimum *</Label>
                <Input
                  id="rankFrom"
                  type="number"
                  placeholder="1"
                  value={form.rankFrom}
                  onChange={(e) => setForm({ ...form, rankFrom: e.target.value })}
                  required
                  min={1}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rankTo">Rang maximum *</Label>
                <Input
                  id="rankTo"
                  type="number"
                  placeholder="1"
                  value={form.rankTo}
                  onChange={(e) => setForm({ ...form, rankTo: e.target.value })}
                  required
                  min={1}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayOrder">Ordre d&apos;affichage</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm({ ...form, displayOrder: e.target.value })
                  }
                  min={0}
                />
              </div>
            </div>

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
                  <SelectItem value="">Aucun coupon</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Palier actif</Label>
                <p className="text-sm text-muted-foreground">
                  Sera utilise lors des distributions
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isActive: checked })
                }
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link href="/rewards">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Creer le palier
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
