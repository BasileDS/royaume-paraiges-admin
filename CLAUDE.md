# CLAUDE.md - Royaume des Paraiges Admin

## Apercu du Projet

**royaume-paraiges-admin** est l'interface d'administration du Royaume des Paraiges, une application de fidelite gamifiee autour de la biere. Cette interface permet aux administrateurs de gerer les utilisateurs, les coupons, les recompenses et de visualiser les statistiques.

## Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Next.js | 15.x | Framework React avec App Router |
| TypeScript | 5.x | Typage statique |
| Supabase | 2.47.x | Backend (Auth, Database, Storage) |
| Radix UI / shadcn/ui | - | Composants UI |
| Tailwind CSS | 3.x | Styling |
| Directus | 20.x | CMS pour le contenu (bieres, etablissements) |

## Structure du Projet

```
royaume-paraiges-admin/
├── src/
│   ├── app/                      # App Router Next.js
│   │   ├── (auth)/               # Routes authentification
│   │   │   └── login/
│   │   ├── (dashboard)/          # Routes dashboard (protegees)
│   │   │   ├── coupons/          # Gestion des coupons
│   │   │   ├── users/            # Gestion des utilisateurs
│   │   │   ├── receipts/         # Historique des tickets
│   │   │   ├── content/          # Contenu Directus
│   │   │   │   ├── beers/
│   │   │   │   └── establishments/
│   │   │   └── page.tsx          # Dashboard principal
│   │   └── layout.tsx
│   │
│   ├── components/               # Composants React
│   │   ├── ui/                   # Composants shadcn/ui
│   │   └── layout/               # Layout (Sidebar, Header)
│   │
│   ├── lib/                      # Utilitaires et services
│   │   ├── services/             # Services metier
│   │   │   ├── couponService.ts
│   │   │   ├── userService.ts
│   │   │   ├── receiptService.ts
│   │   │   ├── analyticsService.ts
│   │   │   ├── templateService.ts
│   │   │   └── directusService.ts
│   │   ├── supabase/             # Client Supabase
│   │   └── utils.ts
│   │
│   └── types/                    # Types TypeScript
│       ├── database.ts           # Types Supabase
│       └── directus.ts           # Types Directus
│
├── docs/                         # SUBMODULE - Documentation partagee
│   └── docs/
│       ├── supabase/             # Doc Supabase
│       │   ├── tables/           # Structure des tables
│       │   ├── functions/        # Fonctions PostgreSQL
│       │   ├── policies/         # Politiques RLS
│       │   └── README.md
│       ├── directus/             # Doc Directus
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
| Profiles | `docs/docs/supabase/tables/profiles.md` | Table des utilisateurs |
| Receipts | `docs/docs/supabase/tables/receipts.md` | Table des tickets |
| Fonctions | `docs/docs/supabase/functions/` | Fonctions PostgreSQL |
| create_manual_coupon | `docs/docs/supabase/functions/create_manual_coupon.md` | Creation manuelle de coupons |
| Politiques RLS | `docs/docs/supabase/policies/README.md` | Toutes les politiques de securite |

### Directus (CMS)

| Document | Chemin | Description |
|----------|--------|-------------|
| Configuration | `docs/docs/directus/` | Config et collections Directus |

## Fonctionnalites Principales

### 1. Gestion des Coupons

**Fichiers cles** :
- `src/app/(dashboard)/coupons/page.tsx` - Liste des coupons
- `src/app/(dashboard)/coupons/create/page.tsx` - Creation de coupon
- `src/lib/services/couponService.ts` - Service metier

**Fonction RPC** : `create_manual_coupon()` - Voir `docs/docs/supabase/functions/create_manual_coupon.md`

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
- `src/lib/services/userService.ts` - Service metier

### 3. Analytics Dashboard

**Fichiers cles** :
- `src/app/(dashboard)/page.tsx` - Dashboard principal
- `src/lib/services/analyticsService.ts` - Statistiques

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

> Documentation complete : `docs/docs/supabase/tables/coupons.md`

### Table `profiles`

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | PK (= auth.users.id) |
| email | TEXT | Email |
| first_name | TEXT | Prenom |
| last_name | TEXT | Nom |
| role | user_role | client, employee, establishment, admin |
| total_xp | INTEGER | XP total |
| cashback_balance | INTEGER | Solde cashback (centimes) |

> Documentation complete : `docs/docs/supabase/tables/profiles.md`

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
NEXT_PUBLIC_DIRECTUS_URL=https://paraiges-directus.neodelta.dev
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

- La colonne s'appelle `used` (pas `is_used`)
- Il n'y a PAS de colonne `establishment_id` dans la table `coupons`
- Il n'y a PAS de colonne `used_at` dans la table `coupons`
- Les fonctions RPC utilisent `SECURITY DEFINER` et bypass RLS
- Les admins creent des coupons via `create_manual_coupon()` RPC

### Apres modification

1. Verifier que les types correspondent a la BDD
2. Mettre a jour la documentation dans `docs/` si necessaire
3. Tester l'integration avec Supabase

## Liens Utiles

- **Supabase Dashboard** : https://app.supabase.com/project/uflgfsoekkgegdgecubb
- **Directus CMS** : https://paraiges-directus.neodelta.dev

---

**Derniere mise a jour** : 2026-01-21
