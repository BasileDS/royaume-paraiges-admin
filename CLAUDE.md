# CLAUDE.md - Royaume des Paraiges Admin

## Apercu du Projet

**royaume-paraiges-admin** est l'interface d'administration du Royaume des Paraiges, une application de fidelite gamifiee autour de la biere. Cette interface permet aux administrateurs de gerer les utilisateurs, les coupons, les recompenses et de visualiser les statistiques.

## Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Next.js | 16.1.4 | Framework React avec App Router |
| React | 19.2.3 | Bibliotheque UI |
| TypeScript | 5.7.3 | Typage statique |
| Supabase | 2.47.14 | Backend (Auth, Database, Storage) |
| Radix UI / shadcn/ui | - | Composants UI |
| Tailwind CSS | 3.4.17 | Styling |
| Recharts | 2.15.0 | Graphiques et visualisations |

## Structure du Projet

```
royaume-paraiges-admin/
├── src/
│   ├── app/                      # App Router Next.js
│   │   ├── (auth)/               # Routes authentification
│   │   │   └── login/
│   │   ├── (dashboard)/          # Routes dashboard (protegees)
│   │   │   ├── analytics/        # Tableau de bord analytique
│   │   │   ├── coupons/          # Gestion des coupons
│   │   │   │   └── create/       # Creation de coupon
│   │   │   ├── templates/        # Gestion des modeles de coupons
│   │   │   │   ├── create/       # Creation de modele
│   │   │   │   └── [id]/         # Edition de modele
│   │   │   ├── users/            # Gestion des utilisateurs
│   │   │   │   └── [id]/         # Detail utilisateur
│   │   │   ├── receipts/         # Historique des tickets
│   │   │   ├── history/          # Historique general
│   │   │   ├── rewards/          # Systeme de recompenses
│   │   │   │   ├── tiers/        # Paliers de recompenses
│   │   │   │   │   ├── create/   # Creation de palier
│   │   │   │   │   └── [id]/     # Edition de palier
│   │   │   │   ├── periods/      # Configuration des periodes
│   │   │   │   │   ├── create/   # Creation de periode
│   │   │   │   │   └── [periodType]/[identifier]/ # Detail periode
│   │   │   │   └── distribute/   # Distribution des recompenses
│   │   │   ├── quests/           # Gestion des quetes
│   │   │   │   ├── create/       # Creation de quete
│   │   │   │   └── [id]/         # Edition de quete
│   │   │   ├── content/          # Contenu (bieres, etablissements)
│   │   │   │   ├── beers/
│   │   │   │   │   └── [id]/     # Detail biere
│   │   │   │   └── establishments/
│   │   │   │       └── [id]/     # Detail etablissement
│   │   │   └── page.tsx          # Dashboard principal
│   │   └── layout.tsx
│   │
│   ├── components/               # Composants React
│   │   ├── ui/                   # Composants shadcn/ui
│   │   └── layout/               # Layout (Sidebar, Header)
│   │
│   ├── lib/                      # Utilitaires et services
│   │   ├── services/             # Services metier
│   │   │   ├── analyticsService.ts  # Statistiques et metriques
│   │   │   ├── contentService.ts    # Contenu (bieres, etablissements)
│   │   │   ├── couponService.ts     # Gestion des coupons
│   │   │   ├── periodService.ts     # Gestion des periodes
│   │   │   ├── questService.ts      # Gestion des quetes
│   │   │   ├── receiptService.ts    # Historique des tickets
│   │   │   ├── rewardService.ts     # Paliers et distributions
│   │   │   ├── templateService.ts   # Modeles de coupons
│   │   │   └── userService.ts       # Gestion utilisateurs
│   │   ├── supabase/             # Client Supabase
│   │   └── utils.ts
│   │
│   └── types/                    # Types TypeScript
│       └── database.ts           # Types Supabase (inclut tables migrees depuis Directus)
│
├── docs/                         # SUBMODULE - Documentation partagee
│   └── docs/
│       ├── supabase/             # Doc Supabase
│       │   ├── tables/           # Structure des tables
│       │   ├── functions/        # Fonctions PostgreSQL
│       │   ├── policies/         # Politiques RLS
│       │   └── README.md
│       └── claude/               # Config Claude
│
└── package.json
```

