# CLAUDE.md - Royaume des Paraiges Admin

Interface d'administration du Royaume des Paraiges (app de fidélité gamifiée bière). Backend Supabase partagé avec les apps front, scanner, waiters.

## Stack

Next.js 16.1 (App Router) · React 19.2 · TypeScript 5.7 · Supabase 2.47 · Tailwind 3.4 · Radix/shadcn · Recharts.

## Documentation

- **Backend Supabase** : submodule `docs/docs/supabase/` (tables, functions, policies). Toujours consulter avant de toucher au schéma.
- **Types BDD** : `src/types/database.ts` (généré + extensions manuelles en bas du fichier).
- **Services** : `src/lib/services/*Service.ts` — un par domaine (coupons, quests, rewards, season, achievementBadge, content, analytics, user, receipt, template, period, level).

## Terminologie quêtes

- **défis** = quêtes **récurrentes** (weekly/monthly/yearly), seul modèle implémenté.
- **missions** = quêtes **ponctuelles** (à venir).
- Les noms BDD restent `quests`/`quest_progress`/etc. — la distinction est fonctionnelle.

## Règles produit en vigueur

- **Zéro euro côté client** : l'app Expo ne doit jamais afficher d'euros. Les quêtes purement monétaires côté client utilisent `quest_type = 'cashback_earned'` (target en PdB, 1 PdB = 1 centime). Le type `amount_spent` reste disponible à la création (target saisie en €, stockée en centimes via ×100) — l'admin/scanner/waiters peuvent afficher en €, mais si une telle quête est rendue visible côté Expo, prévoir un affichage non-monétaire (libellé descriptif, conversion en PdB attendus, etc.).
- **Refonte mécaniques de jeu (en prod)** : grille 25 niveaux, `cashback_coefficient = 100 + (level-1)*20` auto-maintenu par trigger sur `gains`, cycle de saison (snapshot → badges → reset) via `/rewards/season`.
- **Badges succès** : catégorie `achievement` sur `badge_types`, `criterion_type` paramétrable, attribution temps réel via hook dans `create_receipt` (step 12b) + cron nocturne 02:00 UTC pour les streaks. Soft-delete via `archived_at`. Cf. `docs/docs/supabase/functions/achievement_badges.md`.

## Conventions de code

### Validation runtime — Zod obligatoire

Tout service qui mute la BDD (RPC ou table-write) valide son input avec un schéma Zod dans `src/lib/schemas/`, appelé via `schema.parse(input)` au début. Schémas existants : `manualCouponSchema`, `questSchema`/`questUpdateSchema`, `achievementBadgeSchema`/`achievementBadgeUpdateSchema`, `distributeRewardsSchema`, `seasonClosureSchema`, `beerSchema`/`beerUpdateSchema`, `establishmentSchema`/`establishmentUpdateSchema`. Les schémas servent aussi de base aux forms UI.

### Forms — react-hook-form + zodResolver

Pattern : `useForm<FormInput>({ resolver: zodResolver(schema), defaultValues })` puis `form.handleSubmit(async values => ...)`. Le schéma UI peut différer du schéma service (inputs string pour les number, conversions €→centimes au submit).

- `register("name")` pour les `<Input>`, `<Controller>` pour les `<Select>`/`<Switch>` shadcn.
- Erreurs Zod : `errors.name?.message` avec `text-xs text-destructive`.
- Erreur serveur : state local `serverError`, bandeau au-dessus des actions.
- Toasts : `import { toast } from "sonner"` — **seul système** depuis juin 2026 : le `useToast`/`toaster.tsx`/`toast.tsx` shadcn a été supprimé du repo, ne pas le réintroduire.

Forms migrés : `coupons/create`, `rewards/achievements/_form/AchievementBadgeForm`, `quests/_form/QuestForm`, `content/beers/[id]`, `content/establishments/[id]`.

### Composants UI partagés (juin 2026)

Toujours utiliser ces composants plutôt que de réécrire le pattern localement :

- **`<PageHeader title description? actions? />`** (`src/components/layout/page-header.tsx`) — en-tête h1+description+actions de chaque page.
- **`<EmptyState icon? title description? action? />`** (`src/components/ui/empty-state.tsx`) — état vide standard (dans une table : `<TableCell colSpan={N}>`). Si un filtre/recherche est actif, titre « Aucun résultat pour cette recherche » ; sinon CTA de création quand la page en a un.
- **`<StatusBadge status label? tone? />`** (`src/components/ui/status-badge.tsx`) — registre central statut → libellé FR + tonalité (réconciliation, distributions, quest_progress, RGPD, coupons). Ajouter les nouveaux statuts au registre, pas en local.
- **`<ConfirmDialog open onOpenChange title description confirmLabel? destructive? onConfirm />`** (`src/components/ui/confirm-dialog.tsx`) — toute confirmation ; `window.confirm` est banni.
- **`<DataTable columns data rowKey loading? emptyState? onRowClick? pagination? />`** (`src/components/ui/data-table.tsx`) — **convention pour tout nouveau listing** (juin 2026). Table générique sur la `<Table>` shadcn, sans TanStack Table : colonnes typées (`header`, `cell`, `sortable?` + `sortValue`), tri client par colonne (cycle asc → desc → aucun, icônes Chevron + `aria-sort`), pagination contrôlée 0-based (« Page X sur Y », Précédent/Suivant avec `aria-label`), état de chargement en lignes skeleton (pas de spinner), slot `emptyState` (passer le `<EmptyState>` contextuel : « Aucun résultat pour cette recherche » si filtre actif, sinon CTA). Cellules interactives (Switch, dropdown, liens) : wrapper `<div onClick={e => e.stopPropagation()}>` dans le `cell` pour cohabiter avec `onRowClick`. Adopté sur `users`, `coupons`, `templates`, `history`, `receipts`.
- **Sélecteur de période Jour/Semaine/Mois (/Année)** (`src/components/period-range.tsx`) — **seule** implémentation des conversions date ↔ inputs HTML5 (`date`/`week`/`month` ; l'année n'a pas d'input HTML5 → `number` borné), du décalage ‹ › et des bornes de période (semaine = **ISO 8601 lundi→dimanche**, ne jamais recalculer localement ; année = 1ᵉʳ janv → 31 déc). Le mode `year` est **opt-in** via la prop `modes` de `<PeriodRange>`/`<PeriodModeToggle>` (défaut `["day","week","month"]` — seul `/analytics/xp` l'active à date). Trois briques : `<PeriodRange>` (layout inline complet, utilisé par `/analytics` et `/analytics/xp`), `<PeriodModeToggle>` + `<PeriodDateNav>` (composables, utilisées par la sidebar de `/reconciliation`). Exports : `getPeriodBounds`, `shiftPeriod`, `isPeriodAtMax`, `formatPeriodLabel`, `todayUtcISO`, type `PeriodMode`. Remplace l'ancien `src/components/analytics/timeline-period-range.tsx` (supprimé juin 2026).
- **Navigation** : `src/lib/navigation.ts` est la source unique (sidebar + breadcrumb + palette Cmd+K). Nouvelle page → l'ajouter là (`navigationGroups` ou `extraPages` de `command-palette.tsx`) + `segmentLabels` pour le fil d'Ariane + `featureKey` (cf. `src/lib/features.ts`, accès par fonctionnalité migration 057).
- Pages d'erreur brandées : `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/(dashboard)/error.tsx`.

**`/settings`** : simplifié (mai 2026). Header purgé du jargon BDD (`admin_settings`, "migration 020"). Descriptions des champs réécrites en français clair (plus de balises `<code>` exposant les noms d'enum quest_type). Lien vers `/quests/health` ajouté pour expliquer où les alertes apparaissent. Migration TanStack Query + sonner. Pattern : page = chargement queries + handoff vers `<SettingsForm>` enfant qui initialise son state depuis les props (évite la règle eslint `react-hooks/set-state-in-effect` de React 19).

**`/content/beers`** et **`/content/establishments`** : simplifiés (mai 2026). Cartes stats "Source: Supabase" supprimées (purement noise), `IBU moyen` retirée. Migration TanStack Query + sonner. Pages volontairement légères (lecture seule) : recherche + table + dialog réciproque (bières ↔ établissements).

**`/quests`** : refonte en vue calendaire « En ce moment » (mai 2026). Plus d'onglets type-période ni de pills Actuelles/À venir/Archives. Layout : **3 colonnes** Semaine / Mois / Année affichées simultanément, chacune avec sa **frise temporelle cliquable** (périodes issues de `quest_periods` ∪ période courante, triées ; bouton *Aujourd'hui* pour revenir au présent). Une période sélectionnée passée affiche la **participation** (`getQuestProgressStatsForPeriod`, scopée `quest_progress.period_identifier`) ; présente/future affiche le toggle actif + duplication. Les quêtes **sans planning** (`quest_periods` vide) sont sorties dans une **section « Permanentes »** dédiée (groupée par type), badgées *En continu* si actives. Filtre **Inactives** (caché par défaut) dans le header. Cartes compactes cliquables → détail. Outils CSV (template / export / import) toujours dans le dropdown **Outils** ; dialog d'import et `QuestConflictDialog` toujours gérés dans la page. TanStack Query + sonner. **Découpage (juin 2026)** : la page (`page.tsx`, ~400 lignes) ne garde que l'orchestration (state anchor/filtres, queries, mutations, handlers CSV) ; le rendu vit dans `quests/_components/` — `period-section.tsx` (ligne période + frise), `permanent-quests-section.tsx`, `quest-card.tsx` (carte compacte + récompenses + participation), `import-csv-dialog.tsx`, plus les helpers `quest-display.ts` (labels/icônes/unités) et `period-anchor.ts` (`periodToAnchor`, `shortPeriodLabel`). PageHeader + EmptyState adoptés.

