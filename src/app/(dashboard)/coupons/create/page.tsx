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
import { ArrowLeft, Loader2, Search, User } from "lucide-react";
import { createManualCoupon, searchCustomers } from "@/lib/services/couponService";
import { getActiveTemplates } from "@/lib/services/templateService";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { CouponTemplate, Profile } from "@/types/database";

export default function CreateCouponPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<CouponTemplate[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    customerName: "",
    mode: "template" as "template" | "custom",
    templateId: "",
    amount: "",
    percentage: "",
    expiresAt: "",
    notes: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const templatesData = await getActiveTemplates();
        setTemplates(templatesData || []);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await searchCustomers(searchQuery);
      setSearchResults(results || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la recherche",
      });
    } finally {
      setSearching(false);
    }
  };

  const selectCustomer = (customer: Profile) => {
    const name =
      `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
      customer.email ||
      "Inconnu";
    setForm({
      ...form,
      customerId: customer.id,
      customerName: name,
    });
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.customerId) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Selectionnez un utilisateur",
      });
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await createManualCoupon({
        customerId: form.customerId,
        templateId: form.mode === "template" && form.templateId ? parseInt(form.templateId) : undefined,
        amount: form.mode === "custom" && form.amount ? Math.round(parseFloat(form.amount) * 100) : undefined,
        percentage: form.mode === "custom" && form.percentage ? parseInt(form.percentage) : undefined,
        expiresAt: form.expiresAt || undefined,
        notes: form.notes || undefined,
        adminId: user?.id,
      });

      let successMessage = "Coupon attribue avec succes";
      if (form.mode === "custom") {
        if (form.amount) {
          successMessage = `Bonus cashback de ${form.amount} EUR credite`;
        } else if (form.percentage) {
          successMessage = `Coupon de ${form.percentage}% attribue`;
        }
      } else if (form.mode === "template" && selectedTemplate) {
        if (selectedTemplate.amount) {
          successMessage = `Bonus cashback de ${formatCurrency(selectedTemplate.amount)} credite`;
        } else if (selectedTemplate.percentage) {
          successMessage = `Coupon de ${selectedTemplate.percentage}% attribue`;
        }
      }

      toast({ title: successMessage });
      router.push("/coupons");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de creer le coupon",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplate = templates.find(
    (t) => t.id.toString() === form.templateId
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/coupons">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Attribution manuelle</h1>
          <p className="text-muted-foreground">
            Attribuez un bonus cashback ou coupon a un utilisateur
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateur</CardTitle>
              <CardDescription>
                Recherchez et selectionnez l&apos;utilisateur destinataire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.customerId ? (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{form.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        ID: {form.customerId.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({ ...form, customerId: "", customerName: "" })
                    }
                  >
                    Changer
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Rechercher par nom ou email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSearch}
                      disabled={searching}
                    >
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="rounded-lg border">
                      {searchResults.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          className="flex w-full items-center gap-3 border-b p-3 text-left last:border-b-0 hover:bg-accent"
                          onClick={() => selectCustomer(customer)}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {`${customer.first_name || ""} ${
                                customer.last_name || ""
                              }`.trim() || "Sans nom"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {customer.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Valeur du coupon</CardTitle>
              <CardDescription>
                Utilisez un template ou definissez une valeur personnalisee
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select
                  value={form.mode}
                  onValueChange={(value: "template" | "custom") =>
                    setForm({ ...form, mode: value, templateId: "", amount: "", percentage: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template">Depuis un template</SelectItem>
                    <SelectItem value="custom">Valeur personnalisee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.mode === "template" ? (
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select
                    value={form.templateId}
                    onValueChange={(value) =>
                      setForm({ ...form, templateId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem
                          key={template.id}
                          value={template.id.toString()}
                        >
                          {template.name} -{" "}
                          {template.amount
                            ? formatCurrency(template.amount)
                            : template.percentage
                            ? formatPercentage(template.percentage)
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && (
                    <p className="text-sm text-muted-foreground">
                      {selectedTemplate.description}{" "}
                      {selectedTemplate.amount
                        ? "(Bonus Cashback immediat)"
                        : selectedTemplate.percentage
                        ? "(Coupon % sur commande)"
                        : ""}
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bonus Cashback (EUR)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 5"
                      value={form.amount}
                      onChange={(e) =>
                        setForm({ ...form, amount: e.target.value, percentage: "" })
                      }
                      min={0.01}
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground">
                      Sera credite immediatement au solde cashback
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Coupon (%)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 10"
                      value={form.percentage}
                      onChange={(e) =>
                        setForm({ ...form, percentage: e.target.value, amount: "" })
                      }
                      min={1}
                      max={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Cashback supplementaire sur la prochaine commande
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Options supplementaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date d&apos;expiration (optionnel)</Label>
                  <Input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) =>
                      setForm({ ...form, expiresAt: e.target.value })
                    }
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (optionnel)</Label>
                <Textarea
                  placeholder="Raison de l'attribution, contexte..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Link href="/coupons">
                  <Button type="button" variant="outline">
                    Annuler
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !form.customerId ||
                    (form.mode === "template" && !form.templateId) ||
                    (form.mode === "custom" && !form.amount && !form.percentage)
                  }
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Attribuer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