## Documentation de Reference

> **IMPORTANT** : La documentation complete du backend est dans le submodule `docs/`.

### Supabase (Base de donnees)

| Document | Chemin | Description |
|----------|--------|-------------|
| Tables | `docs/docs/supabase/tables/` | Structure de toutes les tables |
| Coupons | `docs/docs/supabase/tables/coupons.md` | Table des coupons |
| Coupon Templates | `docs/docs/supabase/tables/coupon_templates.md` | Modeles de coupons |
| Profiles | `docs/docs/supabase/tables/profiles.md` | Table des utilisateurs |
| Gains | `docs/docs/supabase/tables/gains.md` | Table des gains (XP, cashback) |
| Receipts | `docs/docs/supabase/tables/receipts.md` | Table des tickets |
| Receipt Lines | `docs/docs/supabase/tables/receipt_lines.md` | Lignes de paiement |
| Spendings | `docs/docs/supabase/tables/spendings.md` | Depenses cashback |
| Reward Tiers | `docs/docs/supabase/tables/reward_tiers.md` | Paliers de recompenses |
| Period Reward Configs | `docs/docs/supabase/tables/period_reward_configs.md` | Config des periodes |
| Badge Types | `docs/docs/supabase/tables/badge_types.md` | Types de badges |
| Quests | `docs/docs/supabase/tables/quests.md` | Quetes |
| Quest Progress | `docs/docs/supabase/tables/quest_progress.md` | Progression des quetes |
| Available Periods | `docs/docs/supabase/tables/available_periods.md` | Periodes disponibles |
| Legal Pages | `docs/docs/supabase/tables/legal_pages.md` | Pages legales (CGU, confidentialite) |
| Fonctions | `docs/docs/supabase/functions/` | Fonctions PostgreSQL |
| create_receipt | `docs/docs/supabase/functions/create_receipt.md` | Creation de ticket (POS) |
| calculate_gains | `docs/docs/supabase/functions/calculate_gains.md` | Calcul XP et cashback |
| credit_bonus_cashback | `docs/docs/supabase/functions/credit_bonus_cashback.md` | Credit bonus cashback |
| distribute_leaderboard_rewards | `docs/docs/supabase/functions/distribute_leaderboard_rewards.md` | Distribution recompenses (legacy) |
| handle_new_user | `docs/docs/supabase/functions/handle_new_user.md` | Trigger creation profil |
| Politiques RLS | `docs/docs/supabase/policies/README.md` | Toutes les politiques de securite |

### Tables de contenu

| Table | Description |
|-------|-------------|
| `breweries` | Brasseries |
| `establishments` | Etablissements partenaires |
| `beer_styles` | Styles de bieres |
| `beers` | Catalogue des bieres |
| `news` | Actualites |
| `level_thresholds` | Niveaux et XP requis |
| `beers_establishments` | Liaison M2M bieres-etablissements |
| `beers_beer_styles` | Liaison M2M bieres-styles |
| `news_establishments` | Liaison M2M news-etablissements |
| `legal_pages` | Pages legales (CGU, confidentialite) |

## Fonctionnalites Principales

### 1. Gestion des Coupons

**Fichiers cles** :
- `src/app/(dashboard)/coupons/page.tsx` - Liste des coupons
- `src/app/(dashboard)/coupons/create/page.tsx` - Creation de coupon
- `src/lib/services/couponService.ts` - Service metier

**Fonction RPC** : `create_manual_coupon()` - Cree un coupon manuel. Si montant fixe, credite directement en bonus cashback.

```typescript
// Exemple d'utilisation
import { createManualCoupon } from '@/lib/services/couponService';

await createManualCoupon({
  customerId: 'uuid',
  templateId: 1,        // Ou amount/percentage
  notes: 'Geste commercial',
  adminId: currentUser.id
});
```

