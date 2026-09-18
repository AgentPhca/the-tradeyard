import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { CollectionBrowser } from "@/components/collection/CollectionBrowser";
import { VisibilityToggle } from "@/components/profile/VisibilityToggle";
import { createClient } from "@/lib/supabase/server";
import type { Card } from "@/lib/types/database";

// This page's cards/profile fetches are per-viewer and must always reflect
// the current DB state — Next.js caches `fetch()` (what the Supabase client
// uses under the hood) by default even on an otherwise dynamically-rendered
// route (cookies() here only forces the page itself to re-render per
// request; it does NOT stop an individual fetch from being served out of
// Next's persistent Data Cache, which survives across deployments). Without
// this, a once-cached "cards" response can keep being served indefinitely
// regardless of how many times the app is redeployed, showing a stale
// snapshot of the user's own collection (confirmed live-DB data was correct
// while this page kept showing an outdated BaseYard ownership count).
export const dynamic = "force-dynamic";

// An unpaginated .select() is silently capped server-side (PostgREST's
// default max-rows limit) — for an owner with enough cards, this dropped
// their oldest rows (this query sorts newest-first with no .range()),
// which showed up as BaseYard/InsertYard suddenly missing most of a
// collection despite the DB itself being correct. Paginate fully, same
// pattern as the card_catalog fetches elsewhere (e.g. ChecklistAlbum.tsx),
// with `id` as a tiebreaker so equal created_at timestamps can't reorder
// a row across a page boundary and get skipped or duplicated.
async function fetchAllOwnedCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string
): Promise<Card[]> {
  const pageSize = 1000;
  const cards: Card[] = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", ownerId)
      .neq("status", "traded")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + pageSize - 1);

    const page = data ?? [];
    cards.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return cards;
}

export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cards: Card[] = [];
  let showPersonalCollection = false;
  let personalTeamYard: string | null = null;
  let personalPlayerYard: string | null = null;
  if (user) {
    const [cardData, { data: profile }] = await Promise.all([
      fetchAllOwnedCards(supabase, user.id),
      supabase
        .from("profiles")
        .select("show_personal_collection, personal_team_yard, personal_player_yard")
        .eq("id", user.id)
        .single(),
    ]);
    cards = cardData;
    showPersonalCollection = profile?.show_personal_collection ?? false;
    personalTeamYard = profile?.personal_team_yard ?? null;
    personalPlayerYard = profile?.personal_player_yard ?? null;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">My Collection</h1>
          <p className="mt-1 text-sm text-muted">Every card you own, all in one place.</p>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <VisibilityToggle profileId={user.id} initialValue={showPersonalCollection} />
          )}
          <Link href="/collection/add" className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Card
          </Link>
        </div>
      </div>

      <Suspense fallback={null}>
        <CollectionBrowser
          cards={cards}
          currentUserId={user?.id ?? ""}
          personalTeamYard={personalTeamYard}
          personalPlayerYard={personalPlayerYard}
        />
      </Suspense>
    </div>
  );
}
