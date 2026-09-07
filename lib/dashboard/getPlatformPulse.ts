import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export interface PlatformPulse {
  cardsForTrade: number;
  collectors: number;
  cardsInCollections: number;
}

// The three site-wide counters in the Dashboard's "Plattform-Kennzahlen"
// tiles — always platform totals, never scoped to the current user.
export async function getPlatformPulse(supabase: SupabaseClient<Database>): Promise<PlatformPulse> {
  const [{ count: cardsForTrade }, { count: collectors }, { count: cardsInCollections }] = await Promise.all([
    supabase.from("cards").select("id", { count: "exact", head: true }).eq("status", "for_trade"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("cards").select("id", { count: "exact", head: true }).neq("status", "traded"),
  ]);

  return {
    cardsForTrade: cardsForTrade ?? 0,
    collectors: collectors ?? 0,
    cardsInCollections: cardsInCollections ?? 0,
  };
}
