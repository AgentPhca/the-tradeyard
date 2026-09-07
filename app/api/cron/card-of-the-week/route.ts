import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { cardValueTier } from "@/lib/utils/cardValue";
import { addDays, mondayOfWeek, toDateString } from "@/lib/utils/week";

// Weekly cron (see vercel.json), triggered by Vercel every Monday. Picks
// the most "chase-worthy" for_trade card created during the PREVIOUS
// calendar week and caches it in card_of_the_week for the current week's
// Dashboard hero slide — see lib/supabase/card_of_the_week.sql for why this
// is computed once here rather than on every page view.
//
// Idempotent: re-running it for a week that's already been computed just
// overwrites that week's row with the same result (candidates are frozen
// once the week is over), so a manual re-trigger to backfill a missed run
// is always safe.
//
// GET, not POST — Vercel Cron invokes scheduled routes with a GET request.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const currentWeekStart = mondayOfWeek(new Date());
  const previousWeekStart = addDays(currentWeekStart, -7);

  const { data: candidates, error } = await supabase
    .from("cards")
    .select("id, print_run, is_autograph, is_relic")
    .eq("status", "for_trade")
    .gte("created_at", previousWeekStart.toISOString())
    .lt("created_at", currentWeekStart.toISOString())
    .or("print_run.not.is.null,is_autograph.eq.true,is_relic.eq.true");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Most chase-worthy first: cardValueTier ascending (1 = rarest
  // combination), then lowest print run as the tie-break within a tier.
  const winner = [...(candidates ?? [])].sort((a, b) => {
    const tierDiff = cardValueTier(a) - cardValueTier(b);
    if (tierDiff !== 0) return tierDiff;
    if (a.print_run == null) return b.print_run == null ? 0 : 1;
    if (b.print_run == null) return -1;
    return a.print_run - b.print_run;
  })[0];

  const weekStartDate = toDateString(currentWeekStart);

  const { error: upsertError } = await supabase
    .from("card_of_the_week")
    .upsert(
      { week_start_date: weekStartDate, card_id: winner?.id ?? null, computed_at: new Date().toISOString() },
      { onConflict: "week_start_date" }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ weekStartDate, cardId: winner?.id ?? null, candidateCount: candidates?.length ?? 0 });
}
