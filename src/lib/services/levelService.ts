import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export type LevelThreshold = Database["public"]["Tables"]["level_thresholds"]["Row"];

/**
 * Grille des 25 niveaux du Royaume (Écuyer I → Chevalier de la Table Ronde).
 * Triés par niveau ascendant.
 */
export async function getLevelThresholds(): Promise<LevelThreshold[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("level_thresholds")
    .select("*")
    .order("level", { ascending: true });
  if (error) throw error;
  return data as LevelThreshold[];
}

/**
 * Convertit un niveau en coefficient PdB lisible (ex. niveau 11 → 3,0).
 * Source : règle produit +0,2 par niveau depuis 1,0 au niveau 1.
 */
export function levelToCoefficient(level: number): number {
  return 1 + (level - 1) * 0.2;
}

/**
 * Retourne le rang « parent » d'un niveau (Écuyer / Soldat / Sergent / Capitaine / Chevalier / Chevalier de la Table Ronde).
 */
export function levelToRankName(level: number): string {
  if (level >= 25) return "Chevalier de la Table Ronde";
  if (level >= 21) return "Chevalier";
  if (level >= 16) return "Capitaine";
  if (level >= 11) return "Sergent";
  if (level >= 6) return "Soldat";
  return "Écuyer";
}
