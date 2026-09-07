import type { SupabaseClient } from "@supabase/supabase-js";
import type { Card, Database } from "@/lib/types/database";
import { mondayOfWeek, toDateString } from "@/lib/utils/week";

export interface CardOfTheWeekResult {
  card: Card;
  ownerUsername: string;
  weekNumber: number;
}

// ISO week number (1-53) for the calendar-week label the mockup shows
// ("WOCHE 36"). Not the same "week" as mondayOfWeek's plain Monday-start
// week, which is why this has its own small calculation rather than
// reusing that helper's boundary.
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Reads this week's cached pick (see app/api/cron/card-of-the-week) —
// never recomputed here. Returns null when the cron hasn't run yet for
// this week, or ran and found no qualifying card.
export async function getCardOfTheWeek(supabase: SupabaseClient<Database>): Promise<CardOfTheWeekResult | null> {
  const weekStartDate = toDateString(mondayOfWeek(new Date()));

  const { data: row } = await supabase
    .from("card_of_the_week")
    .select("card_id")
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (!row?.card_id) return null;

  const { data: card } = await supabase.from("cards").select("*").eq("id", row.card_id).maybeSingle();
  if (!card) return null;

  const { data: owner } = await supabase.from("profiles").select("username").eq("id", card.owner_id).maybeSingle();
  if (!owner) return null;

  return { card, ownerUsername: owner.username, weekNumber: isoWeekNumber(new Date()) };
}