**`/coupons/create`** : formulaire simplifié (mai 2026). Plus de notion de "mode template / custom" — toujours saisie directe : radios *Bonus cashback (€) / Coupon (%)* puis un seul champ. Les `coupon_templates` restent en BDD et continuent d'alimenter la distribution leaderboard (`/rewards/distribute`) ainsi que `/templates`, mais ne sont plus exposés dans le flux de création manuelle d'un coupon.

**`/analytics`** : refonte en **tableau timeline par journée fiscale** (juin 2026, migrations 045-046). Remplace les StatCards/graphiques Recharts (Recettes/Dettes/Stock). Layout : le tableau est **pleine largeur** (`-mx-4 sm:-mx-6` pour sortir du `p-6` du `<main>`). **Entête figé sans scrollbar verticale interne** via une architecture à **deux tables alignées** (`timeline-table.tsx`) : un **entête sticky séparé** (`sticky top-{hauteur barre de filtres}`, conteneur `overflow-hidden`) + le **corps en flux normal** (`overflow-x-auto`, scroll vertical = la page `<main>`). Le défilement horizontal du corps est **synchronisé en JS** sur l'entête (`onScroll` → `headerRef.scrollLeft`). Alignement des colonnes garanti par des **largeurs fixes** (`FIRST_COL_W`/`COL_W` + `table-fixed` + `colgroup` ; la table fait exactement `tableWidth`, **sans** `minWidth:100%` — les colonnes ne s'étirent donc jamais quand il y a peu de journées). La **1ʳᵉ colonne** reste figée à gauche (`sticky left-0`) dans les deux tables. L'offset de l'entête = hauteur réelle de la barre de filtres, **mesurée** dans `page.tsx` (`ResizeObserver` + `getComputedStyle().top`) et passée via `stickyHeaderTop`. **z-index** : barre de filtres `z-40` > entête sticky `z-20`. Fines **lignes verticales** `border-border/30` entre colonnes ; lignes de métriques **groupées par établissement** (séparateur épais entre groupes), **colonnes = journées fiscales** (clôture → clôture). Métriques par établissement et journée fiscale, en **blocs séparés** (migrations 054-055, réconciliation Cashpad ↔ Royaume) : **(0) Euros Cashpad** — ligne seule en tête, `euro_cashpad_other_cents` = paiements Cashpad SANS lien Royaume (tous modes sauf « Euros Royaume »/« Paraiges de Bronze » ; `NULL`→« — » en fallback) ; **(1) Euros Royaume** — *selon Cashpad* (`euro_cashpad_cents` : mode de paiement Cashpad « Euros Royaume », `LIKE '%royaume%'`, millièmes ÷10, `NULL`→« — » en fallback), *selon Royaume* (`euro_royaume_cents` : `receipt_lines` `card`+`cash`, cliquable → drilldown), *Différence (Cashpad − Royaume)* ; **(2) Paiements PdB** — *selon Cashpad* (`pdb_cashpad_cents` : mode Cashpad « Paraiges de Bronze », `LIKE '%paraige%'` ; quasi toujours 0 car peu utilisé en caisse), *selon Royaume* (`pdb_royaume_cents` : `receipt_lines` `cashback`, cliquable), *Différence* ; **(3) Génération** — *PdB organiques générés* (`gains` `source_type='receipt'`, cliquable), *PdB gains générés* (`gains` `source_type='bonus_cashback_quest'`, rattachés par **heuristique** à l'établissement du dernier receipt du client antérieur au gain — ces gains n'ont ni `receipt_id` ni `establishment_id`). Les lignes *Différence* sont calculées côté UI (vert si = 0, ambre si ≠ 0). Le **bloc global** « toutes enseignes » a été **retiré** : les gains hors quête sans établissement (leaderboard/manuel/rollback) ne sont plus affichés (la RPC `_global` reste en base mais n'est plus appelée). **Tous les montants (PdB inclus) sont affichés en euros** via `formatCurrency` (centimes ÷ 100, virgule décimale) — 1 PdB = 0,01 €. Filtre **multi-établissements** + sélecteur de plage **Jour/Semaine/Mois** (défaut Mois, pattern récon­ciliation). Clic sur une cellule → `DrilldownModal` scopé à la fenêtre fiscale `[range_begin, range_end]`. Les **PdB récompense/total** (`bonus_cashback_*`, sans `establishment_id`) sont dans un **bloc global provisoire** « Royaume — toutes enseignes » (par jour calendaire) en attendant le **modèle de dettes inter-établissements** (chantier backend à venir : attribution au prorata des dépenses qualifiantes). Service : `getAnalyticsTimeline` / `getAnalyticsTimelineGlobal` (RPC `as any`). Query keys : `analyticsKeys`. Composants : `src/components/analytics/{timeline-table,establishment-multi-filter,timeline-global-block}.tsx` + le sélecteur de période partagé `src/components/period-range.tsx` (cf. *Composants UI partagés*). Les bornes fiscales viennent de `cashpad_closures` (peuplée par l'edge function `cashpad-reconcile-daily`) ; sans clôture, **fallback jour calendaire** `Europe/Paris` (colonne badgée « cal. »). ⚠️ Nécessite le **déploiement de l'edge function** + un **backfill** (réconciliation globale) pour passer du fallback aux vraies colonnes fiscales.

**Comparaison Cashpad à la demande (migration 056, juin 2026)** : le calcul des colonnes « selon Cashpad » (`euro_cashpad_*`, `pdb_cashpad_cents`) agrège `cashpad_receipts_snapshot` (≈ 454 MB, JSONB `raw_payload`) et coûtait ~2,4 s **à chaque chargement** (Seq Scan complet). La RPC prend désormais un 4ᵉ paramètre `p_include_cashpad boolean DEFAULT false` : **désactivé** (défaut), la CTE `cashpad_pm` est court-circuitée (driver vide → snapshot **jamais lu**) et ces colonnes renvoient `NULL` → page en ~50 ms ; **activé**, l'agrégation est calculée via `CROSS JOIN LATERAL` par clôture (utilise `idx_crs_establishment_closed` au lieu d'un Seq Scan, ~0,25 s à chaud). UI : checkbox **« Comparaison Cashpad »** dans la barre de filtres (off par défaut, spinner pendant le fetch) ; `showCashpad` pilote à la fois le param service `getAnalyticsTimeline(..., includeCashpad)`, la query key (`analyticsKeys.timeline`) et le masquage des lignes Cashpad dans `timeline-table.tsx` (métriques taguées `cashpad`, séparateurs de blocs recalculés dynamiquement). La signature RPC a changé → l'ancienne 3-arg a été **DROP**.

**Index manquants sur les FK (migration 091, septembre 2026)** : `get_analytics_timeline` rejouait ses deux `LEFT JOIN LATERAL` (lignes de paiement, gains organiques) en **Seq Scan complet une fois par receipt** — `receipt_lines.receipt_id` et `gains.receipt_id` n'avaient aucun index, `receipts(customer_id, created_at)` non plus pour le sous-select `quest_attr`. Conséquence : sur une année (6 774 receipts) la RPC mettait **9,4 s**, au-dessus du `statement_timeout` de **8 s** du rôle `authenticated` → **« Exporter année » échouait en `57014`** alors que l'affichage mois par mois passait de justesse. Après les 3 index : **9 440 ms → 274 ms** sur 2026. Le seuil des 8 s est la vraie contrainte de cette page : toute nouvelle métrique par receipt doit être vérifiée sur une plage annuelle, pas sur le mois affiché.

**Totaux Cashpad matérialisés (migrations 092 + 093, septembre 2026)** : les chiffres de perf de la 056 avaient vieilli avec la table (570 Mo / 289 000 lignes, et non 454 MB). `p_include_cashpad = true` ré-extrayait `payments[]` du JSONB `raw_payload` de **chaque ticket à chaque appel** — coût proportionnel à la plage, insensible aux index : ~0,7 s sur un mois, **~44 s sur une année**, donc export annuel impossible sous les 8 s. Or ces montants sont **figés** une fois le service clôturé : on recalculait en permanence une donnée immuable. Ils sont désormais stockés sur la ligne du ticket (`payments_euro_cents` / `payments_pdb_cents` / `payments_other_cents`), remplis par le trigger `trg_cashpad_payment_totals` et servis par l'index couvrant `idx_crs_payment_totals`. **Année complète avec Cashpad : ~44 s → 0,41 s.** L'export année inclut donc à nouveau les colonnes Cashpad.

Trois choses à savoir avant d'y toucher : la **règle de classement** des modes de paiement vit uniquement dans `public.cashpad_payment_totals(jsonb)` (la modifier impose de **rejouer le backfill** — aucun effet rétroactif) ; le trigger couvre tous les chemins d'écriture y compris le ré-upsert de `cashpad-reconcile-daily`, donc **aucune dérive possible** ; un backfill réécrit ~484 Mo de heap et se fait **par lots**, jamais d'un bloc. Cf. `docs/docs/supabase/tables/cashpad_receipts_snapshot.md`.

