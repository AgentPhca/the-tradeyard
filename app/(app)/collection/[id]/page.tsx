import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageOff, PenLine, Shirt } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/collection/BackButton";
import { CardDetailActions } from "@/components/collection/CardDetailActions";
import { CompactCardTile } from "@/components/cards/CompactCardTile";
import { RoleBadges } from "@/components/profile/RoleBadges";
import { createClient } from "@/lib/supabase/server";
import { titleCase } from "@/lib/utils/text";
import { cardValueTag, cardValueTier } from "@/lib/utils/cardValue";
import type { Card } from "@/lib/types/database";

// How many marketplace recommendations to aim for before falling back to
// the next priority source, and the hard cap on how many end up on screen.
const RECOMMENDATION_TARGET = 6;
const RECOMMENDATION_MAX = 12;

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: card } = await supabase.from("cards").select("*").eq("id", id).single();

  if (!card) {
    notFound();
  }

  const isOwner = user?.id === card.owner_id;

  const { data: owner } = await supabase
    .from("profiles")
    .select("username, avatar_url, role, allow_contact, show_personal_collection")
    .eq("id", card.owner_id)
    .single();

  if (!owner) {
    notFound();
  }

  // Personal-collection cards are private to their owner unless the owner
  // has opted in via show_personal_collection — the same rule the cards
  // RLS policy enforces at the database level, and the same rule the
  // Profile page's "My Collection" tab now uses, so this route and the
  // profile grid stay consistent.
  if (!isOwner && card.status === "personal_collection" && !owner.show_personal_collection) {
    notFound();
  }

  const forTrade = card.status === "for_trade";
  const traded = card.status === "traded";
  const serial =
    card.serial_number && card.print_run
      ? `${card.serial_number}/${card.print_run}`
      : card.serial_number ?? (card.print_run ? `/${card.print_run}` : null);

  const details: { label: string; value: string }[] = [
    { label: "Card Number", value: card.card_number ? `#${card.card_number}` : "" },
    { label: "Set", value: card.set_name ?? "" },
    { label: "Insert Set", value: card.insert_set ? titleCase(card.insert_set) : "" },
    { label: "Parallel", value: card.parallel ?? "" },
    { label: "Numbered #", value: serial ?? "" },
    { label: "Condition", value: card.condition ?? "" },
  ].filter((row) => row.value);

  // "Also in your collection" — the owner's other own cards of the same
  // player. Filtering by team too (when known) avoids conflating two real
  // people who happen to share a name. RLS already restricts this to cards
  // the current viewer is allowed to see, same as everywhere else.
  const alsoInCollectionQuery = supabase
    .from("cards")
    .select("*")
    .eq("owner_id", card.owner_id)
    .eq("player_name", card.player_name)
    .neq("id", card.id)
    .limit(RECOMMENDATION_MAX);
  const { data: alsoInCollectionRows } = card.team
    ? await alsoInCollectionQuery.eq("team", card.team)
    : await alsoInCollectionQuery;
  const alsoInCollection: Card[] = alsoInCollectionRows ?? [];

  // "You might also like" — marketplace recommendations, gathered from
  // multiple priority sources and deduped by id: same player first, same
  // team as a fallback once the target count is short, and (for Insert
  // cards) the same insert set as an additional source.
  const recommendedById = new Map<string, Card>();

  const { data: samePlayerRows } = await supabase
    .from("cards")
    .select("*")
    .eq("status", "for_trade")
    .eq("player_name", card.player_name)
    .neq("id", card.id)
    .limit(RECOMMENDATION_MAX);
  for (const row of samePlayerRows ?? []) recommendedById.set(row.id, row as Card);

  if (recommendedById.size < RECOMMENDATION_TARGET && card.team) {
    const { data: sameTeamRows } = await supabase
      .from("cards")
      .select("*")
      .eq("status", "for_trade")
      .eq("team", card.team)
      .neq("player_name", card.player_name)
      .neq("id", card.id)
      .limit(RECOMMENDATION_MAX);
    for (const row of sameTeamRows ?? []) recommendedById.set(row.id, row as Card);
  }

  if (card.category === "Insert" && card.insert_set) {
    const { data: sameInsertSetRows } = await supabase
      .from("cards")
      .select("*")
      .eq("status", "for_trade")
      .eq("insert_set", card.insert_set)
      .neq("player_name", card.player_name)
      .neq("id", card.id)
      .limit(RECOMMENDATION_MAX);
    for (const row of sameInsertSetRows ?? []) recommendedById.set(row.id, row as Card);
  }

  recommendedById.delete(card.id);

  const recommended: Card[] = Array.from(recommendedById.values())
    .sort((a, b) => {
      const tierDiff = cardValueTier(a) - cardValueTier(b);
      if (tierDiff !== 0) return tierDiff;
      const aRun = a.print_run ?? Infinity;
      const bRun = b.print_run ?? Infinity;
      return aRun - bRun;
    })
    .slice(0, RECOMMENDATION_MAX);

  return (
    <div>
      <BackButton />

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="w-full lg:max-w-sm">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-surface">
            {card.image_url ? (
              <Image
                src={card.image_url}
                alt={`${card.player_name} card`}
                fill
                sizes="(min-width: 1024px) 384px, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff className="h-10 w-10 text-muted" />
              </div>
            )}
            <div className="absolute right-2 top-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  traded
                    ? "bg-[#30363D] text-muted"
                    : forTrade
                      ? "bg-[#14532D] text-text"
                      : "bg-[#21262D] text-text"
                }`}
              >
                {traded ? "Traded" : forTrade ? "For Trade" : "Personal Collection"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-text">{card.player_name}</h1>
              {card.team && <p className="mt-1 text-base text-muted">{card.team}</p>}
            </div>
            {(card.is_autograph || card.is_relic) && (
              <div className="flex shrink-0 gap-2">
                {card.is_autograph && (
                  <span
                    title="Autographed"
                    className="flex items-center gap-1 text-xs text-primary"
                  >
                    <PenLine className="h-4 w-4" />
                    Auto
                  </span>
                )}
                {card.is_relic && (
                  <span
                    title="Relic / patch"
                    className="flex items-center gap-1 text-xs text-primary"
                  >
                    <Shirt className="h-4 w-4" />
                    Relic
                  </span>
                )}
              </div>
            )}
          </div>

          {details.length > 0 && (
            <dl className="mt-6 divide-y divide-border rounded-lg border border-border">
              {details.map((row) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-3 text-sm">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="font-medium text-text">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <Link
            href={`/profile/${owner.username}`}
            className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40"
          >
            <Avatar src={owner.avatar_url} alt={owner.username} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text" title={`@${owner.username}`}>
                @{owner.username}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                <RoleBadges roles={owner.role} />
              </div>
            </div>
          </Link>

          <CardDetailActions
            card={card}
            isOwner={isOwner}
            ownerUsername={owner.username}
            ownerAllowsContact={owner.allow_contact}
          />
        </div>
      </div>

      {alsoInCollection.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-text">Also in your collection</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {alsoInCollection.map((c) => (
              <CompactCardTile
                key={c.id}
                href={`/collection/${c.id}`}
                imageUrl={c.image_url}
                title={c.set_name ?? "Unknown set"}
                subtitle={c.parallel ?? undefined}
              />
            ))}
          </div>
        </div>
      )}

      {recommended.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-text">You might also like</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {recommended.map((c) => (
              <CompactCardTile
                key={c.id}
                href={`/collection/${c.id}`}
                imageUrl={c.image_url}
                title={c.player_name}
                subtitle={c.team ?? undefined}
                tag={cardValueTag(c)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
