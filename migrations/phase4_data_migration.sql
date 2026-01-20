-- ============================================
-- Phase 4 : Migration des données
-- Système de coupons administrable
-- ============================================
--
-- Ce script migre les données existantes vers le nouveau système :
-- 1. Création des templates pour les anciens types de coupons
-- 2. Création des reward_tiers par défaut
-- 3. Association des templates aux tiers
-- 4. Migration des coupons existants avec distribution_type
--
-- À exécuter dans le SQL Editor de Supabase
-- ============================================

-- ============================================
-- ÉTAPE 1 : Vérification des tables existantes
-- ============================================

DO $$
BEGIN
  -- Vérifier que les tables nécessaires existent
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupon_templates') THEN
    RAISE EXCEPTION 'La table coupon_templates n''existe pas. Exécutez d''abord les migrations de la Phase 1.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reward_tiers') THEN
    RAISE EXCEPTION 'La table reward_tiers n''existe pas. Exécutez d''abord les migrations de la Phase 1.';
  END IF;

  RAISE NOTICE 'Tables vérifiées avec succès.';
END $$;

-- ============================================
-- ÉTAPE 2 : Création des templates de coupons
-- ============================================

-- Template pour le coupon hebdomadaire (50€ de dépenses = 25cl offert / 3.90€)
INSERT INTO coupon_templates (name, description, amount, percentage, validity_days, is_active)
SELECT
  'Coupon Hebdo 50€',
  'Coupon obtenu pour 50€ de dépenses hebdomadaires - 25cl offert ou équivalent',
  390,  -- 3.90€ en centimes
  NULL,
  30,   -- Valide 30 jours
  true
WHERE NOT EXISTS (
  SELECT 1 FROM coupon_templates WHERE name = 'Coupon Hebdo 50€'
);

-- Template pour le coupon de fréquence (10 tickets = 5%)
INSERT INTO coupon_templates (name, description, amount, percentage, validity_days, is_active)
SELECT
  'Coupon Fréquence 5%',
  'Coupon obtenu pour 10 tickets de caisse - 5% de réduction',
  NULL,
  5,    -- 5%
  30,   -- Valide 30 jours
  true
WHERE NOT EXISTS (
  SELECT 1 FROM coupon_templates WHERE name = 'Coupon Fréquence 5%'
);

-- Template pour coupon Champion (1er du classement)
INSERT INTO coupon_templates (name, description, amount, percentage, validity_days, is_active)
SELECT
  'Récompense Champion',
  'Récompense pour le 1er du classement',
  1000,  -- 10€ en centimes
  NULL,
  60,    -- Valide 60 jours
  true
WHERE NOT EXISTS (
  SELECT 1 FROM coupon_templates WHERE name = 'Récompense Champion'
);

-- Template pour coupon Podium (2-3 du classement)
INSERT INTO coupon_templates (name, description, amount, percentage, validity_days, is_active)
SELECT
  'Récompense Podium',
  'Récompense pour le podium (2ème et 3ème)',
  500,   -- 5€ en centimes
  NULL,
  45,    -- Valide 45 jours
  true
WHERE NOT EXISTS (
  SELECT 1 FROM coupon_templates WHERE name = 'Récompense Podium'
);

-- Template pour coupon Top 10 (4-10 du classement)
INSERT INTO coupon_templates (name, description, amount, percentage, validity_days, is_active)
SELECT
  'Récompense Top 10',
  'Récompense pour le Top 10 (4ème à 10ème)',
  NULL,
  10,    -- 10%
  30,    -- Valide 30 jours
  true
WHERE NOT EXISTS (
  SELECT 1 FROM coupon_templates WHERE name = 'Récompense Top 10'
);

-- ============================================
-- ÉTAPE 3 : Création des reward_tiers par défaut
-- ============================================

-- Variables pour stocker les IDs des templates
DO $$
DECLARE
  v_template_champion_id BIGINT;
  v_template_podium_id BIGINT;
  v_template_top10_id BIGINT;
