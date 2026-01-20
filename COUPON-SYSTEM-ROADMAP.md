# Roadmap - Refonte du Système de Coupons

## Contexte

Ce document décrit les modifications à apporter pour transformer le système de coupons actuel (triggers hardcodés) en un système administrable via une interface dédiée.

## Résumé des décisions

| Aspect | Décision |
|--------|----------|
| **Interface admin** | Dashboard web séparé (Next.js) |
| **Repository** | Nouveau repo : `royaume-paraiges-admin` |
| **Hébergement** | Vercel |
| **Auth** | Supabase Auth existant (role=admin) |
| **Types de coupons** | Montant fixe + Pourcentage |
| **Scope coupons** | Global ou par établissement |
| **Expiration** | Date d'expiration configurable |
| **Triggers actuels** | À supprimer (tout via interface) |
| **Distribution leaderboard** | Cron automatique + déclenchement manuel |
| **Rangs** | Personnalisables (paliers libres) |
| **Prévisualisation** | Oui, avant distribution |
| **Coupons manuels** | Oui, hors leaderboard |
| **Analytics** | Dashboard complet |
| **Notifications** | Non (pour l'instant) |

---

## Phase 1 : Modifications Base de Données (Supabase) ✅ TERMINÉE

> **Statut** : Implémentée le 2026-01-20
>
> **Migrations appliquées** :
> - `create_coupon_templates_table`
> - `create_reward_tiers_table`
> - `create_period_reward_configs_table`
> - `create_coupon_distribution_logs_table`
> - `alter_coupons_table_add_fields`
> - `drop_legacy_coupon_triggers`
> - `create_function_get_period_identifier`
> - `create_function_distribute_period_rewards_v2`
> - `create_function_create_manual_coupon`
> - `create_function_get_period_preview`
> - `configure_rls_policies_coupon_system`
> - `enable_pg_cron_and_schedule_jobs`
> - `seed_default_coupon_templates_and_tiers`

### 1.1 Nouvelles tables

#### Table `coupon_templates`
Définit les modèles de coupons réutilisables.

```sql
CREATE TABLE coupon_templates (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type de valeur (un seul doit être renseigné)
  amount INTEGER, -- Montant en centimes (ex: 1000 = 10€)
  percentage INTEGER, -- Pourcentage (ex: 15 = 15%)

  -- Scope
  establishment_id INTEGER, -- NULL = tous les établissements

  -- Validité
  validity_days INTEGER, -- Nombre de jours de validité après attribution (NULL = pas d'expiration)

  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);
```

#### Table `reward_tiers`
Définit les paliers de récompenses pour le leaderboard.

```sql
CREATE TABLE reward_tiers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(100) NOT NULL, -- Ex: "Champion", "Podium", "Top 10"

  -- Plage de rangs
  rank_from INTEGER NOT NULL, -- Rang minimum (inclus)
  rank_to INTEGER NOT NULL, -- Rang maximum (inclus)

  -- Récompenses associées
  coupon_template_id BIGINT REFERENCES coupon_templates(id),
  badge_type_id BIGINT REFERENCES badge_types(id),

  -- Période concernée
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'yearly')),

  -- Ordre d'affichage
  display_order INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Table `period_reward_configs`
Permet de personnaliser les récompenses pour une période spécifique.

```sql
CREATE TABLE period_reward_configs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

  -- Période concernée
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'yearly')),
  period_identifier VARCHAR(20) NOT NULL, -- Ex: "2026-W04", "2026-01", "2026"

  -- Configuration spécifique (JSON array de tiers)
  custom_tiers JSONB, -- Surcharge les reward_tiers par défaut

  -- État
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'distributed', 'cancelled')),
  distributed_at TIMESTAMPTZ,
  distributed_by UUID REFERENCES profiles(id),

  -- Notes admin
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(period_type, period_identifier)
);
```

#### Table `coupon_distribution_logs`
Historique détaillé des distributions.

```sql
CREATE TABLE coupon_distribution_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,

  -- Contexte
  distribution_type VARCHAR(50) NOT NULL, -- 'leaderboard_weekly', 'leaderboard_monthly', 'manual', etc.
  period_identifier VARCHAR(20), -- Pour leaderboard

  -- Destinataire
  customer_id UUID NOT NULL REFERENCES profiles(id),

  -- Coupon créé
  coupon_id BIGINT REFERENCES coupons(id),
  coupon_template_id BIGINT REFERENCES coupon_templates(id),

  -- Contexte leaderboard (si applicable)
  rank INTEGER,
  tier_id BIGINT REFERENCES reward_tiers(id),
  xp_at_distribution INTEGER,

  -- Métadonnées
  distributed_at TIMESTAMPTZ DEFAULT now(),
  distributed_by UUID REFERENCES profiles(id), -- NULL si automatique
  notes TEXT
);
```

### 1.2 Modifications table `coupons` existante

```sql
ALTER TABLE coupons
  ADD COLUMN template_id BIGINT REFERENCES coupon_templates(id),
  ADD COLUMN establishment_id INTEGER, -- NULL = tous
  ADD COLUMN expires_at TIMESTAMPTZ, -- Date d'expiration
  ADD COLUMN distribution_type VARCHAR(50), -- 'leaderboard', 'manual', 'trigger_legacy'
  ADD COLUMN period_identifier VARCHAR(20); -- Pour traçabilité leaderboard
