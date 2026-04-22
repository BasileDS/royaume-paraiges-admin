import type { PostgrestError } from "@supabase/supabase-js";

export type QuestRedundancyConflictKind =
  | "both_global"
  | "global_vs_local"
  | "locals_overlap";

export interface QuestRedundancyDetails {
  conflict_quest_id: number;
  conflict_quest_name: string;
  conflict_kind: QuestRedundancyConflictKind;
  new_quest_id?: number;
  new_quest_name?: string;
  quest_id?: number;
  quest_name?: string;
  added_establishment_id?: number;
  removed_establishment_id?: number;
  signature?: {
    quest_type: string;
    period_type: string;
    consumption_type: string | null;
  };
}

function getErrorField(err: unknown, key: "code" | "details" | "message"): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const value = (err as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Tente de parser une erreur PostgreSQL `P0421` (quest redundancy) levée par
 * les triggers de la migration 021. Renvoie null si l'erreur n'est pas de ce
 * type ou si le DETAIL JSON n'est pas parseable.
 *
 * Accepte `unknown` pour s'intégrer directement avec les blocs `catch (error)`
 * où le type par défaut est `unknown`.
 */
export function parseQuestRedundancyError(error: unknown): QuestRedundancyDetails | null {
  if (getErrorField(error, "code") !== "P0421") return null;

  const details = getErrorField(error, "details");
  if (!details) return null;

  try {
    const parsed = JSON.parse(details) as QuestRedundancyDetails;
    if (!parsed.conflict_quest_id || !parsed.conflict_quest_name || !parsed.conflict_kind) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isQuestRedundancyError(error: unknown): boolean {
  return parseQuestRedundancyError(error) !== null;
}

// Re-export pour consommateurs qui veulent typer un `catch` PostgrestError explicite.
export type { PostgrestError };