### 2. Gestion des Utilisateurs

**Fichiers cles** :
- `src/app/(dashboard)/users/page.tsx` - Liste des utilisateurs
- `src/app/(dashboard)/users/[id]/page.tsx` - Detail utilisateur
- `src/lib/services/userService.ts` - Service metier

### 3. Analytics Dashboard

**Fichiers cles** :
- `src/app/(dashboard)/page.tsx` - Dashboard principal
- `src/app/(dashboard)/analytics/page.tsx` - Tableau de bord analytique detaille
- `src/lib/services/analyticsService.ts` - Statistiques et metriques

### 4. Gestion des Modeles de Coupons (Templates)

**Fichiers cles** :
- `src/app/(dashboard)/templates/page.tsx` - Liste des modeles
- `src/app/(dashboard)/templates/create/page.tsx` - Creation de modele
- `src/app/(dashboard)/templates/[id]/page.tsx` - Edition de modele
- `src/lib/services/templateService.ts` - Service metier

**Fonctions disponibles** :
```typescript
import {
  getTemplates,
  getActiveTemplates,
  createTemplate,
  updateTemplate,
  toggleTemplateActive,
  deleteTemplate
} from '@/lib/services/templateService';

// Exemples d'utilisation
const templates = await getTemplates();
const activeTemplates = await getActiveTemplates();
await createTemplate({ name: 'Nouveau modele', amount: 500 });
await toggleTemplateActive(templateId, false);
```

### 5. Systeme de Recompenses (Rewards)

Systeme complet de gestion des recompenses par classement (leaderboard).

**Fichiers cles** :
- `src/app/(dashboard)/rewards/page.tsx` - Vue d'ensemble (inclut la liste des paliers)
- `src/app/(dashboard)/rewards/tiers/create/page.tsx` - Creation de palier
- `src/app/(dashboard)/rewards/tiers/[id]/page.tsx` - Edition de palier
- `src/app/(dashboard)/rewards/periods/page.tsx` - Configuration des periodes
- `src/app/(dashboard)/rewards/periods/create/page.tsx` - Creation de periode
- `src/app/(dashboard)/rewards/periods/[periodType]/[identifier]/page.tsx` - Detail periode
- `src/app/(dashboard)/rewards/distribute/page.tsx` - Distribution des recompenses
- `src/lib/services/rewardService.ts` - Service metier

**Structure d'un palier (Reward Tier)** :

| Champ | Type | Description |
|-------|------|-------------|
| id | BIGINT | PK |
| name | TEXT | Nom du palier (ex: "Top 1") |
| period_type | VARCHAR | weekly, monthly, yearly |
| rank_from | INTEGER | Rang de debut (ex: 1) |
| rank_to | INTEGER | Rang de fin (ex: 1) |
| coupon_template_id | BIGINT | FK vers coupon_templates |
| badge_type_id | BIGINT | FK vers badge_types |
| display_order | INTEGER | Ordre d'affichage |
| is_active | BOOLEAN | Actif ou non |

**Fonctions RPC** :
```typescript
// Previsualisation des recompenses a distribuer
const preview = await supabase.rpc('get_period_preview', {
  p_period_type: 'weekly'
});

// Distribution des recompenses
await supabase.rpc('distribute_period_rewards_v2', {
  p_period_type: 'weekly',
  p_period_identifier: '2026-W03'
});
```

**Fonctions du service** :
```typescript
import {
  getRewardTiers,
  createRewardTier,
  updateRewardTier,
  deleteRewardTier
} from '@/lib/services/rewardService';
```

### 6. Gestion des Quetes

Systeme de defis periodiques pour les utilisateurs.

**Fichiers cles** :
- `src/app/(dashboard)/quests/page.tsx` - Liste des quetes
- `src/app/(dashboard)/quests/create/page.tsx` - Creation de quete
- `src/app/(dashboard)/quests/[id]/page.tsx` - Edition de quete
- `src/lib/services/questService.ts` - Service metier
- `src/lib/services/periodService.ts` - Gestion des periodes

