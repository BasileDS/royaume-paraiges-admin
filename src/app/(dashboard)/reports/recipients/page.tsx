"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import {
  createContact,
  deleteContact,
  getContacts,
  getEmailReports,
  getRecipientLinks,
  isDuplicateContactError,
  updateContact,
} from "@/lib/services/emailReportService";
import { emailReportKeys } from "@/lib/queries/keys";
import { contactSchema, contactUpdateSchema } from "@/lib/schemas/emailReport.schema";
import type { EmailReportContact } from "@/types/database";

/** Contact enrichi des rapports auxquels il est abonne, pour l'affichage. */
type ContactRow = EmailReportContact & {
  reports: { key: string; name: string }[];
};

/**
 * Annuaire des destinataires des rapports e-mail (migration 112). Une adresse
 * se definit ici une fois ; chaque rapport la coche ou la decoche dans sa fiche.
 * Suspendre un contact le retire de tous les envois sans toucher a ses cases.
 */
export default function ReportRecipientsPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ContactRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContactRow | null>(null);

  const contactsQuery = useQuery({ queryKey: emailReportKeys.contacts(), queryFn: getContacts });
  const linksQuery = useQuery({
    queryKey: emailReportKeys.recipientLinks(),
    queryFn: getRecipientLinks,
  });
  const reportsQuery = useQuery({ queryKey: emailReportKeys.lists(), queryFn: getEmailReports });

  const rows = useMemo<ContactRow[]>(() => {
    const reportsById = new Map(
      (reportsQuery.data ?? []).map((r) => [r.id, { key: r.key, name: r.name }]),
    );
    const reportsByContact = new Map<string, { key: string; name: string }[]>();
    for (const link of linksQuery.data ?? []) {
      const report = reportsById.get(link.report_id);
      if (!report) continue;
      const list = reportsByContact.get(link.contact_id) ?? [];
      list.push(report);
      reportsByContact.set(link.contact_id, list);
    }
    return (contactsQuery.data ?? []).map((contact) => ({
      ...contact,
      reports: reportsByContact.get(contact.id) ?? [],
    }));
  }, [contactsQuery.data, linksQuery.data, reportsQuery.data]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: emailReportKeys.all });

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse({ email: email.trim(), label: label.trim() || null });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Adresse invalide");
      return;
    }
    setFormError(null);
    setAdding(true);
    try {
      await createContact(parsed.data);
      setEmail("");
      setLabel("");
      invalidate();
      toast.success("Adresse ajoutee a l'annuaire", {
        description: "Cochez-la ensuite dans les rapports qu'elle doit recevoir.",
      });
    } catch (err) {
      setFormError(
        isDuplicateContactError(err)
          ? "Cette adresse est deja dans l'annuaire."
          : "Ajout impossible. Verifiez vos droits sur cette fonctionnalite.",
      );
    } finally {
      setAdding(false);
    }
  };

  const onToggleActive = async (contact: ContactRow) => {
    try {
      await updateContact(contact.id, { is_active: !contact.is_active });
      invalidate();
      toast.success(
        contact.is_active ? `${contact.email} suspendu` : `${contact.email} reactive`,
        contact.is_active
          ? { description: "Exclu de tous les envois. Ses cases restent cochees pour la reprise." }
          : undefined,
      );
    } catch (err) {
      console.error(err);
      toast.error("Erreur", { description: "Impossible de modifier ce contact" });
    }
  };

  const onDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteContact(pendingDelete.id);
      invalidate();
      toast.success(`${pendingDelete.email} supprime de l'annuaire`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur", { description: "Suppression impossible" });
    } finally {
      setPendingDelete(null);
    }
  };

  const columns: DataTableColumn<ContactRow>[] = [
    {
      key: "email",
      header: "Adresse",
      sortable: true,
      sortValue: (row) => row.email,
      cell: (row) => (
        <div className="min-w-0">
          <p
            className={
              row.is_active
                ? "truncate text-sm font-medium"
                : "truncate text-sm font-medium text-muted-foreground line-through"
            }
          >
            {row.email}
          </p>
          {row.label && <p className="truncate text-xs text-muted-foreground">{row.label}</p>}
        </div>
      ),
    },
    {
      key: "reports",
      header: "Rapports",
      sortable: true,
      sortValue: (row) => row.reports.length,
      cell: (row) =>
        row.reports.length === 0 ? (
          <span className="text-sm text-muted-foreground">Aucun</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.reports.map((report) => (
              <Link
                key={report.key}
                href={`/reports/${report.key}`}
                onClick={(e) => e.stopPropagation()}
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Badge variant="outline" className="hover:bg-muted">
                  {report.name}
                </Badge>
              </Link>
            ))}
          </div>
        ),
    },
    {
      key: "is_active",
      header: "Actif",
      sortable: true,
      sortValue: (row) => (row.is_active ? 1 : 0),
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={row.is_active}
            onCheckedChange={() => onToggleActive(row)}
            aria-label={`${row.is_active ? "Suspendre" : "Reactiver"} ${row.email}`}
          />
        </div>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      headerClassName: "w-[88px]",
      cell: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Modifier ${row.email}`}
            onClick={() => setEditing(row)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label={`Supprimer ${row.email}`}
            onClick={() => setPendingDelete(row)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ];

  const activeCount = rows.filter((r) => r.is_active).length;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/reports">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Rapports e-mail
        </Link>
      </Button>

      <PageHeader
        title="Annuaire des destinataires"
        description="Chaque adresse est definie une fois ici, puis cochee ou decochee dans la fiche de chaque rapport. Adresses internes uniquement (equipe, gerants) : pas de clients de l'app."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nouvelle adresse</CardTitle>
          <CardDescription>
            Elle rejoint l&apos;annuaire sans etre cochee nulle part : ouvrez ensuite les
            rapports concernes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAdd} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Adresse e-mail</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom@auxparaiges.fr"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-label">Libelle (optionnel)</Label>
                <Input
                  id="contact-label"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adresses</CardTitle>
          <CardDescription>
            {activeCount} active{activeCount > 1 ? "s" : ""} sur {rows.length}. Suspendre une
            adresse l&apos;exclut de tous les envois sans decocher ses rapports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(row) => row.id}
            loading={contactsQuery.isLoading}
            emptyState={
              <EmptyState
                icon={Users}
                title="Annuaire vide"
                description="Ajoutez une premiere adresse ci-dessus."
              />
            }
          />
        </CardContent>
      </Card>

      {editing && (
        <EditContactSheet
          contact={editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Supprimer cette adresse ?"
        description={
          <>
            <strong>{pendingDelete?.email}</strong> sera retiree de l&apos;annuaire et decochee de{" "}
            {pendingDelete?.reports.length ?? 0} rapport
            {(pendingDelete?.reports.length ?? 0) > 1 ? "s" : ""}. Pour une pause temporaire,
            suspendez-la plutot avec l&apos;interrupteur.
          </>
        }
        confirmLabel="Supprimer"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}

interface EditContactSheetProps {
  contact: ContactRow;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/**
 * Monte conditionnellement par la page : le state part des props, pas d'effet
 * de reinitialisation (regle eslint react-hooks/set-state-in-effect).
 */
function EditContactSheet({ contact, onOpenChange, onSaved }: EditContactSheetProps) {
  const [email, setEmail] = useState(contact.email);
  const [label, setLabel] = useState(contact.label ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactUpdateSchema.safeParse({
      email: email.trim(),
      label: label.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Saisie invalide");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateContact(contact.id, parsed.data);
      toast.success("Adresse mise a jour", {
        description: "La modification vaut pour tous les rapports qui la recoivent.",
      });
      onSaved();
    } catch (err) {
      setError(
        isDuplicateContactError(err)
          ? "Une autre entree de l'annuaire porte deja cette adresse."
          : "Enregistrement impossible. Verifiez vos droits sur cette fonctionnalite.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open
      onOpenChange={onOpenChange}
      title="Modifier l'adresse"
      description="Le changement s'applique a tous les rapports qui recoivent ce contact."
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="edit-contact-form" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      }
    >
      <form id="edit-contact-form" onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-contact-email">Adresse e-mail</Label>
          <Input
            id="edit-contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-contact-label">Libelle (optionnel)</Label>
          <Input
            id="edit-contact-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Gerant La Chapelle"
            autoComplete="off"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </form>
    </BottomSheet>
  );
}