**Export CSV + colonne Total (juillet 2026)** : `timeline-table.tsx` affiche une **colonne « Total » figée** (sticky `left: FIRST_COL_W`, largeur `TOTAL_COL_W`) juste après la colonne métrique — somme de chaque ligne sur les journées affichées (`computeRowTotal` : lignes *Différence* = somme des écarts sur les seules journées avec donnée Cashpad, « — » si aucune donnée). Bouton **« Exporter CSV »** dans la barre de filtres de `page.tsx` : exporte exactement les données affichées (période Jour/Semaine/Mois en cours, établissements sélectionnés, lignes Cashpad seulement si la comparaison est activée) via `buildTimelineCsv` (exportée par `timeline-table.tsx`) — colonnes `Établissement;Métrique;Total;<journées>`, séparateur `;` + décimales à virgule + BOM (Excel fr), montants en euros sans symbole, fichier `analytics_<start>_<end>.csv`. Bouton **« Exporter année »** à côté : dialog de sélection d'année (2025 → année courante), fetch dédié `getAnalyticsTimeline(<année>-01-01, <année>-12-31, …)` hors query affichée (mêmes filtres établissements + comparaison Cashpad que l'écran), même format CSV, fichier `analytics_<année>.csv`. **Tri des groupes d'établissements** (juillet 2026) : en-têtes « Métrique » (tri par nom d'établissement) et « Total » (tri par total « Euros Royaume — selon Royaume ») cliquables, cycle asc → desc → aucun (défaut = ordre RPC alphabétique) ; l'ordre des lignes de métriques dans un groupe reste `METRICS`, l'export CSV garde l'ordre RPC.

**`/analytics/xp`** — Répartition XP (juillet 2026) : tableau pivot **utilisateurs × jours** des gains d'XP. Lignes = utilisateurs (pseudo = `profiles.username`, fallback prénom+nom, comptes `is_test` exclus) triés par total décroissant ; colonnes = Total XP + un jour calendaire **Europe/Paris** par colonne de la période (sélecteur Jour/Semaine/Mois/**Année** partagé `period-range` avec `modes` opt-in, défaut Mois ; en vue **Année**, colonnes = **mois** agrégés — l'export CSV suit les colonnes affichées, le grain quotidien annuel reste dispo via « Exporter année »). Service `getXpDistribution(startDate, endDate)` dans `analyticsService.ts` : fetch paginé (batches de 1000, bornes UTC élargies ±1 jour puis re-filtrage après bucketing Paris) de `gains` avec `xp > 0` + join `profiles!gains_customer_id_fkey`, agrégation côté client. Query key `analyticsKeys.xpDistribution`. Bouton **« Exporter CSV »** : colonnes `Pseudo;Total XP;<un jour par colonne YYYY-MM-DD>`, séparateur `;` + BOM (Excel fr), fichier `xp_<start>_<end>.csv`. Bouton **« Exporter année »** à côté : dialog de sélection d'année (2025 → année courante), fetch dédié `getXpDistribution(<année>-01-01, <année>-12-31)` hors query affichée, même format CSV mais colonnes = uniquement les jours avec au moins un gain (pattern export année `/analytics`), fichier `xp_<année>.csv`. Au-dessus du tableau, **graphique de projection annuelle** (`xp/_components/xp-projection-chart.tsx`, Recharts LineChart) : cumul des XP gagnés par **semaine ISO** sur l'année en cours, prolongé en **pointillés** jusqu'à fin décembre par extrapolation linéaire du rythme moyen hebdo — plein = réel, pointillé = projeté, même teinte par série ; ticks X = premier lundi de chaque mois, détail semaine (« S27 · semaine du … ») dans l'infobulle. **Deux modes** : sans sélection, courbe **globale** tous utilisateurs (`getXpWeeklyTotals`, key `analyticsKeys.xpYearlySeries(year)`, total fin d'année projeté dans la description) ; avec des utilisateurs **cochés dans le tableau** (colonne checkbox sticky + pastille couleur à côté du pseudo), une courbe **par utilisateur** (`getXpWeeklyTotalsForUsers`, key `analyticsKeys.xpYearlySeriesUsers(year, ids)` triée, `enabled` si sélection) + légende. Max `MAX_CHART_SERIES` = 6 utilisateurs (toast au-delà) ; palette catégorielle `SERIES_PALETTE` (6 teintes validées light + dark) exportée par le composant chart ; le **slot couleur suit l'utilisateur** (attribué au cochage = plus petit slot libre, conservé quand un autre est décoché — jamais réattribué au rang). Le graphique couvre toujours l'année en cours, indépendamment de la période affichée dans le tableau. **Tri client** (juillet 2026) sur les en-têtes du tableau — Pseudo, Total XP et chaque colonne jour/mois (cycle asc → desc → aucun, même UX que `<DataTable>` ; défaut = total décroissant du service) ; l'export CSV « période affichée » suit l'ordre de tri. Entrée nav « Répartition XP » dans le groupe *Vue d'ensemble* (`navigation.ts`) + segment `xp` dans `segmentLabels`.

**`/analytics/establishments`** — Analytics établissements (juillet 2026, migration **062**) : **tableau comparatif** de tous les établissements + **fiche détaillée** de l'établissement cliqué (re-clic = désélection, scroll doux vers la fiche ; sélection en state local, pas d'URL param). Données : RPC `get_establishment_kpis(p_start_date, p_end_date)` (admin-only, jours calendaires Europe/Paris **inclusifs**, 1 ligne/établissement avec zéros si sans activité — cf. `docs/docs/supabase/functions/get_establishment_kpis.md`) appelée **2×** — période courante + **période calendaire précédente** (`shiftPeriod(date, mode, -1)`, jamais −N jours) — pour les **évolutions %** (pattern `trendDelta` du dashboard, repris dans `_components/evolution-badge.tsx` ; « — » si période précédente vide). **Nouveaux clients** = clients dont le **premier receipt all-time dans CET établissement** tombe dans la période (les clients n'ont pas de rattachement établissement en BDD — dérivé de `receipts`). **Salariés** = effectif actuel (`attached_establishment_id`, roles employee+establishment, hors deleted/test), indépendant de la période. **Δ PdB 7 j glissants** (colonne du tableau + mini-tableau par jour dans la fiche) : fenêtre **fixe** aujourd'hui−6 → aujourd'hui, un seul appel `getAnalyticsTimeline(d7start, today, undefined, /*includeCashpad*/ true)` (staleTime 5 min), agrégé par `computePdbDeltas()` (`analyticsService.ts`) : somme `pdb_cashpad_cents − pdb_royaume_cents` sur les **seules journées avec donnée Cashpad** (convention colonne Total de `/analytics`), « — » si aucune, sous-texte `n j` si < 7 ; une journée sans ticket Royaume ne produit pas de ligne timeline (documenté dans le tooltip). Service `getEstablishmentKpis` + type `EstablishmentKpisRow` (mapping `Number()` — bigint PostgREST arrivent en string), query key `analyticsKeys.establishmentKpis`. Composants : `_components/{establishments-compare-table,establishment-detail,pdb-delta-7d-table,evolution-badge}.tsx` (DataTable + StatCards + fiche). Feature key `analytics-establishments` (`features.ts` + `navigation.ts`, groupe *Vue d'ensemble*) ; segment breadcrumb `establishments` déjà mappé.