**Types de quetes** :

| Type | Description | Unite objectif |
|------|-------------|----------------|
| `xp_earned` | Gagner de l'XP | XP |
| `amount_spent` | Depenser de l'argent | Euros (€) dans le frontend, centimes en BDD |
| `establishments_visited` | Visiter des etablissements | Nombre |
| `orders_count` | Passer des commandes | Nombre |

**Conversion Euros/Centimes** :

> **IMPORTANT** : Le champ `target_value` pour le type `amount_spent` est stocke en **centimes** dans la base de donnees, mais saisi et affiche en **euros** dans le frontend.

```typescript
// Saisie → Sauvegarde (euros → centimes)
const targetValue = form.questType === "amount_spent"
  ? Math.round(parseFloat(form.targetValue) * 100)
  : parseInt(form.targetValue);

// Chargement → Affichage (centimes → euros)
const targetValueDisplay = quest.quest_type === "amount_spent"
  ? (quest.target_value / 100).toString()
  : quest.target_value.toString();
```

**Fonctions du service** :
```typescript
import {
  getQuests,
  getActiveQuests,
  getQuest,
  createQuest,
  updateQuest,
  deleteQuest,
  toggleQuestActive,
  getQuestPeriods,
  setQuestPeriods
} from '@/lib/services/questService';
```

### 7. Gestion du Contenu

**Fichiers cles** :
- `src/app/(dashboard)/content/beers/page.tsx` - Liste des bieres
- `src/app/(dashboard)/content/beers/[id]/page.tsx` - Detail/edition biere
- `src/app/(dashboard)/content/establishments/page.tsx` - Liste des etablissements
- `src/app/(dashboard)/content/establishments/[id]/page.tsx` - Detail/edition etablissement
- `src/lib/services/contentService.ts` - Service metier

## Schema de la Base de Donnees (Resume)

### Table `coupons`

| Colonne | Type | Description |
|---------|------|-------------|
| id | BIGINT | PK |
| customer_id | UUID | FK vers profiles |
| amount | INTEGER | Montant en centimes (ou NULL) |
| percentage | INTEGER | Pourcentage (ou NULL) |
| used | BOOLEAN | Coupon utilise ? |
| expires_at | TIMESTAMPTZ | Date d'expiration |
| distribution_type | VARCHAR | Source (manual, leaderboard, etc.) |
| template_id | BIGINT | FK vers coupon_templates |
| period_identifier | VARCHAR | Periode associee (ex: 2026-W06) |

> Documentation complete : `docs/docs/supabase/tables/coupons.md`

### Table `profiles`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | PK (= auth.users.id) |
| email | TEXT | Email |
| first_name | TEXT | Prenom |
| last_name | TEXT | Nom |
| username | TEXT | Nom d'utilisateur (genere auto) |
| role | user_role | client, employee, establishment, admin |
| avatar_url | TEXT | URL de l'avatar |
| phone | TEXT | Telephone |
| birthdate | DATE | Date de naissance |
| xp_coefficient | INTEGER | Coefficient XP (defaut: 100) |
| cashback_coefficient | INTEGER | Coefficient cashback (defaut: 100) |
| attached_establishment_id | INTEGER | FK vers establishments (pour employees/gerants) |

> **Note** : `total_xp` et `cashback_balance` ne sont PAS des colonnes de `profiles`. Ils sont calcules via la vue materialisee `user_stats` (qui agrege depuis `gains`).

> Documentation complete : `docs/docs/supabase/tables/profiles.md`

### Table `gains`

