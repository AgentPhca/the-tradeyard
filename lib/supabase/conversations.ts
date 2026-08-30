import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// conversations_unique_pair is unique(participant_1, participant_2) — not
// symmetric — so a consistent ordering (lexicographically smaller id first)
// is required both when creating a conversation and when looking one up,
// otherwise (A, B) and (B, A) would be treated as two different rows.
export async function findOrCreateConversation(
  supabase: SupabaseClient<Database>,
  userId: string,
  otherUserId: string
): Promise<string> {
  const [participant1, participant2] = [userId, otherUserId].sort();

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_1", participant1)
    .eq("participant_2", participant2)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ participant_1: participant1, participant_2: participant2 })
    .select("id")
    .single();

  if (error || !created) {
    throw error ?? new Error("Failed to start conversation.");
  }

  return created.id;
}