```

### 1.3 Suppression des triggers existants

```sql
-- Supprimer les triggers automatiques (remplacés par l'interface)
DROP TRIGGER IF EXISTS trigger_weekly_coupon ON receipts;
DROP TRIGGER IF EXISTS trigger_frequency_coupon ON receipts;

-- Optionnel : garder les fonctions pour référence ou les supprimer
DROP FUNCTION IF EXISTS check_and_create_weekly_coupon();
DROP FUNCTION IF EXISTS check_and_create_frequency_coupon();
```

### 1.4 Nouvelles fonctions PostgreSQL

#### Fonction `distribute_period_rewards_v2`

```sql
CREATE OR REPLACE FUNCTION distribute_period_rewards_v2(
  p_period_type VARCHAR,
  p_period_identifier VARCHAR DEFAULT NULL,
  p_force BOOLEAN DEFAULT false,
  p_preview_only BOOLEAN DEFAULT false,
  p_admin_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Nouvelle fonction avec :
-- - Support des reward_tiers configurables
-- - Support des period_reward_configs personnalisés
-- - Mode prévisualisation (p_preview_only)
-- - Logging détaillé dans coupon_distribution_logs
-- - Gestion des dates d'expiration
$$;
```

#### Fonction `create_manual_coupon`

```sql
CREATE OR REPLACE FUNCTION create_manual_coupon(
  p_customer_id UUID,
  p_template_id BIGINT DEFAULT NULL,
  p_amount INTEGER DEFAULT NULL,
  p_percentage INTEGER DEFAULT NULL,
  p_establishment_id INTEGER DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Créer un coupon manuellement (hors leaderboard)
-- Soit depuis un template, soit avec des valeurs custom
$$;
```

#### Fonction `get_period_preview`

```sql
CREATE OR REPLACE FUNCTION get_period_preview(
  p_period_type VARCHAR,
  p_period_identifier VARCHAR DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Retourne la prévisualisation de qui recevrait quoi
-- Sans créer de coupons
$$;
```

### 1.5 Configuration pg_cron

```sql
-- Activer l'extension pg_cron (via Supabase Dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Distribution hebdomadaire : Lundi à 00:05 UTC
SELECT cron.schedule(
  'distribute-weekly-rewards',
  '5 0 * * 1',
  $$SELECT distribute_period_rewards_v2('weekly')$$
);

-- Distribution mensuelle : 1er du mois à 00:10 UTC
SELECT cron.schedule(
  'distribute-monthly-rewards',
  '10 0 1 * *',
  $$SELECT distribute_period_rewards_v2('monthly')$$
);

-- Distribution annuelle : 1er janvier à 00:15 UTC
SELECT cron.schedule(
  'distribute-yearly-rewards',
  '15 0 1 1 *',
  $$SELECT distribute_period_rewards_v2('yearly')$$
);
```

### 1.6 Politiques RLS

```sql
-- Accès admin uniquement pour les nouvelles tables
CREATE POLICY "Admin full access on coupon_templates"
  ON coupon_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin full access on reward_tiers"
  ON reward_tiers FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin full access on period_reward_configs"
  ON period_reward_configs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin read access on coupon_distribution_logs"
  ON coupon_distribution_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

## Phase 2 : Dashboard Admin (royaume-paraiges-admin)

### 2.1 Stack technique

- **Framework** : Next.js 14+ (App Router)
- **UI** : Tailwind CSS + shadcn/ui
- **Auth** : Supabase Auth
- **Déploiement** : Vercel
- **Charts** : Recharts ou Chart.js

### 2.2 Structure du projet

```
royaume-paraiges-admin/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard principal
│   │   ├── coupons/
│   │   │   ├── page.tsx                # Liste des coupons
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx            # Détail coupon
│   │   │   └── create/
│   │   │       └── page.tsx            # Créer coupon manuel
│   │   ├── templates/
│   │   │   ├── page.tsx                # Liste templates
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx            # Éditer template
│   │   │   └── create/
│   │   │       └── page.tsx            # Créer template
│   │   ├── rewards/
│   │   │   ├── page.tsx                # Config récompenses leaderboard
│   │   │   ├── tiers/
│   │   │   │   └── page.tsx            # Gérer les paliers
│   │   │   ├── periods/
│   │   │   │   ├── page.tsx            # Liste des périodes
│   │   │   │   └── [identifier]/
│   │   │   │       └── page.tsx        # Config période spécifique
│   │   │   └── distribute/
│   │   │       └── page.tsx            # Distribution manuelle
│   │   ├── history/
│   │   │   └── page.tsx                # Historique distributions
│   │   └── analytics/
│   │       └── page.tsx                # Statistiques
│   └── api/
│       └── [...supabase]/
│           └── route.ts
├── components/
│   ├── ui/                             # shadcn/ui components
│   ├── coupons/
│   │   ├── CouponList.tsx
│   │   ├── CouponForm.tsx
│   │   ├── CouponCard.tsx
│   │   └── CouponFilters.tsx
│   ├── templates/
│   │   ├── TemplateList.tsx
│   │   ├── TemplateForm.tsx
│   │   └── TemplateSelector.tsx
│   ├── rewards/
│   │   ├── TierList.tsx
│   │   ├── TierForm.tsx
│   │   ├── PeriodConfig.tsx
│   │   ├── DistributionPreview.tsx
│   │   └── LeaderboardPreview.tsx
│   ├── analytics/
│   │   ├── CouponStats.tsx
│   │   ├── DistributionChart.tsx
│   │   ├── UsageChart.tsx
│   │   └── EstablishmentBreakdown.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── Breadcrumbs.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── services/
│   │   ├── couponService.ts
│   │   ├── templateService.ts
│   │   ├── rewardService.ts
│   │   └── analyticsService.ts
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
├── types/
│   └── database.ts                     # Types générés Supabase
└── middleware.ts                       # Auth middleware
```

### 2.3 Pages et fonctionnalités

#### Dashboard principal (`/`)
- Résumé des coupons actifs
- Prochaines distributions prévues
- Alertes (périodes non configurées, etc.)
- Graphique des distributions récentes

#### Gestion des templates (`/templates`)
- Liste des templates avec filtres
- Création/édition de template
- Activation/désactivation
- Duplication de template

#### Configuration des récompenses (`/rewards`)
- **Paliers par défaut** (`/rewards/tiers`)
  - CRUD des paliers (1er, 2-5, 6-10, etc.)
  - Association template + badge par palier
  - Configuration par type de période (hebdo/mensuel/annuel)

- **Périodes spécifiques** (`/rewards/periods`)
  - Calendrier des périodes à venir
  - Personnalisation des récompenses par période
  - Statut (pending/distributed/cancelled)

- **Distribution** (`/rewards/distribute`)
  - Sélection de la période
  - Prévisualisation (qui reçoit quoi)
  - Bouton de distribution manuelle
  - Historique des distributions

#### Coupons manuels (`/coupons`)
- Liste de tous les coupons (avec filtres)
- Création de coupon pour un utilisateur spécifique
- Recherche d'utilisateur
- Export CSV

#### Historique (`/history`)
- Journal des distributions
- Filtres par période, type, utilisateur
- Détails de chaque distribution

#### Analytics (`/analytics`)
- **Graphiques** :
  - Coupons distribués par période
  - Taux d'utilisation
  - Valeur totale distribuée vs utilisée
  - Répartition par établissement
  - Top utilisateurs (coupons reçus/utilisés)
- **KPIs** :
  - Nombre total de coupons actifs
  - Valeur potentielle des coupons non utilisés
  - Taux d'expiration
  - Moyenne de coupons par utilisateur

---

## Phase 3 : Intégration App Mobile ✅ TERMINÉE

> **Statut** : Implémentée le 2026-01-20
>
> **Fichiers modifiés** :
> - `src/features/coupons/types/coupon.types.ts` - Types étendus pour expiration et établissement
> - `src/features/coupons/services/couponService.ts` - Méthodes de validation et formatage
> - `src/features/coupons/hooks/useCoupons.ts` - Support des options de filtrage
> - `src/features/coupons/hooks/useCouponValidity.ts` - Nouveau hook de validité
> - `src/features/coupons/components/CouponCard.tsx` - Badge d'expiration
> - `src/features/coupons/components/CouponModal.tsx` - Affichage expiration et établissement

### 3.1 Modifications des services existants

#### `src/features/coupons/services/couponService.ts`
- ✅ Adapter pour supporter les nouveaux champs (expires_at, establishment_id)
- ✅ Ajouter le filtrage des coupons expirés
- ✅ Ajouter la vérification de l'établissement si applicable

#### `src/features/coupons/hooks/`
- ✅ Mettre à jour les hooks pour gérer l'expiration
- ✅ Ajouter un hook pour vérifier la validité d'un coupon

### 3.2 Modifications UI

- ✅ Afficher la date d'expiration sur les coupons
- ✅ Indicateur visuel pour coupons bientôt expirés
- ✅ Filtrer/masquer les coupons expirés
- ✅ Afficher l'établissement de validité si restreint

---

## Phase 4 : Migration des données ✅ TERMINÉE

> **Statut** : Script créé le 2026-01-20
>
> **Fichier de migration** : `migrations/phase4_data_migration.sql`
>
> **Templates créés** :
> - Coupon Hebdo 50€ (3.90€, 30 jours)
> - Coupon Fréquence 5% (5%, 30 jours)
> - Récompense Champion (10€, 60 jours)
> - Récompense Podium (5€, 45 jours)
> - Récompense Top 10 (10%, 30 jours)
>
> **Tiers créés** :
> - 3 tiers hebdomadaires (Champion, Podium, Top 10)
> - 3 tiers mensuels (Champion, Podium, Top 10)
> - 3 tiers annuels (Champion, Podium, Top 10)

### 4.1 Script de migration

Le script complet est disponible dans `migrations/phase4_data_migration.sql`.

**Résumé des opérations :**

1. ✅ Création des templates de coupons (5 templates)
2. ✅ Création des reward_tiers par défaut (9 tiers)
3. ✅ Association automatique des templates aux tiers
4. ✅ Migration des coupons existants (`distribution_type = 'trigger_legacy'`)

---

## Récapitulatif des tâches

### Backend (Supabase) ✅ TERMINÉ

- [x] Créer la table `coupon_templates`
- [x] Créer la table `reward_tiers`
- [x] Créer la table `period_reward_configs`
- [x] Créer la table `coupon_distribution_logs`
- [x] Modifier la table `coupons` (nouveaux champs)
- [x] Supprimer les triggers `trigger_weekly_coupon` et `trigger_frequency_coupon`
- [x] Supprimer les fonctions `check_and_create_weekly_coupon` et `check_and_create_frequency_coupon`
- [x] Créer la fonction `distribute_period_rewards_v2`
- [x] Créer la fonction `create_manual_coupon`
- [x] Créer la fonction `get_period_preview`
- [x] Créer la fonction `get_coupon_stats`
- [x] Configurer les politiques RLS pour les nouvelles tables
- [x] Activer pg_cron
- [x] Configurer les jobs cron (hebdo, mensuel, annuel)
- [x] Exécuter le script de migration des données (templates et tiers par défaut)

### Dashboard Admin (nouveau repo)

- [ ] Initialiser le projet Next.js
- [ ] Configurer Supabase client
- [ ] Configurer l'authentification admin
- [ ] Créer le layout principal (sidebar, header)
- [ ] Page Dashboard principal
- [ ] Pages Templates (CRUD)
- [ ] Pages Reward Tiers (CRUD)
- [ ] Pages Periods (liste, config, preview)
- [ ] Page Distribution manuelle
- [ ] Pages Coupons (liste, création manuelle)
- [ ] Page Historique
- [ ] Page Analytics (graphiques, KPIs)
- [ ] Déployer sur Vercel

### App Mobile ✅ TERMINÉ

- [x] Mettre à jour `couponService.ts` pour les nouveaux champs
- [x] Ajouter la gestion de l'expiration dans les hooks
- [x] Mettre à jour l'UI pour afficher l'expiration
- [x] Mettre à jour l'UI pour afficher l'établissement de validité
- [ ] Tester la compatibilité avec les anciens coupons

### Tests et validation

- [ ] Tester la création de templates via l'interface
- [ ] Tester la configuration des paliers
- [ ] Tester la prévisualisation de distribution
- [ ] Tester la distribution manuelle
- [ ] Tester la distribution automatique (cron)
- [ ] Tester la création de coupons manuels
- [ ] Tester l'expiration des coupons
- [ ] Tester les restrictions par établissement
- [ ] Valider les analytics

---

## Notes importantes

1. **Ordre d'exécution** : Commencer par les modifications Supabase, puis le dashboard, puis l'app mobile.

2. **Rétrocompatibilité** : Les coupons existants continueront de fonctionner. Le champ `distribution_type = 'trigger_legacy'` les identifie.

3. **Rollback** : Garder les anciennes fonctions commentées dans un fichier de migration séparé en cas de besoin.

4. **Sécurité** : Le dashboard n'est accessible qu'aux utilisateurs avec `role = 'admin'` dans la table `profiles`.

5. **Cron timing** : Les distributions automatiques se font quelques minutes après minuit UTC pour s'assurer que les vues matérialisées sont à jour.