| Colonne | Type | Description |
|---------|------|-------------|
| id | BIGINT | PK |
| customer_id | UUID | FK vers profiles (NOT NULL) |
| receipt_id | BIGINT | FK vers receipts (NULL pour bonus cashback) |
| establishment_id | INTEGER | FK vers establishments (NULL pour bonus cashback) |
| xp | INTEGER | XP gagne |
| cashback_money | INTEGER | Cashback gagne (centimes) |
| source_type | VARCHAR | Source: receipt, bonus_cashback_manual, bonus_cashback_leaderboard, bonus_cashback_quest, bonus_cashback_trigger |
| coupon_id | BIGINT | FK vers coupons (pour bonus cashback) |
| period_identifier | VARCHAR | Periode associee (ex: 2026-W06) |

> Table centrale du systeme de gains. Relie les profils aux XP et cashback gagnes, que ce soit via des tickets ou des bonus cashback directs.

> Documentation complete : `docs/docs/supabase/tables/gains.md`

## Systeme Bonus Cashback (Fevrier 2026)

Refonte majeure du systeme de coupons : les coupons a montant fixe sont desormais credites directement en cashback.

### Coupons montant fixe → Bonus Cashback

- Credites **immediatement** au solde cashback du client via la table `gains`
- Le coupon est cree avec `used = true` et `expires_at = NULL`
- La fonction `credit_bonus_cashback()` insere un gain avec `source_type` = `bonus_cashback_manual`, `bonus_cashback_leaderboard`, `bonus_cashback_quest` ou `bonus_cashback_trigger`
- `validate_coupons()` **rejette** les coupons montant fixe (deja consommes)
- `get_customer_available_coupons()` ne retourne **que** les coupons pourcentage

### Coupons pourcentage → Bonus cashback sur commande

- Toujours utilisables sur les commandes via `create_receipt()`
- Ajoutent un bonus cashback de X% du montant total au lieu de reduire le prix
- Plus de `receipt_lines` avec `payment_method = 'coupon'`

### Vue materialisee `user_stats`

- Joint `profiles → gains` directement (plus via receipts)
- Calcule `total_xp`, `cashback_earned`, `cashback_spent`, `cashback_available`
- Rafraichie automatiquement par `credit_bonus_cashback()` et `create_receipt()`

### Fonction `credit_bonus_cashback()`

```typescript
// Via RPC
await (supabase.rpc as any)('credit_bonus_cashback', {
  p_customer_id: 'uuid',
  p_amount: 500,           // 5.00€ en centimes
  p_coupon_id: 123,        // Optionnel
  p_source_type: 'bonus_cashback_manual',
  p_period_identifier: '2026-W06'  // Optionnel
});
```

## Roles Utilisateurs

| Role | Description | Acces Admin |
|------|-------------|-------------|
| `admin` | Administrateur | Complet |
| `establishment` | Gerant d'etablissement | Limite |
| `employee` | Employe (serveur) | Aucun |
| `client` | Client | Aucun |

## Commandes de Developpement

```bash
# Installation
npm install

# Developpement
npm run dev

# Build production
npm run build

# Linting
npm run lint

# Generer les types Supabase
npm run supabase:types
```

## Variables d'Environnement

```env
NEXT_PUBLIC_SUPABASE_URL=https://uflgfsoekkgegdgecubb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

## Conventions de Code

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
- Les fonctions RPC utilisent `SECURITY DEFINER` et bypass RLS
- Les admins creent des coupons via `create_manual_coupon()` RPC
- **Coupons montant fixe** = bonus cashback credite immediatement (used=true des la creation)
- **Coupons pourcentage** = seuls coupons utilisables sur les commandes
- **Quetes** : Le `target_value` pour `amount_spent` est en **centimes** en BDD mais en **euros** dans le frontend (conversion x100)
- Utiliser `(supabase.rpc as any)` pour les appels RPC (limitation de typage)
- Utiliser `(supabase.from("table") as any)` pour insert/update/delete

### Apres modification

1. Verifier que les types correspondent a la BDD
2. Mettre a jour la documentation dans `docs/` si necessaire
3. Tester l'integration avec Supabase

## Liens Utiles

- **Supabase Dashboard** : https://app.supabase.com/project/uflgfsoekkgegdgecubb

---

**Derniere mise a jour** : 2026-02-09
