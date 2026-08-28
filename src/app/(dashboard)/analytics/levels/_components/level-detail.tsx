"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Coins,
  Euro,
  Gauge,
  Hourglass,
  Receipt,
  Route,
  ShoppingBasket,
  TrendingUp,
  Users,
} from "lucide-react";

import { analyticsKeys } from "@/lib/queries/keys";
import { getLevelMembers } from "@/lib/services/analyticsService";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { LevelMembersTable } from "./level-members-table";
import type { LevelRow } from "./level-stats-table";

const iconClass = "h-4 w-4 text-muted-foreground";

const formatDays = (days: number) =>
  days < 1
    ? "< 1 j"
    : `${days.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} j`;

/**
 * Fiche d'un niveau : coût réel du palier, valeur client des joueurs qui s'y
 * trouvent, et liste nominative de ces joueurs.
 */
export function LevelDetail({ row, year }: { row: LevelRow; year: number }) {
  const membersQuery = useQuery({
    queryKey: analyticsKeys.levelMembers(year, row.level),
    queryFn: () => getLevelMembers(row.level, year),
  });

  const basketCents =
    row.receipts_count > 0
      ? Math.round(row.euro_spent_cents / row.receipts_count)
      : null;
  // Taux effectif : PdB générés rapportés aux euros encaissés. Il dépasse le
  // coefficient nominal parce qu'il inclut aussi les PdB de quête et de bonus.
  const effectiveRate =
    row.euro_spent_cents > 0
      ? (row.pdb_generated_cents / row.euro_spent_cents) * 100
      : null;
  // Écart entre le coût réel du palier et son coût théorique : négatif = les
  // quêtes et bonus ont fait une partie du chemin à la place des achats.
  const costGapPct =
    row.median_euro_to_level_cents !== null &&
    row.theoretical_euro_cents !== null &&
    row.theoretical_euro_cents > 0
      ? ((row.median_euro_to_level_cents - row.theoretical_euro_cents) /
          row.theoretical_euro_cents) *
        100
      : null;
  const xpBand =
    row.next_xp_required === null
      ? `${row.xp_required.toLocaleString("fr-FR")} XP et plus`
      : `${row.xp_required.toLocaleString("fr-FR")} → ${(
          row.next_xp_required - 1
        ).toLocaleString("fr-FR")} XP`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          Niveau {row.level} · {row.level_name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {xpBand} — {row.users_count.toLocaleString("fr-FR")} joueur
          {row.users_count > 1 ? "s" : ""} à ce niveau aujourd&apos;hui
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Durée du palier"
          icon={<Hourglass className={iconClass} />}
          value={
            row.median_days_to_level === null
              ? "—"
              : formatDays(row.median_days_to_level)
          }
          subtitle={
            row.median_days_to_level === null
              ? "Aucun franchissement observé"
              : `Médiane sur ${row.transitions_count} franchissement${
                  row.transitions_count > 1 ? "s" : ""
                } · moyenne ${
                  row.avg_days_to_level === null
                    ? "—"
                    : formatDays(row.avg_days_to_level)
                }`
          }
          info="Temps écoulé entre le franchissement du niveau précédent et celui-ci, reconstitué depuis le cumul d'XP. Les joueurs encore bloqués au palier précédent ne sont pas comptés : la vraie durée typique est donc plus longue que cette médiane."
        />
        <StatCard
          title="Ont atteint ce niveau"
          icon={<Users className={iconClass} />}
          value={row.reached_count.toLocaleString("fr-FR")}
          subtitle={
            row.pass_rate_pct === null
              ? "Point d'entrée de la grille"
              : `${row.pass_rate_pct.toLocaleString("fr-FR", {
                  maximumFractionDigits: 0,
                })} % des joueurs du niveau précédent`
          }
        />
        <StatCard
          title="Vers le niveau suivant"
          icon={<TrendingUp className={iconClass} />}
          value={
            row.avg_progress_pct === null
              ? "—"
              : `${row.avg_progress_pct.toLocaleString("fr-FR")} %`
          }
          subtitle={
            row.near_next_count > 0
              ? `${row.near_next_count} joueur${
                  row.near_next_count > 1 ? "s" : ""
                } à 80 % ou plus`
              : "Personne à portée immédiate"
          }
          info="Progression moyenne dans le palier. Les joueurs à 80 % ou plus sont les meilleures cibles d'une relance : un seul passage suffit souvent à les faire monter."
        />
        <StatCard
          title="Inactifs 30 j"
          icon={<Clock className={iconClass} />}
          value={row.inactive_30d_count.toLocaleString("fr-FR")}
          subtitle={
            row.avg_days_since_last_xp === null
              ? "—"
              : `${formatDays(
                  row.avg_days_since_last_xp
                )} en moyenne depuis le dernier XP`
          }
          valueClassName={
            row.users_count > 0 && row.inactive_30d_count / row.users_count >= 0.4
              ? "text-amber-600"
              : undefined
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coût du palier</CardTitle>
          <CardDescription>
            Ce qu&apos;il a fallu dépenser et gagner pour franchir ce niveau
            depuis le précédent. Seuls les paiements carte et espèces
            comptent&nbsp;: ce sont les seuls qui génèrent de l&apos;XP, un
            paiement en Paraiges de Bronze n&apos;en rapporte aucun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Euros du palier"
              icon={<Euro className={iconClass} />}
              value={
                row.median_euro_to_level_cents === null
                  ? "—"
                  : formatCurrency(row.median_euro_to_level_cents)
              }
              subtitle={
                row.avg_euro_to_level_cents === null
                  ? row.theoretical_euro_cents === null
                    ? "Aucun franchissement observé"
                    : `${formatCurrency(
                        row.theoretical_euro_cents
                      )} en théorie`
                  : `médiane · moyenne ${formatCurrency(
                      row.avg_euro_to_level_cents
                    )}`
              }
              info="Euros dépensés entre le franchissement du niveau précédent et celui-ci. La médiane est plus fiable que la moyenne : quelques très gros paniers la tireraient vers le haut."
            />
            <StatCard
              title="Coût théorique"
              icon={<Route className={iconClass} />}
              value={
                row.theoretical_euro_cents === null
                  ? "—"
                  : formatCurrency(row.theoretical_euro_cents)
              }
              subtitle={
                costGapPct === null
                  ? "XP du palier converti au taux courant"
                  : `${costGapPct > 0 ? "+" : ""}${costGapPct.toLocaleString(
                      "fr-FR",
                      { maximumFractionDigits: 0 }
                    )} % en réel`
              }
              valueClassName={
                costGapPct !== null && costGapPct < -10
                  ? "text-emerald-600"
                  : undefined
              }
              info="XP à combler sur ce palier, converti en euros au taux de la table constants. Un coût réel nettement inférieur signifie que les quêtes et les bonus ont fait une partie du chemin à la place des achats."
            />
            <StatCard
              title="PdB gagnés"
              icon={<Coins className={iconClass} />}
              value={
                row.median_pdb_to_level_cents === null
                  ? "—"
                  : row.median_pdb_to_level_cents.toLocaleString("fr-FR")
              }
              subtitle="Médiane sur le palier, toutes sources"
              info="Paraiges de Bronze gagnés pendant le palier : achats, quêtes, bonus et classement confondus. C'est la dette PdB générée par ce franchissement."
            />
            <StatCard
              title="Passages en caisse"
              icon={<ShoppingBasket className={iconClass} />}
              value={
                row.median_receipts_to_level === null
                  ? "—"
                  : row.median_receipts_to_level.toLocaleString("fr-FR", {
                      maximumFractionDigits: 1,
                    })
              }
              subtitle={
                row.median_euro_total_cents === null
                  ? "Médiane sur le palier"
                  : `${formatCurrency(
                      row.median_euro_total_cents
                    )} cumulés depuis l'inscription`
              }
              info="Nombre médian de tickets sur le palier. Le cumul en dessous est le total dépensé depuis l'inscription pour arriver à ce niveau — c'est la médiane des cumuls, pas la somme des paliers."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Valeur client du niveau</CardTitle>
          <CardDescription>
            Sur toute la saison, pour les joueurs qui se trouvent aujourd&apos;hui
            à ce niveau. Une partie de leurs dépenses a donc été réalisée à un
            niveau inférieur, avec un coefficient plus faible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Coefficient PdB"
              icon={<Gauge className={iconClass} />}
              value={
                row.avg_cashback_coefficient === null
                  ? "—"
                  : `× ${row.avg_cashback_coefficient.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                    })}`
              }
              subtitle="PdB gagnés par euro dépensé"
              info="Coefficient nominal du niveau, maintenu automatiquement par trigger : 100 + (niveau − 1) × 20."
            />
            <StatCard
              title="PdB générés"
              icon={<Coins className={iconClass} />}
              value={formatCurrency(row.pdb_generated_cents)}
              subtitle={
                effectiveRate === null
                  ? "Aucune dépense enregistrée"
                  : `${effectiveRate.toLocaleString("fr-FR", {
                      maximumFractionDigits: 1,
                    })} % des euros encaissés`
              }
              info="Tous PdB confondus sur la saison — organiques, quêtes, bonus et classement. Le taux effectif dépasse donc le coefficient nominal."
            />
            <StatCard
              title="Euros dépensés"
              icon={<Euro className={iconClass} />}
              value={formatCurrency(row.euro_spent_cents)}
              subtitle="Paiements carte et espèces"
            />
            <StatCard
              title="Panier moyen"
              icon={<Receipt className={iconClass} />}
              value={basketCents === null ? "—" : formatCurrency(basketCents)}
              subtitle={`${row.receipts_count.toLocaleString(
                "fr-FR"
              )} ticket${row.receipts_count > 1 ? "s" : ""}`}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Joueurs au niveau {row.level}
          </CardTitle>
          <CardDescription>
            {row.users_count.toLocaleString("fr-FR")} joueur
            {row.users_count > 1 ? "s" : ""}, triés par XP décroissant. Tickets,
            euros et PdB portent sur toute la saison, pas seulement sur le palier
            en cours. Clique sur un pseudo pour ouvrir sa fiche.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LevelMembersTable
            key={row.level}
            rows={membersQuery.data ?? []}
            loading={membersQuery.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
