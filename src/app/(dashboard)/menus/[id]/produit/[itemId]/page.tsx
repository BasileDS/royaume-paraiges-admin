"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getMenuItem, deleteMenuItem, describeMenuError } from "@/lib/services/menuService";
import { menuKeys } from "@/lib/queries/keys";
import { MenuItemForm } from "../../_form/MenuItemForm";

export default function EditMenuItemPage() {
  const { id, itemId } = useParams<{ id: string; itemId: string }>();
  const establishmentId = Number(id);
  const numericItemId = Number(itemId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const itemQuery = useQuery({
    queryKey: menuKeys.item(numericItemId),
    queryFn: () => getMenuItem(numericItemId),
    enabled: Number.isFinite(numericItemId),
  });

  const item = itemQuery.data;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMenuItem(numericItemId);
      queryClient.invalidateQueries({ queryKey: menuKeys.all });
      toast.success("Produit supprimé");
      router.push(`/menus/${establishmentId}`);
    } catch (err) {
      console.error(err);
      toast.error("Erreur", { description: describeMenuError(err) });
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/menus/${establishmentId}`}>
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Retour à la carte
        </Link>
      </Button>

      {itemQuery.isLoading ? (
        <div className="space-y-4">
          <div className="bg-muted h-9 w-64 animate-pulse rounded" />
          <div className="bg-muted h-96 w-full animate-pulse rounded-lg" />
        </div>
      ) : !item ? (
        <EmptyState
          title="Produit introuvable"
          description="Il a peut-être été supprimé depuis un autre onglet."
        />
      ) : (
        <>
          <PageHeader
            title={item.resolved_title}
            description={item.type_label}
            actions={
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
              >
                <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                Supprimer
              </Button>
            }
          />

          <MenuItemForm establishmentId={establishmentId} item={item} />

          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title={`Supprimer « ${item.resolved_title} » ?`}
            description={
              item.source === "beer"
                ? "Le produit et ses formats sont supprimés définitivement. Cette bière ne comptera plus comme disponible dans l'application des Compagnons. Pour la sortir de la carte en la gardant disponible, utiliser plutôt « Retirer de la carte »."
                : "Le produit et ses formats sont supprimés définitivement."
            }
            confirmLabel="Supprimer"
            destructive
            onConfirm={handleDelete}
          />
        </>
      )}
    </div>
  );
}
