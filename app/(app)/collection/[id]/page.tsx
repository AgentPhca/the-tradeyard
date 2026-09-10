import Link from "next/link";
import { notFound } from "next/navigation";
import { Hash, PenLine, Shirt } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { BackButton } from "@/components/collection/BackButton";
import { CardDescriptionGrid } from "@/components/collection/CardDescriptionGrid";
import { CardDetailActions } from "@/components/collection/CardDetailActions";
import { CardHeaderActions } from "@/components/collection/CardHeaderActions";
import { CardParallelStrip } from "@/components/collection/CardParallelStrip";
import { CardStatusSelect } from "@/components/collection/CardStatusSelect";
import { CardPhotoGallery } from "@/components/cards/CardPhotoGallery";
import { CollectionCardTile } from "@/components/cards/CollectionCardTile";
import { MarketplaceCardTile } from "@/components/cards/MarketplaceCardTile";
import { RoleBadges } from "@/components/profile/RoleBadges";
import { createClient } from "@/lib/supabase/server";
import { titleCase } from "@/lib/utils/text";
import { allPhotos, coverPhoto } from "@/lib/utils/cardPhotos";
import { cardValueTag, cardValueTier } from "@/lib/utils/cardValue";
import { getParallelFrameColor, parallelFrameBackground } from "@/lib/utils/parallelFrameColor";
import { findMultiPlayerKeys, multiPlayerKey } from "@/lib/utils/multiPlayerCard";
import { isInsert } from "@/lib/utils/cardClassification";
import { typeLabel } from "@/lib/utils/cardType";
import { getCardParallels } from "@/lib/collection/getCardParallels";
import type { Card } from "@/lib/types/database";

// How many marketplace recommendations to aim for before falling back to
// the next priority source, and the hard cap on how many end up on screen.
const RECOMMENDATION_TARGET = 6;
const RECOMMENDATION_MAX = 12;

