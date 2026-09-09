"use client";

// Gestion des accès par fonctionnalité (super admin uniquement, migration 057).
// Onglet « Administrateurs » de /settings. Les admins sont listés dans un
// accordéon : l'en-tête résume l'état des accès, et les interrupteurs par
// entrée de la sidebar ne sont montés que dans le panneau déplié - on ne
// modifie un admin qu'après l'avoir ouvert. Désactiver = insérer une ligne
// dans admin_disabled_features (blocage dur par le middleware + masquage
// sidebar/palette côté client).

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldOff, UserCog, UserPlus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCurrentAdmin } from "@/components/providers/CurrentAdminProvider";
import { AddAdminDialog } from "./add-admin-dialog";
import {
  disableFeature,
  enableFeature,
  getAllDisabledFeatures,
  getManagedAdmins,
} from "@/lib/services/adminAccessService";
import { adminAccessKeys } from "@/lib/queries/keys";
import { navigationGroups } from "@/lib/navigation";
import type { FeatureKey } from "@/lib/features";
import type { Profile } from "@/types/database";

// Nombre de fonctionnalités gérables (entrées de la sidebar portant une featureKey).
const MANAGED_FEATURE_COUNT = navigationGroups.reduce(
  (count, group) => count + group.items.filter((item) => item.featureKey).length,
  0
);

function adminDisplayName(admin: Profile) {
  return (
    [admin.first_name, admin.last_name].filter(Boolean).join(" ") ||
    admin.username ||
    admin.email ||
    "Administrateur"
  );
}

export function AdminAccessSection() {
  const { isSuperAdmin, isLoading: adminLoading } = useCurrentAdmin();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: admins, isLoading: adminsLoading } = useQuery({
    queryKey: adminAccessKeys.admins(),
    queryFn: getManagedAdmins,
    enabled: isSuperAdmin,
  });

  const { data: disabledRows, isLoading: disabledLoading } = useQuery({
    queryKey: adminAccessKeys.disabledFeatures(),
    queryFn: getAllDisabledFeatures,
    enabled: isSuperAdmin,
  });

  if (adminLoading || (isSuperAdmin && (adminsLoading || disabledLoading))) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // L'onglet n'est affiché qu'au super admin ; garde par défense en profondeur
  // (deep-link ?tab=admins par un admin normal).
  if (!isSuperAdmin) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="Section réservée au super admin"
        description="Seul un compte super admin peut gérer les accès des administrateurs."
      />
    );
  }

  // profile_id → set des features désactivées
  const disabledByProfile = new Map<string, Set<string>>();
  for (const row of disabledRows ?? []) {
    const set = disabledByProfile.get(row.profile_id) ?? new Set<string>();
    set.add(row.feature_key);
    disabledByProfile.set(row.profile_id, set);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Activez ou désactivez l&apos;accès aux fonctionnalités de
          l&apos;interface admin pour chaque administrateur. Une fonctionnalité
          désactivée disparaît de la navigation et son URL est bloquée.
          Dépliez un administrateur pour modifier ses accès.
        </p>
        <Button onClick={() => setAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Ajouter un admin
        </Button>
      </div>

      <AddAdminDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {(admins ?? []).length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Aucun administrateur à gérer"
          description="Les autres comptes admin (hors super admins et compte système) apparaîtront ici."
        />
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {(admins ?? []).map((admin) => {
            const disabledFeatures =
              disabledByProfile.get(admin.id) ?? new Set<string>();
            const disabledCount = disabledFeatures.size;
            return (
              <AccordionItem
                key={admin.id}
                value={admin.id}
                className="rounded-lg border bg-card px-4 shadow-sm last:border-b"
              >
                <AccordionTrigger className="gap-3 hover:no-underline">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex min-w-0 items-center gap-2 font-semibold">
                      <UserCog
                        className="h-5 w-5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="truncate">{adminDisplayName(admin)}</span>
                    </span>
                    {admin.email && (
                      <span className="truncate text-sm font-normal text-muted-foreground">
                        {admin.email}
                      </span>
                    )}
                    <Badge
                      variant={disabledCount > 0 ? "secondary" : "outline"}
                      className="ml-auto mr-1 font-normal"
                    >
                      {disabledCount === 0
                        ? "Tous les accès"
                        : `${MANAGED_FEATURE_COUNT - disabledCount} / ${MANAGED_FEATURE_COUNT} accès`}
                    </Badge>
                  </div>
                </AccordionTrigger>
                {/* Radix ne monte le contenu qu'à l'ouverture : les
                    interrupteurs n'existent que pour l'admin déplié. */}
                <AccordionContent className="border-t pt-4">
                  <AdminFeatureSwitches
                    admin={admin}
                    disabledFeatures={disabledFeatures}
                  />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

function AdminFeatureSwitches({
  admin,
  disabledFeatures,
}: {
  admin: Profile;
  disabledFeatures: Set<string>;
}) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async (input: { featureKey: FeatureKey; enable: boolean }) => {
      const payload = { profileId: admin.id, featureKey: input.featureKey };
      if (input.enable) {
        await enableFeature(payload);
      } else {
        await disableFeature(payload);
      }
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: adminAccessKeys.all });
      toast.success(input.enable ? "Accès réactivé" : "Accès désactivé");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Impossible de modifier cet accès");
    },
  });

  return (
    <div className="space-y-6">
      {navigationGroups.map((group) => {
        const items = group.items.filter((item) => item.featureKey);
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const featureKey = item.featureKey as FeatureKey;
                const enabled = !disabledFeatures.has(featureKey);
                const switchId = `${admin.id}-${featureKey}`;
                return (
                  <div
                    key={featureKey}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <Label
                      htmlFor={switchId}
                      className="flex items-center gap-2 text-sm font-normal"
                    >
                      <item.icon
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      {item.name}
                    </Label>
                    <Switch
                      id={switchId}
                      checked={enabled}
                      disabled={toggleMutation.isPending}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ featureKey, enable: checked })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