**`/analytics/levels`** — Niveaux (août 2026, migration **084**) : répartition des joueurs dans la grille `level_thresholds` et vitesse de progression sur la saison. **Le niveau n'est pas stocké** (dérivé de l'XP de saison via `compute_level_from_xp`) et **aucun passage de niveau n'est historisé** : les durées de palier sont **reconstituées** en rejouant le cumul chronologique de `gains.xp` par joueur (fenêtre `SUM() OVER (PARTITION BY customer_id ORDER BY created_at, id)`), puis en datant le premier gain qui franchit chaque seuil. Trois RPC admin-only (`p_year` optionnel, défaut = saison en cours ; périmètre `role='client'` hors test/supprimés) : `get_level_summary` (StatCards : joueurs avec/sans XP, niveau moyen/max, **niveau max projeté au 31/12**, inactifs 30 j), `get_level_stats` (1 ligne par niveau, y compris vides : effectif, `reached_count` pour l'entonnoir, durée médiane/moyenne du palier, progression moyenne + joueurs à ≥ 80 %, inactifs, coefficient PdB, PdB générés, tickets/€, effectif projeté) et `get_level_average_timeline` (niveau moyen et max par semaine ISO). La **migration 085** (corrigée par la **085b**) ajoute le **coût des paliers** à `get_level_stats` — euros et PdB médians dépensés/gagnés *pendant* le palier (fenêtre `(franchissement précédent, celui-ci]`, borne basse exclusive), tickets, cumul depuis l'inscription, et `theoretical_euro_cents` = XP à combler ÷ `constants.xp_gains` — plus la RPC `get_level_members(p_level, p_year)` qui liste les joueurs d'un niveau. ⚠️ **Seuls `card` + `cash` génèrent de l'XP** (`validate_payment_methods` → `amount_for_gains`) : un paiement en PdB ne fait pas monter de niveau, l'assiette euros est donc la bonne. Un gain qui saute deux niveaux laisse le second palier à 0 € / 0 j (correct : il n'a rien coûté de plus). Piège de typage : `percentile_cont(...) WITHIN GROUP (ORDER BY <numeric>)` renvoie du **double precision** et `round(double precision, integer)` n'existe pas — caster en `::numeric` avant `ROUND` (c'est ce qui a cassé la 085). Cf. `docs/docs/supabase/functions/level_analytics.md`. UI : StatCards + **bandeau d'alerte** quand `top_level_available − projected_max_level > 0` (paliers hors de portée sur la saison), BarChart effectif vs projection affichant la **grille entière** (les colonnes vides du haut ne sont pas du bruit : elles montrent les paliers que personne n'atteindra, et une `ReferenceArea` grise cette zone morte — ne pas retronquer l'axe), LineChart niveau moyen, `<DataTable>` cliquable (`containerClassName="overflow-x-auto"`, la table est large) → fiche du niveau (`_components/level-detail.tsx`, pattern table + fiche de `/analytics/establishments`) : StatCards durée/entonnoir/progression/inactifs, carte **Coût du palier** (euros réels vs théoriques avec l'écart en %, PdB, tickets, cumul depuis l'inscription), carte **Valeur client** (saison entière) et **liste nominative des joueurs du niveau** (`level-members-table.tsx`, pagination client 25/page remise à 1 par une `key={row.level}` — pas de `setState` dans un effet, règle eslint React 19 — pseudo cliquable vers `/users/[id]`). Services `getLevelSummary` / `getLevelStats` / `getLevelAverageTimeline` / `getLevelMembers`, keys `analyticsKeys.level*`, feature key `analytics-levels`. **Trois pièges de lecture** documentés dans les tooltips : (1) **biais de survie** — la durée de palier ne compte que les joueurs l'ayant franchi, pas ceux qui y stagnent, donc la durée réelle est plus longue ; (2) **coût rattaché au niveau actuel** — `pdb_generated_cents` / `euro_spent_cents` couvrent toute la saison de joueurs qui étaient plus bas une partie du temps ; (3) le **niveau moyen** a pour dénominateur les joueurs déjà actifs, que les nouveaux arrivants (niveau 1) tirent vers le bas.

**`/links`** — Liens de redirection (juillet 2026, migration **063**) : gestion des liens courts `redirect.auxparaiges.fr/<slug>` servis par le projet frère `url-rooting-app` (Vercel, 302 + log des clics). Tables `redirect_links` / `redirect_clicks` + vue `redirect_link_stats` (RLS admin-only ; l'app de redirection écrit en service_role). Listing `<DataTable>` (copie d'URL, badge Smart link si cibles iOS/Android, toggle actif inline, compteur + dernier clic via la vue) ; formulaire partagé création/édition `links/_form/LinkForm.tsx` (RHF + Zod `redirectLink.schema.ts`, section repliable smart links, erreur 23505 → « slug déjà utilisé ») ; détail `links/[id]` = form + `link-qr-card.tsx` (QRCodeSVG de l'URL courte, téléchargement SVG et PNG 1024px via canvas — le QR encode l'URL courte, jamais la cible) + `link-stats.tsx` (compteurs total/7j/30j, BarChart Recharts empilé par appareil sur 30 jours, fetch paginé par 1000 de `redirect_clicks`). Service `redirectLinkService.ts` (`REDIRECT_BASE_URL`, `buildShortUrl`), keys `redirectLinkKeys`, feature key `links` (groupe Contenu). Suppression = cascade sur l'historique (ConfirmDialog le rappelle ; préférer la désactivation, qui redirige vers le fallback auxparaiges.fr).

**`/menus`** — Cartes & menus (septembre 2026, migrations **094 à 101**) : administration des cartes des établissements, reprises de l'application `menu-ripaille`. **Réservée au rôle `admin`** : un gérant n'administre pas sa carte, il n'existe donc aucune table d'appartenances et `attached_establishment_id` n'est pas touché.

Deux pages. **`/menus`** liste les établissements avec l'état de leur carte (catégories, produits placés, bières, happy hour) via `getEstablishmentMenuSummaries` — trois requêtes à plat agrégées côté client plutôt qu'une RPC de plus. **`/menus/[id]`** rend la carte telle que la voit le client : catégories sur deux niveaux, items avec leurs formats tarifés, et une section « Disponibles, hors carte » pour les items sans catégorie.

**Trois notions à ne pas confondre**, elles sont distinctes en base et l'UI doit le rester : `category_id IS NULL` = disponible mais **hors carte affichée** (c'est ce qui garde une bière visible dans l'app Compagnon) ; `is_active = false` = à la carte mais **en rupture** ; absence de ligne = **pas à la carte du tout**. Le bouton œil barré fait le premier, l'interrupteur le second.

**Le descriptif suit sa source, l'admin ne le surcharge pas.** Un item tire son nom d'exactement une des trois sources (`beer_id`, `catalog_product_id`, ou ses colonnes locales — contrainte `ck_menu_items_one_source`), et `getMenuItems` résout le titre selon la même règle que `get_public_menu` : le catalogue fait foi. Un badge indique la provenance.

**Le libellé de variante ne porte que le format** (« 25 cl », « Bouteille 75 cl ») : le tarif happy hour se déclare avec `is_happy_hour`, jamais dans le texte. Le schéma Zod refuse explicitement « happy hour » dans un libellé — c'est la dette que l'import de la 099 a soldée, ne pas la réintroduire.

**Mise à jour des variantes = delete puis insert**, pas un diff : PostgREST n'a pas de transaction multi-requêtes, un diff laisserait autant de fenêtres d'incohérence pour un gain nul sur des lots de deux à quatre lignes. Contrepartie assumée : les ids de variantes changent à chaque enregistrement, rien ne s'y raccroche.

**Création et édition** : `/menus/[id]/produit/nouveau` et `/menus/[id]/produit/[itemId]` partagent `_form/MenuItemForm.tsx` (RHF + Zod, `useFieldArray` pour les formats). Le sélecteur de source n'apparaît qu'à la création — rebrancher un item sur une autre bière n'a pas de sens métier, on supprime et on recrée. Les bières et softs **déjà à la carte sont retirés du sélecteur** (`getUsedCatalogSources`) : les index uniques par établissement les refuseraient de toute façon. Et le sélecteur de famille est **restreint à Bière et Cidre** quand la source est une bière, plutôt que de laisser le trigger `trg_menu_items_scope` renvoyer une P0426.

**Coup de cœur** : **un seul par catégorie** (index partiel, migration 103). Ne jamais écrire `is_featured` en direct — passer par `setMenuItemFeatured`, qui appelle la RPC `set_menu_item_featured` : l'étoile se **déplace** au lieu de buter sur l'index, et le retrait de l'ancien plus la pose du nouveau sont atomiques. `createMenuItem` et `updateMenuItem` traitent donc `is_featured` à part du reste du payload.

**Catégories** : dialog `_components/category-dialog.tsx`, **monté conditionnellement** par la page. C'est ce qui évite le `reset()` dans un effet, donc la règle eslint `react-hooks/set-state-in-effect` de React 19 — même contrainte que la `key={row.level}` de `/analytics/levels`. Le sélecteur de parent n'offre que les racines, et se verrouille sur une catégorie qui a déjà des enfants.

Tables absentes des types générés → schéma local `MenusDatabase` dans `database.helpers.ts` et client `menusClient()` (même pattern que `EmailReportsDatabase`). ⚠️ **Les types de lignes doivent être des `type`, pas des `interface`** : sans signature d'index implicite, ils ne satisfont pas `GenericSchema` et tout le schéma se résout en `never`. Service `menuService.ts` (+ `describeMenuError` qui traduit `P0426`, `23505`, `23514`, `42501`), Zod `menu.schema.ts`, keys `menuKeys`, feature key `menus` (groupe Contenu).

**`/reconciliation`** : découpée (juin 2026). La page (`page.tsx`, ~370 lignes) ne garde que l'orchestration : états (période via `period-range` partagé, filtre établissement, filtre statut, progression de run), queries, `runReconciliation` + abort, StatCards, `ConfirmDialog` du run global. Le rendu vit dans `reconciliation/_components/` — `shared.tsx` (formatage € / dates avec secondes / Δ, `DateTimeCell`, `ConfidenceCell`, `Field`, skeletons — les secondes sont load-bearing, ne pas remplacer par les helpers de `@/lib/utils`), `orphans-card.tsx` / `ambiguous-card.tsx` / `matched-card.tsx` (les 3 tables, sur `<DataTable>` depuis juillet 2026 → tri client par colonne), `details-dialog.tsx` (Royaume + Cashpad côte à côte, score de confiance, candidats, alerte cancelled_match), `manual-link-dialog.tsx` (fenêtre ajustable 5→120 min, queries candidats + mutation `linkManually`), `run-controls.tsx` (boutons Relancer/Global/Stopper + progress bar). Aucune logique métier dans les `_components` hors les deux queries/mutation du lien manuel.

**`/users/[id]`** : découpée (juin 2026). La page (`page.tsx`, ~190 lignes) ne garde que les queries racine (`getUserWithStats` → `userKeys.detail(id)`, `getUserFullStats` → `[...userKeys.detail(id), "fullStats"]`, établissements), l'en-tête et la navigation par onglets. Le rendu vit dans `users/[id]/_components/` — `overview-tab.tsx` (profil + QR code), `activity-tab.tsx` (stats de période + graphique Recharts + table de progression des quêtes), `gains-tab.tsx` (ligne cliquable vers la quête sur les gains `bonus_cashback_quest`), `coupons-tab.tsx`, `receipts-tab.tsx` (suppression de ticket : AlertDialog + RPC `admin_delete_receipt`), `edit-tab.tsx` (édition profil + zone dangereuse RGPD, state initialisé depuis les props) — plus les transverses `user-stats-cards.tsx`, `user-role-badge.tsx`, `table-pagination.tsx` et `types.ts` (`UserDetail`/`mapUserDetail`, `USER_DETAIL_PAGE_SIZE`). Chaque onglet fetch ses données en `useQuery` sous une clé dérivée `[...userKeys.detail(id), "gains" | "receipts" | …]` (Radix démonte les onglets inactifs → le lazy-load par onglet est conservé) ; toutes les mutations (suppression ticket, update profil, anonymisation RGPD) invalident `userKeys.all`. EmptyState + StatusBadge (statuts quêtes/coupons) adoptés.

### Data fetching — TanStack React Query

`QueryProvider` dans `src/app/layout.tsx` (staleTime 30s, retry 1, no refetchOnWindowFocus). Query keys factories : `src/lib/queries/keys.ts` par domaine.

**Règle** : toute mutation qui change un listing **doit** invalider `xxxKeys.all` du domaine, sinon stale jusqu'à 30s.

Listings migrés : `rewards/achievements`, `rewards/tiers`, `coupons`, `users`, `templates`, `quests`, `content/beers`, `content/establishments`, `history`, `receipts`, `rewards/periods`, `reconciliation/health` (juin 2026), `users/[id]` (onglets du détail, juin 2026), plus les pages détail `content/*/[id]` (useQuery `beerKeys.detail` / `establishmentKeys.detail`, juin 2026). Plus aucune page en `useEffect+useState`.

### Conversion target_value des quêtes — piège récurrent

Dans `QuestForm.submit` :
- `amount_spent` : `parseFloat(value) * 100` → centimes
- `cashback_earned` : `parseInt(value)` → PdB direct (saisie "50" = `target_value = 50`, **pas 5000**)
- Autres : `parseInt(value)` → unités directes

### Répétition selon le niveau — la config survit à l'interrupteur

Section « Répétition selon le niveau » de `QuestForm` : l'interrupteur pilote **uniquement** `quests.is_repeatable`. Le barème par rang (lignes `quest_iterations`) est **toujours éditable et toujours persisté**, même répétition désactivée — une ligne ne disparaît qu'en la retirant explicitement (bouton ×). Ne pas remettre de `values.isRepeatable ? … : []` dans le payload de submit : c'était la cause de la perte de configuration à chaque aller-retour du switch. Les lignes d'une quête `is_repeatable = false` sont inertes côté BDD (`distribute_quest_rewards` borne à 1 complétion) et côté front Expo (`buildQuestWithProgress`), le stockage est donc sans effet de bord. Corollaire : les règles Zod des itérations s'appliquent en permanence, pas seulement quand la répétition est active.

## Gotchas BDD

- Colonne `used` (pas `is_used`) dans `coupons`. Pas de `establishment_id` ni `used_at`.
- Pas de `total_xp` / `cashback_balance` dans `profiles` → vue matérialisée `user_stats`.
- `gains.establishment_id` est **nullable** (NULL pour bonus cashback directs).
- `receipts.employee_id` est **nullable** (NULL pour historique).
- RPC analytics (`get_analytics_revenue`/`_debts`/`_stock`) : avec filtre établissement/employé actif, PdB Récompenses + Bonus Coupons retournent 0.
- **Bornes de journée fiscale** (clôture → clôture) : persistées uniquement dans `cashpad_closures` (migration 045), peuplée par l'edge function `cashpad-reconcile-daily`. La RPC `get_analytics_timeline` (page `/analytics`) s'en sert pour bucketer les receipts ; sans clôture → fallback jour calendaire `Europe/Paris`. Cf. `docs/docs/supabase/tables/cashpad_closures.md`.
- Catégorie « Bonus Coupons » existe encore en backend mais n'est plus affichée admin (reclassée en `bonus_cashback_leaderboard`).
- `badge_types.category` ∈ {`weekly`, `monthly`, `yearly`, `special`, `season_rank`, `quest`, `achievement`}.
- **Soft-delete des badges achievement** : la FK `user_badges.badge_id` est `ON DELETE CASCADE`, un hard-delete effacerait tous les badges déjà obtenus → toujours passer par `archived_at`.
- **Reset de saison** n'efface jamais : ni le solde PdB (`gains` intact), ni les badges (`user_badges`), ni les snapshots. Seul `cashback_coefficient` revient à 100.
- **`profiles.cashback_coefficient` est auto-maintenu** par trigger sur `gains` — ne JAMAIS le modifier manuellement (sauf via RPC `reset_season`).
- **Solde PdB ne peut plus passer négatif** (migration 043) : trigger `trg_enforce_non_negative_cashback` sur `gains` (AFTER INSERT/UPDATE/DELETE). Toute mutation de `gains` rendant `SUM(cashback_money) − dépenses_cashback < 0` pour un client est rejetée (`SQLSTATE P0423`, message `CASHBACK_BALANCE_NEGATIVE:`). En pratique : une annulation (gain négatif `rollback_beta_correction`) ne peut plus dépasser le solde disponible. Ne couvre pas le chemin de dépense (`receipt_lines`/`create_receipt`). Cf. `docs/docs/supabase/functions/enforce_non_negative_cashback.md`.
- **Suppression d'un ticket** (migration 044) : passe **toujours** par la RPC `admin_delete_receipt(p_receipt_id)` (service `receiptService.deleteReceipt`), jamais par un `DELETE FROM receipts` direct côté client. La cascade BDD (`receipt_lines`, `gains`, `receipt_consumption_items`, `spendings`, `cashpad_reconciliations`) est en `ON DELETE CASCADE`, mais l'ordre de cascade entre `gains` et `receipt_lines` peut déclencher un **faux positif** `P0423` du garde-fou solde négatif ; la RPC supprime donc dans un ordre maîtrisé (`receipt_lines` → `gains` → `receipts`) en une transaction atomique, puis `REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats`. Si les PdB gagnés sur le ticket ont déjà été dépensés ailleurs, la suppression est **refusée** (P0423, message UX dédié). UI : bouton corbeille + `AlertDialog` sur chaque ligne de la table tickets de `/users/[id]`. Cf. `docs/docs/supabase/functions/admin_delete_receipt.md`.
- `level_thresholds` : **26 lignes** à date (Écuyer I → Chevalier de la table Ronde ; la grille de 25 posée en avril 2026 a reçu un palier supplémentaire depuis `/content/storytelling`). Table éditable en admin : à lire dynamiquement, **jamais hardcoder le plafond**.
- 17 quêtes désactivées (ids 10-26 sauf 27-28) — préservées pour l'historique de `quest_progress` / `quest_completion_logs`. **Ne pas DELETE**.
- 6 quêtes consumption hebdo créées mais désactivées par défaut (à activer une à une selon calendrier produit).
- **Convention semaine = ISO 8601 partout (lundi→dimanche)**. SQL : `get_period_identifier` (`IYYY-"W"IW`), `get_period_bounds`, et la table `available_periods` (réalignée migration `042` — elle était en dimanche→samedi, ce qui expirait les quêtes un jour trop tôt chaque dimanche, cf. `docs/.../tables/available_periods.md`). TS : **un seul** générateur de labels, `getPeriodIdentifier(periodType, date?)` dans `src/lib/utils.ts` (ISO) ; `periodService.getCurrentPeriodIdentifier` y délègue. Ne JAMAIS réintroduire un calcul de semaine local (`Math.ceil((days + getDay()+1)/7)` = dimanche→samedi, source de bugs de bord de semaine sur `quest_periods` / `period_reward_configs`).

## Typage Supabase

- `(supabase.rpc as any)` pour les appels RPC (limitation typage).
- `(supabase.from("table") as any)` pour insert/update/delete.
- **Tables absentes de `database.generated.ts`** (le CLI de génération est connecté à un compte sans accès au projet Royaume, il vide le fichier au lieu de le remplir) : plutôt que de tout caster en `any`, décrire un **schéma local** dans `database.helpers.ts` (jamais régénéré) et typer le client avec, comme `EmailReportsDatabase` / `reportsClient()` dans `emailReportService.ts`. Deux pièges : le schéma doit être un **`type`, pas une `interface`** (une interface n'a pas de signature d'index implicite, ne satisfait pas la contrainte `GenericSchema` de supabase-js, et fait résoudre tous les `Insert`/`Update` en `never`), et il doit reproduire la forme complète attendue (`__InternalSupabase`, `Relationships`, `Views`/`Functions`/`Enums`/`CompositeTypes` vides).

## Types de quêtes

| Type | Unité | Notes |
|------|-------|-------|
| `xp_earned` | XP | |
| `cashback_earned` | PdB | Progression = SUM(`gains.cashback_money`) sur la période |
| `amount_spent` | Centimes BDD / € UI | Conversion ×100 au submit |
| `establishments_visited` | Nombre | |
| `orders_count` | Nombre | |
| `quest_completed` | Nb sous-périodes | Méta-quête, incompatible avec `weekly` |
| `consumption_count` | Nombre | Requiert `quests.consumption_type` non-NULL |

ENUM `consumption_type` : `cocktail`, `biere`, `alcool`, `soft`, `boisson_chaude`, `restauration`, `boucherie`.

Statuts `quest_progress.status` : `in_progress`, `completed`, `rewarded`, `expired` (via cron quotidien `expire_quest_progress()`).

## Cycle de saison (clôture annuelle)

UI : `/rewards/season` (manuelle pour an 1, cron à venir an 2+). Service : `seasonService.ts`.

3 étapes idempotentes via RPC :
1. `snapshot_season(year, source)` — fige les rangs dans `season_snapshots`
2. `award_season_rank_badges(year, source)` — distribue 6 badges saison (garde : snapshot fait)
3. `reset_season(year, source)` — `cashback_coefficient = 100` partout (garde : badges distribués)

`source` ∈ `'cron' | 'cron_fallback' | 'manual' | 'dry_run_aborted'`. Journal dans `season_closure_log`.

## Structure UI `/rewards`

Page hub (`/rewards/page.tsx`) = pure navigation (6 cartes, zéro fetch). Sous-routes :
- `/rewards/periods` — gestion des périodes
- `/rewards/tiers` — listing paliers leaderboard (TanStack Query) + section secondaire « Lore des badges » (toutes catégories de `badge_types`, édition via dialog inline — emplacement provisoire en attendant arbitrage UX)
- `/rewards/achievements` — badges succès (catégorie `achievement` uniquement)
- `/rewards/distribute` — distribution périodique
- `/rewards/distributions` — **journal des exécutions** (migration 083). 3 StatCards sur 30 jours glissants (exécutions, récompenses, à vérifier), filtres périodicité + statut, `<DataTable>` paginée côté serveur (`range` + `count: "exact"`, 25/page) et dialog de détail au clic (bornes de période, durée, origine, forçage, horodatage de l'alerte, erreurs individuelles). Ligne surlignée en ambre quand elle relève d'une alerte. Service `rewardDistributionService.ts`, keys `rewardRunKeys`, libellés dans `distributions/_lib/run-labels.ts`. ⚠️ Deux miroirs à tenir synchronisés : `runNeedsAttention()` reproduit le prédicat d'alerte SQL de la migration 088, et les libellés de motif reprennent ceux de la fonction Edge `send-reward-alert` — page et e-mail doivent raconter la même histoire. Le statut `success` est affiché « Distribué » via la prop `label` de `<StatusBadge>` : le registre central le traduit par « Envoyé », libellé des rapports e-mail. Table absente des types générés → schéma local `RewardRunsDatabase` dans `database.helpers.ts` (même pattern que `EmailReportsDatabase`).
- `/rewards/season` — clôture annuelle

## Rôles utilisateurs

`admin` (complet) · `establishment` (limité) · `employee` (aucun accès admin) · `client` (aucun).

### Super admin & accès par fonctionnalité (migration 057, juillet 2026)

- **`profiles.is_super_admin`** (seed : `direction@ipdev.lu`) : un super admin peut activer/désactiver l'accès **par page** aux autres admins via l'onglet **Administrateurs** de `/settings` (matrice de switches, onglet visible super admin uniquement, deep-link `?tab=admins` — entrée sidebar « Gestion des admins » dans Système, `superAdminOnly: true` sur le `NavItem`). Colonne **immuable côté client** (trigger anti-escalade `trg_protect_is_super_admin`, promotion uniquement en SQL service_role/postgres).
- **`admin_disabled_features(profile_id, feature_key)`** : une ligne = une feature désactivée ; absence = accès (défaut tout activé). RLS asymétrique via `is_super_admin()` : lecture self ou super admin, écriture super admin only (et jamais contre un super admin) — un admin restreint ne peut pas se dé-restreindre. **Ne pas stocker ça dans `admin_settings`** (writable par tout admin).
- **Feature-gating en RLS (migration 070)** : le blocage par fonctionnalité n'est plus seulement middleware. Helper `admin_has_feature(feature_key text)` (`SECURITY DEFINER`, STABLE) = super-admin **OU** admin dont `feature_key` n'est pas dans `admin_disabled_features`. Les écritures (INSERT/UPDATE/DELETE) de `quests`, `quest_iterations`, `quest_periods`, `quests_establishments` exigent `admin_has_feature('quests')` — un admin restreint est bloqué **même via appel REST direct** (le form admin passant par la clé anon + RLS). Les lectures restent inchangées. Pour étendre à une autre feature : reprendre le même pattern sur ses tables de config (les tables encore en `role='admin'` simple ne vérifient pas la feature).
- **`src/lib/features.ts`** : registre `FEATURE_KEYS` + `FEATURE_ROUTES` + `resolveFeatureKey(pathname)` (longest-prefix match, sous-routes héritent du parent). Module **pur data sans lucide** : c'est le seul module de nav importable par le middleware. **Nouvelle page sidebar → ajouter sa clé ici + `featureKey` sur le `NavItem`** (sinon la page n'est pas gérable dans l'onglet Administrateurs de /settings).
- **Blocage dur** dans `src/lib/supabase/middleware.ts` : la query profiles est étendue (`role, is_super_admin, admin_disabled_features!profile_id(feature_key)` — le `!profile_id` est obligatoire, 2 FK vers profiles) ; URL désactivée → redirect `/?error=feature_disabled` (toast via `feature-disabled-toast.tsx`). `/` et `/login` ne sont jamais bloqués ; l'onglet Administrateurs est masqué côté client aux non-super (l'écriture reste protégée par la RLS).
- **Ajouter un admin** : bouton « Ajouter un admin » dans l'onglet Administrateurs (`_components/add-admin-dialog.tsx`) — recherche parmi tous les utilisateurs (`getUsers`, non-admins uniquement) puis promotion via `updateUser(id, { role: 'admin' })` (policy « Admins can update all profiles » + trigger `trg_protect_role` : seul un super admin peut attribuer le rôle `admin`).
- **Changement de rôle client ↔ employé (migration 064, juillet 2026)** : un **admin non super** peut basculer un compte entre `client` et `employee` (les deux sens) depuis l'onglet Édition de `/users/[id]` ; `admin` et `establishment` restent réservés au super admin, et `OLD.role` doit déjà être `client`/`employee` (donc pas de rétrogradation d'un admin, ni de soi-même). Le trigger `trg_protect_role` teste le rôle de l'**appelant** — c'est load-bearing, la policy RLS self-update laisserait sinon un client se promouvoir `employee` (accès scanner/waiters) via `PATCH /rest/v1/profiles`. La contrainte `profiles_staff_requires_establishment` (064, étendue à `establishment` par la **065**) impose un `attached_establishment_id` pour tout compte du personnel — `employee` **et** gérant `establishment` — car sans rattachement il n'a aucun périmètre (scanner/waiters, scope `create_receipt`). Côté UI, le champ Établissement est obligatoire pour ces deux rôles (l'option « Aucun établissement » a disparu) et le submit est bloqué tant qu'il est vide. `edit-tab.tsx` mappe les erreurs `42501` (rôle interdit) et `23514` (personnel sans établissement) en messages dédiés.
- **Comptes du personnel non supprimables (migration 073, août 2026)** : seul un compte `client` peut être supprimé. Garde-fou BDD triple : triggers `BEFORE DELETE` `trg_protect_staff_account_delete` (sur `auth.users`, donc l'Admin API GoTrue aussi) et `trg_protect_staff_profile_delete` (sur `profiles`), plus une garde dans `gdpr_anonymize_user` levée **avant** l'écriture dans `gdpr_requests`. Errcode `P0424`, message `ACCOUNT_ROLE_PROTECTED:`. `service_role` n'est **pas** exempté (contrairement à `trg_protect_role`) ; seul un accès SQL direct (`postgres`/`supabase_admin`) passe outre. Côté UI : la zone dangereuse de `edit-tab.tsx` n'affiche plus le bouton de suppression pour un compte non-client, elle affiche à la place la procédure (repasser le compte en `client`, puis supprimer) ; `P0424` est mappé en message dédié pour le cas où le rôle change dans un autre onglet.
- **Masquage client** : `CurrentAdminProvider` (monté dans `DashboardShell`, hook `useCurrentAdmin()` → `{profile, isSuperAdmin, disabledFeatures, isFeatureEnabled}`) filtre Sidebar + palette Cmd+K ; le Header consomme aussi ce provider (plus de fetch profil ad-hoc). Service : `adminAccessService.ts` (Zod `adminAccess.schema.ts`, keys `adminAccessKeys`).

## Rapports e-mail (`/reports`)

Envois automatiques vers des adresses **internes** (équipe, gérants). Migrations 076/077/078, étendues par 079/080 + Edge Function `send-email-reports`. Détail complet : `CLAUDE.md` du workspace, section « Rapports E-mail Automatisés ».

- **Cinq rapports en seed**, inactifs par défaut : `monthly_activity` (CA, tickets, panier moyen, répartition par établissement, communauté), `weekly_leaderboard`, `monthly_leaderboard`, plus `weekly_new_quests` / `monthly_new_quests` (défis qui s'ouvrent sur la période : nouveautés, défis reconduits, objectifs, récompenses, établissements concernés). Ils sont créés **par migration**, pas depuis l'UI : la page ne fait que les configurer.
- **Bilan ou annonce** : `period_type` donne le **rythme** d'envoi (lundi / 1er du mois), `period_scope` (migration 079) la **période couverte** — `previous` = bilan de la période écoulée, `current` = annonce de la période qui s'ouvre (les deux rapports de défis). Les libellés UI dérivent des deux via `reports/_lib/report-labels.ts` (`cadenceLabel` / `coverageLabel` / `scheduleLabel` / `defaultPeriodLabel`) : **ne pas réécrire « sur la période écoulée » en dur**, ce n'est plus vrai de tous les rapports.
- **Pages** : `/reports` (liste + interrupteur d'activation) et `/reports/[key]` (destinataires, envoi manuel, envoi de test, prévisualisation, historique des runs). Service `emailReportService.ts`, keys `emailReportKeys`, Zod `emailReport.schema.ts`.
- **Feature key `reports`** dans `features.ts` : le gating est appliqué **en RLS** sur les écritures (`admin_has_feature('reports')`), pas seulement par le middleware. Un admin restreint voit la config en lecture et échoue à l'écriture.
- **Activer un rapport ne déclenche jamais d'envoi dans la foulée** (trigger BDD `trg_email_report_activation`, qui marque la période **visée** — selon la portée — comme déjà envoyée). Le premier envoi part au prochain changement de période ; le bouton « Envoyer maintenant » sert à ne pas attendre, et fonctionne même si le rapport est inactif.
- **L'envoi de test ne consomme pas la période** : `last_period_sent` reste inchangé, l'envoi automatique reste programmé.
- **Prévisualisation** : appelle l'Edge Function en mode `preview`, qui renvoie le HTML sans rien envoyer ; l'UI l'ouvre via un blob dans un onglet isolé (popups à autoriser).
- **Statuts de run** ajoutés au registre central `status-badge.tsx` : `success` / `partial` / `error` / `skipped`. Ne pas créer de badge parallèle.
- **Vidéo en pièce jointe** (migration 082) : un rapport de classement peut embarquer une vidéo générée depuis un template HyperFrames. Carte « Vidéo » dans `/reports/[key]` (`_components/video-card.tsx`) : interrupteur, aperçu `<video>` par URL signée, historique des rendus, relance. **Aucune notion HyperFrames n'est exposée à l'admin.** Opt-in par rapport via `email_reports.options.video === true` (JSONB existant, pas de migration pour l'activer). Le rendu vit dans le projet Vercel séparé `royaume-video-renderer` et s'appelle via la route serveur `src/app/api/reports/[key]/video-render/route.ts` (le bearer partagé ne doit jamais descendre dans le navigateur ; env `VIDEO_RENDER_URL` / `VIDEO_RENDER_KEY`). État lu dans `report_video_renders`, fichier dans le bucket privé `report-videos` purgé à 7 jours. Statuts `queued`/`rendering`/`ready`/`expired` ajoutés au registre central `status-badge.tsx`. Détail complet : `CLAUDE.md` du workspace, section « Vidéo en pièce jointe ».
- ⚠️ **`verify_jwt` doit rester désactivé** sur l'Edge Function `send-email-reports` (comme les fonctions Cashpad) : les clés `sb_secret_…` du cron ne sont pas des JWT. Un redéploiement via l'API le remet à `true` : le revérifier après chaque déploiement, sinon le cron tombe en 401 « Invalid API key » silencieusement. Pour le repasser à `false` : `curl -X PATCH -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H 'Content-Type: application/json' -d '{"verify_jwt": false}' https://api.supabase.com/v1/projects/kioysoveqemzjolfwpnu/functions/send-email-reports`.

## Commandes

```bash
npm install
npm run dev          # port 3000
npm run build
npm run lint
npm run supabase:types
```

## Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://kioysoveqemzjolfwpnu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

## Liens

### Imports

```typescript
// 1. React/Next
import { useState } from 'react';
import Link from 'next/link';

// 2. Composants UI
import { Button } from '@/components/ui/button';

// 3. Services
import { getCoupons } from '@/lib/services/couponService';

// 4. Types
import type { Coupon } from '@/types/database';
```

### Services

Les services encapsulent toute la logique d'appel API :

```typescript
// src/lib/services/couponService.ts
export async function getCoupons(filters?: CouponFilters) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
```

### Types

Les types sont generes depuis Supabase et etendus si necessaire :

```typescript
// src/types/database.ts
export type Coupon = Database['public']['Tables']['coupons']['Row'];

// Extension pour les relations
export type CouponWithRelations = Coupon & {
  profiles: Pick<Profile, 'first_name' | 'last_name' | 'email'> | null;
  coupon_templates: Pick<CouponTemplate, 'name'> | null;
};
```

### Validation runtime (Zod) — refonte fondations 2026

Tous les services qui mutent la BDD via une RPC ou un table-write valident leur input avec un schéma Zod défini dans `src/lib/schemas/` :

| Service | Schéma | Couvre |
|---------|--------|--------|
| `couponService.createManualCoupon` | `manualCouponSchema` | UUIDs, XOR template/amount/percentage, format date YYYY-MM-DD |
| `questService.createQuest` / `updateQuest` | `questSchema` / `questUpdateSchema` | slug regex, target positif, consumption_type cohérent, weekly+quest_completed interdit |
| `achievementBadgeService.create` / `update` | `achievementBadgeSchema` / `achievementBadgeUpdateSchema` | slug regex, criterion_params per criterion_type, mode cron requis pour streaks |
| `rewardService.distributeRewards` | `distributeRewardsSchema` | period_type enum, force/previewOnly booléens |
| `seasonService.snapshot` / `awardBadges` / `reset` | `seasonClosureSchema` | year ∈ [2020, 2100], source enum |
| `contentService.updateBeer` | `beerUpdateSchema` | title requis, IBU ∈ [0, 120] entier, ABV ∈ [0, 20], brewery_id positif |
| `contentService.updateEstablishment` / `setEstablishmentConsumptionTypes` | `establishmentUpdateSchema` / `establishmentConsumptionTypesSchema` | title requis, short_description ≤ 150, anniversary AAAA-MM-JJ, enum consumption_type |

**Règle** : si tu ajoutes un nouveau service mutateur, ajoute aussi son schéma Zod dans `src/lib/schemas/` et appelle `schema.parse(input)` au début. Les schémas peuvent ensuite servir de base pour les forms côté UI.

### Forms — react-hook-form + zodResolver

Les forms admin migrés (avril 2026) suivent ce pattern :

```typescript
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schéma UI : peut différer du schéma service (champs string pour les inputs number)
const formSchema = z.object({ /* … */ }).superRefine(/* cross-field */);
type FormInput = z.infer<typeof formSchema>;

const form = useForm<FormInput>({
  resolver: zodResolver(formSchema),
  defaultValues: { /* … */ },
});

const submit = form.handleSubmit(async (values) => {
  // transform values → service payload (conversions €→centimes, etc.)
  await service(payload);
});
```

**Conventions** :
- `register("name")` pour les `<Input>` simples, `<Controller>` pour les `<Select>`/`<Switch>` shadcn
- Erreurs Zod affichées sous chaque champ via `errors.name?.message` (className `text-xs text-destructive`)
- Erreur serveur capturée dans un state local `serverError`, affichée en bandeau au-dessus des actions
- Toast de succès/erreur via `import { toast } from "sonner"` (pas le `useToast` shadcn)

**Forms migrés à date** : `coupons/create`, `rewards/achievements/_form/AchievementBadgeForm` (shared create+edit), `quests/_form/QuestForm` (shared create+edit), `content/beers/[id]` et `content/establishments/[id]` (édition, pattern page = queries + handoff vers composant enfant initialisé depuis les props).

### Data fetching — TanStack React Query

Le `QueryProvider` est branché dans `src/app/layout.tsx` (staleTime 30s, retry 1, no refetchOnWindowFocus).

**Convention des query keys** : `src/lib/queries/keys.ts` expose des factories par domaine.

```typescript
// Lecture
const { data, isLoading } = useQuery({
  queryKey: questKeys.lists(),
  queryFn: getQuests,
});

// Mutation avec invalidation
const queryClient = useQueryClient();
await createQuest(payload);
queryClient.invalidateQueries({ queryKey: questKeys.all });
```

**Règle** : toute mutation qui change le contenu d'un listing **doit** invalider la query key `xxxKeys.all` du domaine pour que la liste se rafraîchisse au retour. Sans ça, l'utilisateur voit du stale jusqu'à 30s.

**Listings migrés à date** : `rewards/achievements`, `coupons`, `users`, `templates`, `quests`, `history`, `receipts`, `rewards/periods`, `reconciliation/health`, `users/[id]` (onglets du détail), plus les pages détail `content/beers/[id]` et `content/establishments/[id]`.

### Conversion target_value des quêtes — piège récurrent

Dans `QuestForm.submit` :
- `quest_type === "amount_spent"` : `parseFloat(value) * 100` → centimes (€ saisis → centimes stockés)
- `quest_type === "cashback_earned"` : `parseInt(value)` → PdB direct (1 PdB = 1 centime, mais saisi en PdB)
- Tous les autres : `parseInt(value)` → unités directes

Si tu modifies cette logique, **vérifie cashback_earned** : la saisie "50" doit donner `target_value = 50`, pas 5000.

## Consignes pour les Agents IA

### Avant de modifier du code

1. **Lire la documentation** dans `docs/docs/supabase/` pour comprendre le schema
2. **Verifier les types** dans `src/types/database.ts`
3. **Consulter les services existants** avant d'en creer de nouveaux

### Points d'attention

- La colonne s'appelle `used` (pas `is_used`) dans la table `coupons`
- Il n'y a PAS de colonne `establishment_id` dans la table `coupons`
- Il n'y a PAS de colonne `used_at` dans la table `coupons`
- Il n'y a PAS de colonnes `total_xp` / `cashback_balance` dans `profiles` (voir vue `user_stats`)
- `establishment_id` dans `gains` est **nullable** (NULL pour les bonus cashback directs)
- `employee_id` dans `receipts` est **nullable** (NULL pour les receipts historiques, rempli via `create_receipt(p_employee_id)`)
- Les fonctions RPC analytics (`get_analytics_revenue`, `get_analytics_debts`, `get_analytics_stock`) : quand un filtre etablissement/employe est actif, les PdB Recompenses et Bonus Coupons retournent 0 (pas de lien etablissement/employe)
- Les fonctions RPC utilisent `SECURITY DEFINER` et bypass RLS
- Les admins creent des coupons via `create_manual_coupon()` RPC
- **Coupons montant fixe** = bonus cashback credite immediatement (used=true des la creation)
- **Coupons pourcentage** = seuls coupons utilisables sur les commandes
- **Quetes** : Le `target_value` pour `amount_spent` est en **centimes** en BDD mais en **euros** dans le frontend (conversion x100)
- Utiliser `(supabase.rpc as any)` pour les appels RPC (limitation de typage)
- Utiliser `(supabase.from("table") as any)` pour insert/update/delete

### Refonte des quêtes (avril 2026) — règles à connaître

- **Modèle template récurrent conservé** : une quête `period_type = weekly` est instanciée par Compagnon × semaine via `quest_progress`, contrainte UNIQUE `(quest_id, customer_id, period_identifier)` garantit « réalisable une fois par semaine ».
- **Nouveau type `consumption_count`** : nécessite `quests.consumption_type` non-NULL (CHECK constraint). Le formulaire admin affiche un Select conditionnel.
- **6 quêtes consumption hebdo créées mais désactivées par défaut** (`weekly_5_bieres`, `weekly_3_cocktails`, etc.). À activer une à une depuis `/quests` selon le calendrier produit.
- **Badges catégorie `quest`** : 3 templates créés (`quest_pelerin`, `quest_grand_pelerin`, `quest_fidele_legendary`). `quest_grand_pelerin` (3 mois consécutifs) doit être attribué manuellement pour l'instant.
- **17 quêtes désactivées en BDD** (ids 10-26 sauf 27-28) — préservées pour l'historique de `quest_progress` / `quest_completion_logs`. Ne pas DELETE.
- **Helpers TypeScript** : `Quest`, `QuestInsert`, `QuestUpdate`, `QuestType`, `ConsumptionType`, `QuestWithRelations`, etc. exposés depuis `@/types/database` (ajoutés manuellement en bas du fichier en avril 2026).
- **Planning `quest_periods` appliqué par le moteur (mai 2026, migration `041`)** : `update_quest_progress_for_receipt` honore désormais `quest_periods` (comme `update_meta_quest_progress`). Quête **sans** période = permanente (récompense chaque période active) ; quête **avec** périodes = récompense **uniquement** si la période courante y figure (rotation). Avant le fix, le moteur ignorait le planning → crédits PdB hors rotation + quêtes défuntes restées actives qui continuaient de payer (incident quête 9 « Dix coupes en sept jours », reprise via gains `rollback_beta_correction`). `/quests/health` alerte sur les quêtes actives **permanentes** (aucune période) ou à **planning périmé** (aucune période ≥ courante) ; l'onglet **Archives** de `/quests` badge en rouge une quête archivée encore `is_active`. ⚠️ Vérifier que l'app **front** respecte aussi `quest_periods` à l'affichage.

### Refonte mécaniques de jeu (avril 2026) — règles à connaître

- **`level_thresholds` contient exactement 25 lignes** (Écuyer I → Chevalier de la Table Ronde). Toute requête doit s'y fier dynamiquement, jamais hardcoder le plafond.
- **Niveau dérivé du XP de la saison courante** : `compute_level_from_xp(p_xp)` lit `level_thresholds`, `get_season_xp(p_customer_id)` filtre `gains.created_at` par année calendaire en cours.
- **`profiles.cashback_coefficient` est auto-maintenu** : ne JAMAIS le modifier manuellement (sauf via la RPC `reset_season`). Un trigger sur `gains` recalcule à chaque INSERT/UPDATE/DELETE.
- **`badge_types.category` accepte 7 valeurs** : `weekly | monthly | yearly | special | season_rank | quest | achievement`. Les 6 badges `season_rank_*` sont attribués au reset annuel via `award_season_rank_badges`. Les 5 badges `achievement_*` (seed migration 025) sont attribués automatiquement via le hook realtime de `create_receipt` ou le cron nocturne selon le `evaluation_mode`. La catégorie `quest` est prête mais aucun badge de quête n'est encore créé.
- **Tables `season_snapshots` et `season_closure_log`** : photographies par année pour la mémoire de saison. Idempotence garantie par PK composite. Ne pas DELETE manuellement sauf debug.
- **Reset n'efface JAMAIS** : ni le solde PdB (`gains` intact), ni les badges (`user_badges` intact), ni les snapshots passés. Seul `cashback_coefficient` revient à 100.

### Apres modification

1. Verifier que les types correspondent a la BDD
2. Mettre a jour la documentation dans `docs/` si necessaire
3. Tester l'integration avec Supabase

## Liens Utiles

- **Supabase Dashboard** : https://app.supabase.com/project/kioysoveqemzjolfwpnu

---

**Derniere mise a jour** : 2026-04-19 (refonte mécaniques de jeu)

## Tâches en attente

Voir `animation/01-fonctionnel/changelog-anticipe.md` pour la liste complète. Côté admin, à venir :

- **Refonte des quêtes** (différée, gros chantier) : changement de modèle vers « one-shot par période ». Va impacter `/quests/*`, services, types.
- **Cron auto pour la clôture an 2+** : 3 pg_cron + 3 fallbacks à mettre en place après validation manuelle de la saison 2026.
- **Setup staging propre** : Supabase Branches (option A) à industrialiser. Pour l'instant, les migrations partent direct en prod sur décision Basile.
- **Modal level-up enrichie** : afficher « Tu gagnes désormais X,Y PdB par € » au franchissement d'un niveau (côté front, mais visualisable depuis l'admin via simulation).
- **Récompenses de classement : moteur réparé, argent volontairement coupé (28/08/2026).** Quatre défauts empilés, tous corrigés et appliqués en prod — **081** (le classement lu venait des vues matérialisées câblées sur `now()`, donc toujours vide au déclenchement des crons, 5 min après la bascule de période ; + défaut de période visant la période qui s'ouvre), **081b/081c** (`get_previous_period_identifier` : surcharge ambiguë introduite par la 081 puis supprimée, et branche `yearly` manquante qui levait `2F005` sur le chemin du cron du 1er janvier), **083** (journal `reward_distribution_runs` + un palier « badge sans coupon » n'attribuait rien, pas même son badge + une période sans récompense n'est plus marquée `distributed`), **084** (l'INSERT de coupon référençait `coupons.establishment_id`, colonne inexistante — **aucune récompense en argent n'a jamais pu être créée**, l'erreur étant avalée par le bloc EXCEPTION de la boucle). **État de la configuration (migration 085) : les 9 `reward_tiers` sont `is_active = true` avec `coupon_template_id = NULL`** — décision produit du 28/08/2026 : le classement récompense en **badges seuls**, coupons et crédits PdB écartés jusqu'à nouvel ordre. On ne désactive PAS les paliers (`is_active = false` couperait aussi les badges : la fonction sort sur « No reward tiers configured » avant de lire le classement) ; c'est le retrait du template qui coupe l'argent, et le palier « badge seul » ne fonctionne que depuis la 083. Vérifié de bout en bout sur `2026-W34` : 10 badges, 10 lignes de journal, **0 coupon, 0 gain**. **Rattrapage de l'historique** : exécuté puis **annulé le 28/08/2026** côté argent (145 crédits / 1 237 € / 145 coupons / 297 lignes de log supprimés, `period_reward_configs` restauré à l'identique, rien n'avait été dépensé) ; **les badges ont été conservés** — 256 badges attribués, couverture complète de W06→W34 et 2026-02→2026-07, tous pré-marqués `seen_at` pour ne pas déclencher de modale de célébration. Trois périodes portent un badge de plus que de classés (`2026-W06`, `2026-W10`, `2026-02`) : reliquat des distributions manuelles de février, calculées en cours de période. ⚠️ Les badges attribués **à partir de W35** auront `seen_at = NULL` : la modale de célébration se déclenchera normalement côté app (seul le rattrapage rétroactif a été pré-marqué). Mapping template à restaurer si l'argent revient : 16→24, 17→27, 19→7, 20→8, 21→9, 22→25.
- **Alerte e-mail de distribution en place (migration 088).** Cron horaire `reward-distribution-alerts` → fonction Edge **`send-reward-alert`** (⚠️ `verify_jwt` doit rester à `false`) → RPC `get_reward_distribution_alerts` → Resend → `mark_reward_distribution_alerts_sent`. Alerte sur `error` / `partial`, et sur `skipped` avec `empty_leaderboard` / `no_active_tiers` / `no_matching_tier` ; pas sur `success` ni `already_distributed`. Destinataires dans `admin_settings.reward_alert_recipients` (défaut `["direction@ipdev.lu"]`), modifiables sans redéploiement. Idempotence par `reward_distribution_runs.alerted_at`, acquitté **après** envoi réussi seulement. Fonction Edge **dédiée** et non un rapport `email_reports` : la clé Resend n'existe que comme secret de fonction Edge (pg_net ne peut pas appeler Resend depuis un cron SQL), et le modèle `email_reports` est périodique, incompatible avec une alerte. Chaîne validée **de bout en bout, envoi Resend compris**, le 28/08/2026 : une exécution réelle sur `2026-W02` (semaine sans joueur classé, donc alerte `empty_leaderboard` authentique) a produit `{"alerts":1,"sent":1,"acquittees":1,"failures":[]}`, et le second appel a rendu `{"alerts":0,"sent":0}` — pas de doublon.