// One of the three Attribute icon badges in the meta-strip — grayed out
// when the attribute doesn't apply. This muted-instead-of-omitted
// treatment is deliberately only used here on the Card Detail page; every
// other card tile in the app (grid, Sticker Album, Marketplace, this same
// page's own mini-cards) keeps just omitting attributes that don't apply.
function AttrIcon({ active, icon: Icon, title }: { active: boolean; icon: LucideIcon; title: string }) {
  return (
    <div
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md border ${
        active
          ? "border-[#E8B94A]/40 bg-[#3A2E12] text-[#E8B94A]"
          : "border-border bg-surface text-border"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}

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

  // Photo frame: rotated only for a numbered card at Grail rarity
  // (print_run <= 50), color derived purely from the parallel/insert name
  // (no DB field — works automatically for every set/parallel).
  const isGrail = card.print_run != null && card.print_run <= 50;
  const frameBackground = parallelFrameBackground(
    getParallelFrameColor(card.parallel || card.insert_set || "Base")
  );

  // Leading 4-digit year out of set_name (e.g. "2025 Topps Chrome Football"
  // -> "2025") — cards has no separate product_year column of its own,
  // unlike card_catalog.
  const year = card.set_name?.match(/^(\d{4})/)?.[1] ?? "—";

  // Multi-player cards (e.g. "AFC REC Leaders") show the card/insert name
  // as the primary heading instead of one arbitrary player from the
  // group — see lib/utils/multiPlayerCard.ts. Every other card_catalog row
  // sharing this exact (set_name, insert_set, card_number) slot is a
  // co-featured player; only need their names here, not the full rows.
  let otherPlayers: string[] = [];
  if (card.set_name && card.insert_set && card.card_number) {
    const { data: siblingRows } = await supabase
      .from("card_catalog")
      .select("player_name")
      .eq("set_name", card.set_name)
      .eq("insert_set", card.insert_set)
      .eq("card_number", card.card_number);
    const multiPlayerKeys = findMultiPlayerKeys(
      (siblingRows ?? []).map((r) => ({
        set_name: card.set_name!,
        insert_set: card.insert_set,
        card_number: card.card_number,
        player_name: r.player_name,
      }))
    );
    if (multiPlayerKeys.has(multiPlayerKey(card.set_name, card.insert_set, card.card_number))) {
      otherPlayers = Array.from(
        new Set((siblingRows ?? []).map((r) => r.player_name).filter((name) => name !== card.player_name))
      );
    }
  }
  const isMultiPlayer = otherPlayers.length > 0;
  const displayName = isMultiPlayer ? titleCase(card.card_title || card.insert_set!) : card.player_name;

  const { parallels, ownedCount } = await getCardParallels(supabase, card, user?.id ?? null);

  const descriptionFields: { label: string; value: string }[] = [
    { label: "Jahr", value: year },
    { label: "Set", value: card.set_name ?? "—" },
    { label: "Kartennummer", value: card.card_number ? `#${card.card_number}` : "—" },
    { label: "Insert / Parallel", value: typeLabel(card) },
    { label: "Team", value: card.team ?? "—" },
    { label: "Rookie Card", value: card.is_rookie ? "Ja" : "Nein" },
    { label: "Zustand", value: card.condition ?? "—" },
    ...(isMultiPlayer ? [{ label: "Mitspieler", value: otherPlayers.join(", ") }] : []),
  ];

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

  if (isInsert(card) && card.insert_set) {
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

  // Marketplace tiles show who's offering each card, so batch-fetch the
  // distinct sellers behind the recommended cards in one extra query.
  const recommendedOwnerIds = Array.from(new Set(recommended.map((c) => c.owner_id)));
  const { data: recommendedOwnersData } =
    recommendedOwnerIds.length > 0
      ? await supabase.from("profiles").select("id, username, avatar_url").in("id", recommendedOwnerIds)
      : { data: [] as { id: string; username: string; avatar_url: string | null }[] };
  const recommendedOwnersById = new Map((recommendedOwnersData ?? []).map((p) => [p.id, p]));

  return (
    <div>
      <BackButton />

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <div className="w-full lg:max-w-sm">
          <div
            className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl p-[5px] shadow-[0_14px_26px_-14px_rgba(0,0,0,0.6)] transition-transform ${
              isGrail ? "-rotate-3" : ""
            }`}
            style={{ background: frameBackground }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-[10px] bg-surface">
              <CardPhotoGallery images={allPhotos(card)} alt={`${displayName} card`} />
              <span
                className={`absolute left-2 top-2 z-10 inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold ${
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
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="font-display text-[26px] uppercase leading-none tracking-wide text-text">
                {displayName}
              </h1>
              {card.card_number && (
                <span className="font-display whitespace-nowrap text-[15px] font-medium text-muted">
                  #{card.card_number}
                </span>
              )}
            </div>
            {isOwner && <CardHeaderActions cardId={card.id} playerName={card.player_name} />}
          </div>
          {card.team && <p className="mt-1.5 text-sm text-muted">{card.team}</p>}
          {card.is_rookie && (
            <span className="mt-3 inline-flex items-center rounded-md border border-[#E8B94A]/40 bg-[#3A2E12] px-2.5 py-1 text-[11.5px] font-semibold text-[#E8B94A]">
              RC
            </span>
          )}

          <div className="mt-5 flex gap-4 border-t border-border pt-4 sm:gap-6">
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Set</p>
              <p className="mt-1 truncate text-sm font-semibold text-text" title={card.set_name ?? undefined}>
                {card.set_name ?? "—"}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Typ</p>
              <p className="mt-1 truncate text-sm font-semibold text-text" title={typeLabel(card)}>
                {typeLabel(card)}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Attribute</p>
              <div className="mt-1 flex gap-2">
                <AttrIcon
                  active={card.print_run != null}
                  icon={Hash}
                  title={card.print_run != null ? `Numbered /${card.print_run}` : "Not numbered"}
                />
                <AttrIcon
                  active={card.is_autograph}
                  icon={PenLine}
                  title={card.is_autograph ? "Autographed" : "No autograph"}
                />
                <AttrIcon
                  active={card.is_relic}
                  icon={Shirt}
                  title={card.is_relic ? "Relic / patch" : "No relic / patch"}
                />
              </div>
            </div>
          </div>

          <CardDescriptionGrid fields={descriptionFields} />

          {isOwner && <CardStatusSelect card={card} />}

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

          {!isOwner && (
            <CardDetailActions
              card={card}
              ownerUsername={owner.username}
              ownerAllowsContact={owner.allow_contact}
            />
          )}
        </div>
      </div>

      <CardParallelStrip parallels={parallels} ownedCount={ownedCount} />

      {(alsoInCollection.length > 0 || recommended.length > 0) && (
        <div className="mt-10 border-t border-[#21262D] pt-8">
          {alsoInCollection.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-text">In Your Collection</h2>
              <p className="mb-3 mt-0.5 text-sm text-muted">
                You own {alsoInCollection.length + 1} versions of {card.player_name}
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {alsoInCollection.map((c) => (
                  <CollectionCardTile
                    key={c.id}
                    href={`/collection/${c.id}`}
                    imageUrl={coverPhoto(c)}
                    playerName={c.player_name}
                    category={c.category}
                    is_variation_of_base={c.is_variation_of_base}
                    insert_set={c.insert_set}
                    parallel={c.parallel}
                    print_run={c.print_run}
                  />
                ))}
              </div>
            </div>
          )}

          {recommended.length > 0 && (
            <div className={alsoInCollection.length > 0 ? "mt-8 border-t border-[#21262D] pt-8" : ""}>
              <h2 className="text-lg font-semibold text-text">Marketplace</h2>
              <p className="mb-3 mt-0.5 text-sm text-muted">
                {recommended.length} collector{recommended.length === 1 ? " is" : "s are"} offering related cards
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {recommended.map((c) => {
                  const seller = recommendedOwnersById.get(c.owner_id);
                  if (!seller) return null;
                  return (
                    <MarketplaceCardTile
                      key={c.id}
                      href={`/collection/${c.id}`}
                      imageUrl={coverPhoto(c)}
                      playerName={c.player_name}
                      team={c.team}
                      valueTag={cardValueTag(c)}
                      valueTier={cardValueTier(c)}
                      sellerUsername={seller.username}
                      sellerAvatarUrl={seller.avatar_url}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
