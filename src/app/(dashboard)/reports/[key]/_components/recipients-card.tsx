"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookUser, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  countActiveRecipients,
  createContact,
  getReportRecipients,
  isDuplicateContactError,
  setReportRecipient,
} from "@/lib/services/emailReportService";
import { emailReportKeys } from "@/lib/queries/keys";
import { contactSchema } from "@/lib/schemas/emailReport.schema";
import type { ReportRecipientOption } from "@/types/database";

interface RecipientsCardProps {
  reportId: string;
}

/**
 * Destinataires d'un rapport : l'annuaire (`email_report_contacts`) presente en
 * cases a cocher. Une adresse se definit une fois, ici ou dans /reports/recipients,
 * puis se coche rapport par rapport. Le formulaire d'ajout cree le contact dans
 * l'annuaire ET le coche pour ce rapport, pour ne pas imposer un aller-retour.
 */
export function RecipientsCard({ reportId }: RecipientsCardProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);

  const recipientsQuery = useQuery({
    queryKey: emailReportKeys.recipients(reportId),
    queryFn: () => getReportRecipients(reportId),
  });

  const options = recipientsQuery.data ?? [];
  const activeCount = countActiveRecipients(options);
  const checkedCount = options.filter((o) => o.recipient_id !== null).length;

  const invalidate = () => {
    // Le compteur de destinataires est affiche sur la liste des rapports, et
    // l'annuaire affiche les rapports de chaque contact.
    queryClient.invalidateQueries({ queryKey: emailReportKeys.all });
  };

  const onToggle = async (option: ReportRecipientOption, checked: boolean) => {
    setPendingContactId(option.contact.id);
    // Optimiste : la case reagit tout de suite, le refetch confirme.
    queryClient.setQueryData<ReportRecipientOption[]>(
      emailReportKeys.recipients(reportId),
      (current) =>
        (current ?? []).map((o) =>
          o.contact.id === option.contact.id
            ? { ...o, recipient_id: checked ? "pending" : null }
            : o,
        ),
    );
    try {
      await setReportRecipient(reportId, option.contact.id, checked);
    } catch (err) {
      console.error(err);
      toast.error("Erreur", {
        description: "Impossible de modifier ce destinataire. Verifiez vos droits sur cette fonctionnalite.",
      });
    } finally {
      setPendingContactId(null);
      invalidate();
    }
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse({
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
      let contactId: string;
      let reused = false;
      try {
        const contact = await createContact(parsed.data);
        contactId = contact.id;
      } catch (err) {
        // L'adresse existe deja dans l'annuaire : on la coche plutot que de
        // renvoyer l'admin la chercher dans la liste.
        const existing = options.find((o) => o.contact.email === parsed.data.email);
        if (!isDuplicateContactError(err) || !existing) throw err;
        if (existing.recipient_id !== null) {
          setFormError("Cette adresse est deja cochee pour ce rapport.");
          return;
        }
        contactId = existing.contact.id;
        reused = true;
      }
      await setReportRecipient(reportId, contactId, true);
      setEmail("");
      setLabel("");
      invalidate();
      toast.success(
        reused ? "Destinataire coche" : "Destinataire ajoute",
        reused
          ? { description: "Cette adresse existait deja dans l'annuaire : elle a ete cochee pour ce rapport." }
          : { description: "L'adresse est aussi disponible pour les autres rapports." },
      );
    } catch (err) {
      console.error(err);
      setFormError("Ajout impossible. Verifiez vos droits sur cette fonctionnalite.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Destinataires</CardTitle>
            <CardDescription className="mt-1.5">
              Cochez les adresses de l&apos;annuaire qui recoivent ce rapport.{" "}
              {activeCount} destinataire{activeCount > 1 ? "s" : ""} actif
              {activeCount > 1 ? "s" : ""}
              {checkedCount > activeCount
                ? ` sur ${checkedCount} coche${checkedCount > 1 ? "s" : ""}`
                : ""}
              .
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/reports/recipients">
              <BookUser className="mr-2 h-4 w-4" aria-hidden="true" />
              Annuaire
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-md border">
          {recipientsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : options.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Annuaire vide"
              description="Ajoutez une premiere adresse ci-dessous : elle sera cochee pour ce rapport et disponible pour les autres."
            />
          ) : (
            <ul className="divide-y">
              {options.map((option) => {
                const { contact } = option;
                const checked = option.recipient_id !== null;
                const inputId = `recipient-${contact.id}`;
                return (
                  <li key={contact.id} className="flex items-center gap-3 px-4 py-3">
                    <Checkbox
                      id={inputId}
                      checked={checked}
                      disabled={pendingContactId === contact.id}
                      onCheckedChange={(value) => onToggle(option, value === true)}
                      aria-label={`${checked ? "Decocher" : "Cocher"} ${contact.email}`}
                    />
                    <Label
                      htmlFor={inputId}
                      className={
                        contact.is_active
                          ? "min-w-0 flex-1 cursor-pointer font-normal"
                          : "min-w-0 flex-1 cursor-pointer font-normal text-muted-foreground"
                      }
                    >
                      <span className="block truncate text-sm font-medium">{contact.email}</span>
                      {contact.label && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {contact.label}
                        </span>
                      )}
                    </Label>
                    {!contact.is_active && (
                      <Badge
                        variant="outline"
                        className="shrink-0"
                        title="Suspendu dans l'annuaire : exclu de tous les envois, meme coche."
                      >
                        Suspendu
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form onSubmit={onAdd} className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Nouvelle adresse</p>
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
            {adding ? "Ajout..." : "Ajouter et cocher"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