BEGIN
  -- Récupérer les IDs des templates
  SELECT id INTO v_template_champion_id FROM coupon_templates WHERE name = 'Récompense Champion' LIMIT 1;
  SELECT id INTO v_template_podium_id FROM coupon_templates WHERE name = 'Récompense Podium' LIMIT 1;
  SELECT id INTO v_template_top10_id FROM coupon_templates WHERE name = 'Récompense Top 10' LIMIT 1;

  -- ========== TIERS HEBDOMADAIRES ==========

  -- Champion Hebdo (1er)
  INSERT INTO reward_tiers (name, rank_from, rank_to, coupon_template_id, period_type, display_order, is_active)
  SELECT 'Champion Hebdo', 1, 1, v_template_champion_id, 'weekly', 1, true
  WHERE NOT EXISTS (
    SELECT 1 FROM reward_tiers WHERE name = 'Champion Hebdo' AND period_type = 'weekly'
  );

  -- Podium Hebdo (2-3)
  INSERT INTO reward_tiers (name, rank_from, rank_to, coupon_template_id, period_type, display_order, is_active)
  SELECT 'Podium Hebdo', 2, 3, v_template_podium_id, 'weekly', 2, true
  WHERE NOT EXISTS (
    SELECT 1 FROM reward_tiers WHERE name = 'Podium Hebdo' AND period_type = 'weekly'
  );

  -- Top 10 Hebdo (4-10)
  INSERT INTO reward_tiers (name, rank_from, rank_to, coupon_template_id, period_type, display_order, is_active)
  SELECT 'Top 10 Hebdo', 4, 10, v_template_top10_id, 'weekly', 3, true
  WHERE NOT EXISTS (
    SELECT 1 FROM reward_tiers WHERE name = 'Top 10 Hebdo' AND period_type = 'weekly'
  );

  -- ========== TIERS MENSUELS ==========

  -- Champion Mensuel (1er)
  INSERT INTO reward_tiers (name, rank_from, rank_to, coupon_template_id, period_type, display_order, is_active)
  SELECT 'Champion Mensuel', 1, 1, v_template_champion_id, 'monthly', 1, true
  WHERE NOT EXISTS (
    SELECT 1 FROM reward_tiers WHERE name = 'Champion Mensuel' AND period_type = 'monthly'
  );

  -- Podium Mensuel (2-3)
  INSERT INTO reward_tiers (name, rank_from, rank_to, coupon_template_id, period_type, display_order, is_active)
  SELECT 'Podium Mensuel', 2, 3, v_template_podium_id, 'monthly', 2, true
  WHERE NOT EXISTS (
    SELECT 1 FROM reward_tiers WHERE name = 'Podium Mensuel' AND period_type = 'monthly'
  );

  -- Top 10 Mensuel (4-10)
  INSERT INTO reward_tiers (name, rank_from, rank_to, coupon_template_id, period_type, display_order, is_active)
  SELECT 'Top 10 Mensuel', 4, 10, v_template_top10_id, 'monthly', 3, true
  WHERE NOT EXISTS (
    SELECT 1 FROM reward_tiers WHERE name = 'Top 10 Mensuel' AND period_type = 'monthly'
  );

  -- ========== TIERS ANNUELS ==========

  -- Champion Annuel (1er)
  INSERT INTO reward_tiers (name, rank_from, rank_to, coupon_template_id, period_type, display_order, is_active)
  SELECT 'Champion Annuel', 1, 1, v_template_champion_id, 'yearly', 1, true
  WHERE NOT EXISTS (
    SELECT 1 FROM reward_tiers WHERE name = 'Champion Annuel' AND period_type = 'yearly'
  );

  -- Podium Annuel (2-3)
  INSERT INTO reward_tiers (name, rank_from, rank_to, coupon_template_id, period_type, display_order, is_active)
  SELECT 'Podium Annuel', 2, 3, v_template_podium_id, 'yearly', 2, true
  WHERE NOT EXISTS (
    SELECT 1 FROM reward_tiers WHERE name = 'Podium Annuel' AND period_type = 'yearly'
  );

  -- Top 10 Annuel (4-10)
  INSERT INTO reward_tiers (name, rank_from, rank_to, coupon_template_id, period_type, display_order, is_active)
  SELECT 'Top 10 Annuel', 4, 10, v_template_top10_id, 'yearly', 3, true
  WHERE NOT EXISTS (
    SELECT 1 FROM reward_tiers WHERE name = 'Top 10 Annuel' AND period_type = 'yearly'
  );

  RAISE NOTICE 'Reward tiers créés avec succès.';
END $$;

-- ============================================
-- ÉTAPE 4 : Migration des coupons existants
-- ============================================

-- Marquer tous les coupons existants sans distribution_type comme 'trigger_legacy'
UPDATE coupons
SET distribution_type = 'trigger_legacy'
WHERE distribution_type IS NULL;

-- Compter les coupons migrés
DO $$
DECLARE
  v_migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_migrated_count
  FROM coupons
  WHERE distribution_type = 'trigger_legacy';

  RAISE NOTICE 'Nombre de coupons migrés vers trigger_legacy: %', v_migrated_count;
END $$;

-- ============================================
-- ÉTAPE 5 : Vérification finale
-- ============================================

DO $$
DECLARE
  v_templates_count INTEGER;
  v_tiers_count INTEGER;
  v_weekly_tiers INTEGER;
  v_monthly_tiers INTEGER;
  v_yearly_tiers INTEGER;
BEGIN
  -- Compter les templates
  SELECT COUNT(*) INTO v_templates_count FROM coupon_templates WHERE is_active = true;

  -- Compter les tiers par période
  SELECT COUNT(*) INTO v_tiers_count FROM reward_tiers WHERE is_active = true;
  SELECT COUNT(*) INTO v_weekly_tiers FROM reward_tiers WHERE period_type = 'weekly' AND is_active = true;
  SELECT COUNT(*) INTO v_monthly_tiers FROM reward_tiers WHERE period_type = 'monthly' AND is_active = true;
  SELECT COUNT(*) INTO v_yearly_tiers FROM reward_tiers WHERE period_type = 'yearly' AND is_active = true;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'RÉSUMÉ DE LA MIGRATION';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Templates actifs: %', v_templates_count;
  RAISE NOTICE 'Tiers actifs total: %', v_tiers_count;
  RAISE NOTICE '  - Tiers hebdomadaires: %', v_weekly_tiers;
  RAISE NOTICE '  - Tiers mensuels: %', v_monthly_tiers;
  RAISE NOTICE '  - Tiers annuels: %', v_yearly_tiers;
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Migration Phase 4 terminée avec succès!';
  RAISE NOTICE '===========================================';
END $$;

-- ============================================
-- REQUÊTES DE VÉRIFICATION (à exécuter séparément)
-- ============================================

-- Vérifier les templates créés
-- SELECT * FROM coupon_templates ORDER BY created_at;

-- Vérifier les tiers créés avec leurs templates associés
SELECT
  rt.name,
  rt.rank_from,
  rt.rank_to,
  rt.period_type,
  ct.name as template_name,
  ct.amount,
  ct.percentage
FROM reward_tiers rt
LEFT JOIN coupon_templates ct ON rt.coupon_template_id = ct.id
ORDER BY rt.period_type, rt.display_order;

-- Vérifier la distribution des coupons par type
SELECT
  distribution_type,
  COUNT(*) as count
FROM coupons
GROUP BY distribution_type
ORDER BY count DESC;
