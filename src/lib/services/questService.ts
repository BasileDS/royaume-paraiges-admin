import { createClient } from "@/lib/supabase/client";
import type {
  Quest,
  QuestInsert,
  QuestUpdate,
  QuestWithRelations,
  QuestCompletionLog,
  QuestPeriod,
  QuestPeriodInsert,
  PeriodType,
} from "@/types/database";

// CRUD Quests
export async function getQuests(periodType?: PeriodType): Promise<QuestWithRelations[]> {
  const supabase = createClient();
  let query = supabase
    .from("quests")
    .select("*, coupon_templates(name, amount, percentage), badge_types(name), quest_periods(*)")
    .order("period_type")
    .order("display_order");

  if (periodType) {
    query = query.eq("period_type", periodType);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as QuestWithRelations[];
}

export async function getActiveQuests(periodType?: PeriodType): Promise<QuestWithRelations[]> {
  const supabase = createClient();
  let query = supabase
    .from("quests")
    .select("*, coupon_templates(name, amount, percentage), badge_types(name), quest_periods(*)")
    .eq("is_active", true)
    .order("period_type")
    .order("display_order");

  if (periodType) {
    query = query.eq("period_type", periodType);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as QuestWithRelations[];
}

export async function getQuest(id: number): Promise<QuestWithRelations | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quests")
    .select("*, coupon_templates(name, amount, percentage), badge_types(name), quest_periods(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as QuestWithRelations | null;
}

export async function createQuest(quest: QuestInsert): Promise<Quest> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("quests") as any)
    .insert(quest)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateQuest(id: number, quest: QuestUpdate): Promise<Quest> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("quests") as any)
    .update({ ...quest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQuest(id: number): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("quests") as any).delete().eq("id", id);

  if (error) throw error;
}

export async function toggleQuestActive(id: number, isActive: boolean): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("quests") as any)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

// Quest Completion Logs (for analytics)
export async function getQuestCompletions(
  periodIdentifier?: string
): Promise<QuestCompletionLog[]> {
  const supabase = createClient();
  let query = supabase
    .from("quest_completion_logs")
    .select("*")
    .order("completed_at", { ascending: false });

  if (periodIdentifier) {
    query = query.eq("period_identifier", periodIdentifier);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as QuestCompletionLog[];
}

export async function getQuestCompletionsByQuest(questId: number): Promise<QuestCompletionLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quest_completion_logs")
    .select("*")
    .eq("quest_id", questId)
    .order("completed_at", { ascending: false });

  if (error) throw error;
  return (data || []) as QuestCompletionLog[];
}

// RPC functions
export async function distributeQuestReward(questProgressId: number, adminId?: string) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("distribute_quest_reward", {
    p_quest_progress_id: questProgressId,
    p_admin_id: adminId,
  });

  if (error) throw error;
  return data;
}

export async function distributeAllQuestRewards(adminId?: string) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("distribute_all_quest_rewards", {
    p_admin_id: adminId,
  });

  if (error) throw error;
  return data;
}

export async function getUserQuests(customerId: string, periodType?: PeriodType) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("get_user_quests", {
    p_customer_id: customerId,
    p_period_type: periodType || null,
  });

  if (error) throw error;
  return data;
}

// Stats
export interface QuestStats {
  totalQuests: number;
  activeQuests: number;
  totalCompletions: number;
  completionsByPeriod: {
    weekly: number;
    monthly: number;
    yearly: number;
  };
  totalRewardsDistributed: {
    coupons: number;
    badges: number;
    bonusXp: number;
    bonusCashback: number;
  };
}

export async function getQuestStats(): Promise<QuestStats> {
  const supabase = createClient();

  // Get quest counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: quests } = await (supabase.from("quests") as any).select("id, is_active, period_type");

  // Get completion logs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: completions } = await (supabase.from("quest_completion_logs") as any)
    .select("period_type, coupon_id, badge_awarded_id, bonus_xp_awarded, bonus_cashback_awarded");

  const questsData = (quests || []) as { id: number; is_active: boolean; period_type: string }[];
  const completionsData = (completions || []) as {
    period_type: string;
    coupon_id: number | null;
    badge_awarded_id: number | null;
    bonus_xp_awarded: number;
    bonus_cashback_awarded: number;
  }[];

  return {
    totalQuests: questsData.length,
    activeQuests: questsData.filter((q) => q.is_active).length,
    totalCompletions: completionsData.length,
    completionsByPeriod: {
      weekly: completionsData.filter((c) => c.period_type === "weekly").length,
      monthly: completionsData.filter((c) => c.period_type === "monthly").length,
      yearly: completionsData.filter((c) => c.period_type === "yearly").length,
    },
    totalRewardsDistributed: {
      coupons: completionsData.filter((c) => c.coupon_id !== null).length,
      badges: completionsData.filter((c) => c.badge_awarded_id !== null).length,
      bonusXp: completionsData.reduce((sum, c) => sum + (c.bonus_xp_awarded || 0), 0),
      bonusCashback: completionsData.reduce((sum, c) => sum + (c.bonus_cashback_awarded || 0), 0),
    },
  };
}

// Quest Periods Management
export async function getQuestPeriods(questId: number): Promise<QuestPeriod[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("quest_periods") as any)
    .select("*")
    .eq("quest_id", questId)
    .order("period_identifier");

  if (error) throw error;
  return (data || []) as QuestPeriod[];
}

export async function setQuestPeriods(questId: number, periodIdentifiers: string[]): Promise<void> {
  const supabase = createClient();

  // Supprimer les périodes existantes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteError } = await (supabase.from("quest_periods") as any)
    .delete()
    .eq("quest_id", questId);

  if (deleteError) throw deleteError;

  // Ajouter les nouvelles périodes si la liste n'est pas vide
  if (periodIdentifiers.length > 0) {
    const periodsToInsert: QuestPeriodInsert[] = periodIdentifiers.map((period) => ({
      quest_id: questId,
      period_identifier: period,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from("quest_periods") as any)
      .insert(periodsToInsert);

    if (insertError) throw insertError;
  }
}

export async function addQuestPeriod(questId: number, periodIdentifier: string): Promise<QuestPeriod> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("quest_periods") as any)
    .insert({ quest_id: questId, period_identifier: periodIdentifier })
    .select()
    .single();

  if (error) throw error;
  return data as QuestPeriod;
}

export async function removeQuestPeriod(questId: number, periodIdentifier: string): Promise<void> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("quest_periods") as any)
    .delete()
    .eq("quest_id", questId)
    .eq("period_identifier", periodIdentifier);

  if (error) throw error;
}

// Récupérer les quêtes actives pour une période spécifique
export async function getQuestsForPeriod(
  periodType: PeriodType,
  periodIdentifier: string
): Promise<QuestWithRelations[]> {
  const supabase = createClient();

  // Récupérer toutes les quêtes actives du bon type de période
  const { data: quests, error } = await supabase
    .from("quests")
    .select("*, coupon_templates(name, amount, percentage), badge_types(name), quest_periods(*)")
    .eq("period_type", periodType)
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;

  const questsData = (quests || []) as QuestWithRelations[];

  // Filtrer: garder les quêtes qui n'ont pas de période assignée OU qui sont assignées à cette période
  return questsData.filter((quest) => {
    const periods = quest.quest_periods || [];
    // Si aucune période assignée, la quête est active pour toutes les périodes
    if (periods.length === 0) return true;
    // Sinon, vérifier si cette période est dans la liste
    return periods.some((p) => p.period_identifier === periodIdentifier);
  });
}
