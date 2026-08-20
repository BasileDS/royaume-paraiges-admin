"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  addRecipient,
  deleteRecipient,
  getRecipients,
  setRecipientActive,
} from "@/lib/services/emailReportService";
import { emailReportKeys } from "@/lib/queries/keys";
import { recipientSchema } from "@/lib/schemas/emailReport.schema";
import type { EmailReportRecipient } from "@/types/database";

interface RecipientsCardProps {
  reportId: string;
}

export function RecipientsCard({ reportId }: RecipientsCardProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<EmailReportRecipient | null>(null);

  const recipientsQuery = useQuery({
    queryKey: emailReportKeys.recipients(reportId),
    queryFn: () => getRecipients(reportId),
  });

  const recipients = recipientsQuery.data ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: emailReportKeys.recipients(reportId) });
    // Le compteur de destinataires est affiche sur la liste des rapports.
    queryClient.invalidateQueries({ queryKey: emailReportKeys.lists() });
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = recipientSchema.safeParse({
      email: email.trim(),
      label: label.trim() || null,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Adresse invalide");
      return;
    }
    setFormError(null);
    setAdding(true);
    try {
      await addRecipient(reportId, parsed.data.email, parsed.data.label ?? null);
      setEmail("");
      setLabel("");
      invalidate();
      toast.success("Destinataire ajoute");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Contrainte uq_email_report_recipient : meme adresse deja presente.
      setFormError(
        message.includes("uq_email_report_recipient") || message.includes("duplicate")
          ? "Cette adresse est deja dans la liste."
          : "Ajout impossible. Verifiez vos droits sur cette fonctionnalite.",
      );
    } finally {
      setAdding(false);
    }
  };

  const onToggle = async (recipient: EmailReportRecipient) => {
    try {
      await setRecipientActive(recipient.id, !recipient.is_active);
      invalidate();
    } catch (err) {
      console.error(err);
      toast.error("Erreur", { description: "Impossible de modifier ce destinataire" });
    }
  };

  const onDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteRecipient(pendingDelete.id);
      invalidate();
      toast.success(`${pendingDelete.email} retire de la liste`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur", { description: "Suppression impossible" });
    } finally {
      setPendingDelete(null);
    }
  };

  const activeCount = recipients.filter((r) => r.is_active).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Destinataires</CardTitle>
        <CardDescription>
          Adresses internes (equipe, gerants). {activeCount} active
          {activeCount > 1 ? "s" : ""} sur {recipients.length}.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form onSubmit={onAdd} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="recipient-email">Adresse e-mail</Label>
              <Input
                id="recipient-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom@auxparaiges.fr"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recipient-label">Libelle (optionnel)</Label>
              <Input
                id="recipient-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Gerant La Chapelle"
                autoComplete="off"
              />
            </div>
          </div>
          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" size="sm" disabled={adding || !email.trim()}>
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            {adding ? "Ajout..." : "Ajouter"}
          </Button>
        </form>

        <div className="rounded-md border">
          {recipientsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : recipients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun destinataire"
              description="Ce rapport ne partira nulle part tant que la liste est vide."
            />
          ) : (
            <ul className="divide-y">
              {recipients.map((recipient) => (
                <li
                  key={recipient.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p
                      className={
                        recipient.is_active
                          ? "truncate text-sm font-medium"
                          : "truncate text-sm font-medium text-muted-foreground line-through"
                      }
                    >
                      {recipient.email}
                    </p>
                    {recipient.label && (
                      <p className="truncate text-xs text-muted-foreground">
                        {recipient.label}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={recipient.is_active}
                      onCheckedChange={() => onToggle(recipient)}
                      aria-label={`${recipient.is_active ? "Suspendre" : "Reactiver"} ${recipient.email}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Retirer ${recipient.email}`}
                      onClick={() => setPendingDelete(recipient)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Retirer ce destinataire ?"
        description={
          <>
            <strong>{pendingDelete?.email}</strong> ne recevra plus ce rapport. Pour
            une pause temporaire, utilisez plutot l&apos;interrupteur.
          </>
        }
        confirmLabel="Retirer"
        destructive
        onConfirm={onDelete}
      />
    </Card>
  );
}
