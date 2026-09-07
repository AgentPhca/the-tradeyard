import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/types/database";
import { getPublicBaseYardProgress } from "@/lib/baseyard/getPublicBaseYardProgress";
import { getPublicInsertYardProgress } from "@/lib/insertyard/getPublicInsertYardProgress";
import { getTeamYardProgress } from "@/lib/personalYard/getTeamYardProgress";
import { getPlayerYardProgress } from "@/lib/personalYard/getPlayerYardProgress";

export interface PercentYard {
  owned: number;
  total: number;
  pct: number;
}

export interface HighestCompletionSet {
  label: string;
  setName: string;
  pct: number;
}

export interface PersonalYardSummary {
  value: string;
  owned: number;
  total: number;
  pct: number;
}

export interface YardsSummary {
  baseYard: PercentYard;
  insertYard: PercentYard;
  valueYardCount: number;
  rookieYardCount: number;
  parallelYardCount: number;
  // Independent — both, either, or neither can be set at once.
  teamYard: PersonalYardSummary | null;
  playerYard: PersonalYardSummary | null;
  // The single highest-% set across the two checklist-style yards, for the
  // Dashboard hero's "Willkommen" slide — ParallelYard has no per-set
  // checklist data to compare against (see getYardsSummary's own note
  // below), so it can't contribute one.
  highestCompletionSet: HighestCompletionSet | null;
}

function pct(owned: number, total: number): number {
  return total > 0 ? Math.round((owned / total) * 100) : 0;
}

// Aggregates every "Deine Yards" tile plus the Hero Slide 1 pick, all from
// the current user's own cards (never gated by any public-visibility
// toggle — those only affect what OTHER people can see on this user's
// profile, not what the user sees of their own Dashboard).
export async function getYardsSummary(
  supabase: SupabaseClient<Database>,
  ownerId: string,
  profile: Pick<Profile, "personal_team_yard" | "personal_player_yard">
): Promise<YardsSummary> {
  const [baseYardBySet, insertYardResult, { data: ownedCards }] = await Promise.all([
    getPublicBaseYardProgress(supabase, ownerId),
    getPublicInsertYardProgress(supabase, ownerId),
    supabase
      .from("cards")
      .select("is_rookie, parallel, is_relic, is_autograph, print_run")
      .eq("owner_id", ownerId)
      .neq("status", "traded"),
  ]);

  const baseTotals = baseYardBySet.reduce(
    (acc, s) => ({ owned: acc.owned + s.owned, total: acc.total + s.total }),
    { owned: 0, total: 0 }
  );
  const insertTotals = insertYardResult.bySet.reduce(
    (acc, s) => ({ owned: acc.owned + s.owned, total: acc.total + s.total }),
    { owned: 0, total: 0 }
  );

  const cards = ownedCards ?? [];
  // "Not a plain base card" — same rule as the Card of the Week filter and
  // the ValueYard concept it's named after: numbered, autographed, or a
  // relic/patch.
  const valueYardCount = cards.filter(
    (c) => c.print_run != null || c.is_autograph || c.is_relic
  ).length;
  const rookieYardCount = cards.filter((c) => c.is_rookie).length;
  const parallelYardCount = cards.filter((c) => c.parallel != null).length;

  let teamYard: YardsSummary["teamYard"] = null;
  if (profile.personal_team_yard) {
    const progress = await getTeamYardProgress(supabase, ownerId, profile.personal_team_yard);
    teamYard = {
      value: profile.personal_team_yard,
      owned: progress.owned,
      total: progress.total,
      pct: pct(progress.owned, progress.total),
    };
  }

  let playerYard: YardsSummary["playerYard"] = null;
  if (profile.personal_player_yard) {
    const progress = await getPlayerYardProgress(supabase, ownerId, profile.personal_player_yard);
    playerYard = {
      value: profile.personal_player_yard,
      owned: progress.owned,
      total: progress.total,
      pct: pct(progress.owned, progress.total),
    };
  }

  const candidateSets: HighestCompletionSet[] = [
    ...baseYardBySet
      .filter((s) => s.total > 0)
      .map((s) => ({ label: s.setName, setName: s.setName, pct: pct(s.owned, s.total) })),
    ...insertYardResult.bySet
      .filter((s) => s.total > 0)
      .map((s) => ({ label: s.setName, setName: s.setName, pct: pct(s.owned, s.total) })),
  ];
  candidateSets.sort((a, b) => b.pct - a.pct);
  const highestCompletionSet = candidateSets[0] ?? null;

  return {
    baseYard: { ...baseTotals, pct: pct(baseTotals.owned, baseTotals.total) },
    insertYard: { ...insertTotals, pct: pct(insertTotals.owned, insertTotals.total) },
    valueYardCount,
    rookieYardCount,
    parallelYardCount,
    teamYard,
    playerYard,
    highestCompletionSet,
  };
}
