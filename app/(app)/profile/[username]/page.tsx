import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Globe, Pencil, Plus, Radio, ShoppingBag, Tag, User, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { TradingCard } from "@/components/cards/TradingCard";
import { FollowButton } from "@/components/profile/FollowButton";
import { RatingWidget } from "@/components/profile/RatingWidget";
import { RoleBadges } from "@/components/profile/RoleBadges";
import { WishlistRequestCard } from "@/components/wishlist/WishlistRequestCard";
import { VisibilityToggle } from "@/components/profile/VisibilityToggle";
import { ChecklistAlbum } from "@/components/collection/ChecklistAlbum";
import { PersonalYardAlbum } from "@/components/collection/PersonalYardAlbum";
import { createClient } from "@/lib/supabase/server";
import { getPublicBaseYardProgress, type BaseYardSetProgress } from "@/lib/baseyard/getPublicBaseYardProgress";
import { getPublicInsertYardProgress } from "@/lib/insertyard/getPublicInsertYardProgress";
import { getTeamYardProgress } from "@/lib/personalYard/getTeamYardProgress";
import { getPlayerYardProgress } from "@/lib/personalYard/getPlayerYardProgress";
import { isChromeBaseInsertSet, isPureBase } from "@/lib/utils/cardClassification";
import type { Card, Wishlist } from "@/lib/types/database";

// BaseYard/InsertYard are filtered out below unless the profile has opted
// in (see show_baseyard_publicly/show_insertyard_publicly) — parallel to
// "My Collection", not nested inside it, since Base/Insert cards no longer
// show up in that tab at all.
const BASE_TABS = [
  { key: "collection", label: "My Collection", group: "Collection" },
  { key: "baseyard", label: "BaseYard", group: "Collection" },
  { key: "insertyard", label: "InsertYard", group: "Collection" },
  { key: "trade", label: "For Trade", group: "Marktplatz" },
  { key: "traded", label: "Traded", group: "Marktplatz" },
  { key: "looking", label: "Looking For", group: "Marktplatz" },
] as const;

type TabKey = (typeof BASE_TABS)[number]["key"] | "teamyard" | "playeryard";
type TabGroup = "Collection" | "Marktplatz";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{
    tab?: string;
    baseSet?: string;
    insertYardSet?: string;
    insertYardInsert?: string;
  }>;
}) {
  const { username } = await params;
  const { tab, baseSet, insertYardSet, insertYardInsert } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) {
    notFound();
  }

  const isOwnProfile = user?.id === profile.id;

  // TeamYard/PlayerYard tabs only exist at all once a value is pinned —
  // unlike BaseYard/InsertYard, which are always meaningful tabs (0%
  // included) and are filtered purely by their visibility flag below. Both
  // group into "Collection", alongside BaseYard/InsertYard.
  const ALL_TABS: { key: TabKey; label: string; group: TabGroup }[] = [
    ...BASE_TABS,
    ...(profile.personal_team_yard
      ? [{ key: "teamyard" as const, label: profile.personal_team_yard, group: "Collection" as const }]
      : []),
    ...(profile.personal_player_yard
      ? [{ key: "playeryard" as const, label: profile.personal_player_yard, group: "Collection" as const }]
      : []),
  ];

  const TABS = ALL_TABS.filter((t) => {
    if (t.key === "baseyard") return profile.show_baseyard_publicly;
    if (t.key === "insertyard") return profile.show_insertyard_publicly;
    if (t.key === "teamyard") return profile.show_teamyard_publicly;
    if (t.key === "playeryard") return profile.show_playeryard_publicly;
    return true;
  });
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "collection";

  // The owner always drills into a set via the full interactive album on
  // /collection (their tiles link there, see below) — the embedded
  // read-only album on this page is only ever for a visitor looking at
  // someone else's Base/InsertYard.
  const showBaseYardAlbum = activeTab === "baseyard" && !isOwnProfile && Boolean(baseSet);
  const showInsertYardSetDetail =
    activeTab === "insertyard" && !isOwnProfile && Boolean(insertYardSet) && !insertYardInsert;
  const showInsertYardAlbum =
    activeTab === "insertyard" && !isOwnProfile && Boolean(insertYardSet) && Boolean(insertYardInsert);

  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("followee_id", profile.id),
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id),
  ]);

  let isFollowing = false;
  if (user && !isOwnProfile) {
    const { data: followRow } = await supabase
      .from("followers")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("followee_id", profile.id)
      .maybeSingle();
    isFollowing = Boolean(followRow);
  }

  const { data: ratingRows } = await supabase
    .from("ratings")
    .select("stars")
    .eq("ratee_id", profile.id);
  const ratingCount = ratingRows?.length ?? 0;
  const averageStars = ratingCount > 0 ? ratingRows!.reduce((sum, r) => sum + r.stars, 0) / ratingCount : null;

  let unratedTradeIds: string[] = [];
  if (user && !isOwnProfile) {
    const { data: completedTrades } = await supabase
      .from("trades")
      .select("id")
      .eq("status", "completed")
      .or(
        `and(initiator_id.eq.${user.id},receiver_id.eq.${profile.id}),and(receiver_id.eq.${user.id},initiator_id.eq.${profile.id})`
      );

    const tradeIds = (completedTrades ?? []).map((t) => t.id);
    if (tradeIds.length > 0) {
      const { data: existingRatings } = await supabase
        .from("ratings")
        .select("trade_id")
        .eq("rater_id", user.id)
        .in("trade_id", tradeIds);
      const ratedTradeIds = new Set((existingRatings ?? []).map((r) => r.trade_id));
      unratedTradeIds = tradeIds.filter((id) => !ratedTradeIds.has(id));
    }
  }

  // Personal Collection cards are opt-in for non-owner viewers (see
  // profiles.show_personal_collection + the cards RLS policy, which
  // enforces this same rule at the database level). The app-level check
  // here is what lets us show an explanatory message instead of just an
  // empty grid.
  const collectionHiddenFromViewer = !isOwnProfile && !profile.show_personal_collection;

  let cards: Card[] = [];
  let lookingFor: Wishlist[] = [];
  let baseYardProgress: BaseYardSetProgress[] = [];
  let baseYardAlbumCards: Card[] = [];
  let insertYardBySet: Awaited<ReturnType<typeof getPublicInsertYardProgress>>["bySet"] = [];
  let insertYardByInsertSet: Awaited<ReturnType<typeof getPublicInsertYardProgress>>["byInsertSet"] = [];
  let insertYardAlbumCards: Card[] = [];
  let teamYardAlbumCards: Card[] = [];
  let playerYardAlbumCards: Card[] = [];

  // Overall progress across every set — used by both the header badges
  // (shown on any tab) and the owner's own TeamYard/PlayerYard tab body.
  // Gated the same way the tabs themselves are: always visible to the
  // owner, otherwise only once the matching show_*_publicly flag is on —
  // the RLS policies backing these queries (personal_yards_public_
  // visibility.sql) enforce the identical rule at the database level, so a
  // visitor's query naturally returns nothing extra even if this check
  // were ever bypassed.
  const showTeamYardBadge = Boolean(profile.personal_team_yard) && (isOwnProfile || profile.show_teamyard_publicly);
  const showPlayerYardBadge =
    Boolean(profile.personal_player_yard) && (isOwnProfile || profile.show_playeryard_publicly);

  const [teamYardProgress, playerYardProgress] = await Promise.all([
    showTeamYardBadge
      ? getTeamYardProgress(supabase, profile.id, profile.personal_team_yard!)
      : Promise.resolve({ owned: 0, total: 0 }),
    showPlayerYardBadge
      ? getPlayerYardProgress(supabase, profile.id, profile.personal_player_yard!)
      : Promise.resolve({ owned: 0, total: 0 }),
  ]);

  if (activeTab === "looking") {
    const { data } = await supabase
      .from("wishlist")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    lookingFor = data ?? [];
  } else if (activeTab === "baseyard" && showBaseYardAlbum) {
    // Covered by the cards RLS policy's baseyard clause (see
    // baseyard_public_visibility.sql) — a personal_collection Base card is
    // visible to any authenticated viewer once its owner has
    // show_baseyard_publicly = true, same as the progress summary below.
    // Plain-Base-only (see lib/utils/cardClassification.ts's isPureBase) —
    // ChecklistAlbum's own ownedByKey applies the same filter, but this
    // avoids shipping CHROME-BASE/variation rows to the client at all.
    const { data } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", profile.id)
      .eq("category", "Base")
      .eq("is_variation_of_base", false)
      .neq("status", "traded");
    baseYardAlbumCards = (data ?? []).filter((c) => !isChromeBaseInsertSet(c.insert_set));
  } else if (activeTab === "baseyard") {
    baseYardProgress = await getPublicBaseYardProgress(supabase, profile.id);
  } else if (activeTab === "insertyard" && showInsertYardAlbum) {
    // Covered by the cards RLS policy's InsertYard clause (see
    // insertyard_public_visibility.sql). Broadened beyond category='Insert'
    // — see lib/utils/cardClassification.ts's isInsert.
    const { data } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", profile.id)
      .or("category.is.null,category.neq.Base")
      .eq("is_variation_of_base", false)
      .neq("status", "traded");
    insertYardAlbumCards = data ?? [];
  } else if (activeTab === "insertyard") {
    // Covers both the Set-level overview and (once a Set is picked) the
    // Insert-Set-level tiles — one fetch, sliced two ways in the JSX below.
    const progress = await getPublicInsertYardProgress(supabase, profile.id);
    insertYardBySet = progress.bySet;
    insertYardByInsertSet = progress.byInsertSet;
  } else if (activeTab === "teamyard" && profile.personal_team_yard && !isOwnProfile) {
    // Covered by the cards RLS policy's TeamYard clause (see
    // personal_yards_public_visibility.sql). teamYardProgress (for the
    // owner's own progress bar) is already computed above. "Not a plain
    // Base card" — see lib/utils/cardClassification.ts's isPureBase,
    // matching getTeamYardProgress.ts's own catalog filter.
    const { data } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", profile.id)
      .eq("team", profile.personal_team_yard)
      .neq("status", "traded")
      .or("is_variation_of_base.eq.true,category.is.null,category.neq.Base");
    teamYardAlbumCards = data ?? [];
  } else if (activeTab === "playeryard" && profile.personal_player_yard && !isOwnProfile) {
    // Covered by the cards RLS policy's PlayerYard clause (see
    // personal_yards_public_visibility.sql). playerYardProgress (for the
    // owner's own progress bar) is already computed above.
    const { data } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", profile.id)
      .eq("player_name", profile.personal_player_yard)
      .neq("status", "traded");
    playerYardAlbumCards = data ?? [];
  } else if (!(activeTab === "collection" && collectionHiddenFromViewer)) {
    const status =
      activeTab === "trade" ? "for_trade" : activeTab === "traded" ? "traded" : "personal_collection";
    const { data } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", profile.id)
      .eq("status", status)
      .order(activeTab === "traded" ? "traded_at" : "created_at", { ascending: false });
    // Plain Base cards are BaseYard's own thing (see the dedicated tab) —
    // "My Collection" no longer mixes them in, for owner and visitors
    // alike. A CHROME-BASE second-tier card or a photo/design variation
    // isn't a plain Base card any more (see lib/utils/cardClassification
    // .ts's isPureBase), so it stays in this list, same as Insert cards do
    // (InsertYard is its own checklist view, but an Insert-category card
    // is still "in the collection" too).
    cards = activeTab === "collection" ? (data ?? []).filter((c) => !isPureBase(c)) : data ?? [];
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const socialLinks = [
    { url: profile.twitch_url, label: "Twitch", icon: Radio },
    { url: profile.whatnot_url, label: "Whatnot", icon: ShoppingBag },
    { url: profile.instagram_url, label: "Instagram", icon: Camera },
    { url: profile.ebay_url, label: "eBay", icon: Tag },
    { url: profile.website_url, label: "Website", icon: Globe },
  ].filter((link) => link.url);

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-start">
        <Avatar src={profile.avatar_url} alt={profile.username} size={72} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-text">{profile.full_name || profile.username}</h1>
            <RoleBadges roles={profile.role} />
          </div>
          <p className="text-sm text-muted">@{profile.username}</p>
          <p className="mt-0.5 text-xs text-muted">Member since {memberSince}</p>
          {profile.bio && <p className="mt-2 max-w-xl text-sm text-text">{profile.bio}</p>}

          {socialLinks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {socialLinks.map(({ url, label, icon: Icon }) => (
                <a
                  key={label}
                  href={url!}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-muted hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </a>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 text-sm text-muted">
            <span>
              <span className="font-semibold text-text">{followerCount ?? 0}</span> followers
            </span>
            <span>
              <span className="font-semibold text-text">{followingCount ?? 0}</span> following
            </span>
          </div>

          <div className="mt-3">
            <RatingWidget
              profileId={profile.id}
              averageStars={averageStars}
              ratingCount={ratingCount}
              unratedTradeIds={unratedTradeIds}
            />
          </div>

          {(showTeamYardBadge || showPlayerYardBadge) && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {showTeamYardBadge && (
                <div className="flex items-center gap-1.5 rounded-lg border border-primary/35 bg-[#14532D] py-1.5 pl-2 pr-2.5 text-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-primary/20 text-primary">
                    <Users className="h-3 w-3" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[9.5px] font-bold uppercase tracking-wide text-primary/75">
                      TeamYard
                    </span>
                    <span className="font-semibold text-text">{profile.personal_team_yard}</span>
                    <span className="ml-0.5 text-[11px] font-bold text-primary">
                      {teamYardProgress.total > 0
                        ? Math.round((teamYardProgress.owned / teamYardProgress.total) * 100)
                        : 0}
                      %
                    </span>
                  </span>
                </div>
              )}
              {showPlayerYardBadge && (
                <div className="flex items-center gap-1.5 rounded-lg border border-[#E8B94A]/35 bg-[#3A2E12] py-1.5 pl-2 pr-2.5 text-xs">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[#E8B94A]/20 text-[#E8B94A]">
                    <User className="h-3 w-3" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[9.5px] font-bold uppercase tracking-wide text-[#E8B94A]/75">
                      PlayerYard
                    </span>
                    <span className="font-semibold text-text">{profile.personal_player_yard}</span>
                    <span className="ml-0.5 text-[11px] font-bold text-[#E8B94A]">
                      {playerYardProgress.total > 0
                        ? Math.round((playerYardProgress.owned / playerYardProgress.total) * 100)
                        : 0}
                      %
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {isOwnProfile ? (
            <>
              <Link href="/collection/add" className="btn-primary">
                <Plus className="h-4 w-4" />
                Add Card
              </Link>
              <Link href={`/profile/${profile.username}/edit`} className="btn-secondary">
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Link>
            </>
          ) : (
            <FollowButton profileId={profile.id} isFollowing={isFollowing} />
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-6 flex flex-col gap-4">
          {(["Collection", "Marktplatz"] as const).map((group) => {
            const groupTabs = TABS.filter((t) => t.group === group);
            if (groupTabs.length === 0) return null;
            return (
              <div key={group}>
                <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-muted">{group}</p>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                  {groupTabs.map((t) => {
                    const active = activeTab === t.key;
                    if (t.key === "teamyard" || t.key === "playeryard") {
                      const isTeam = t.key === "teamyard";
                      return (
                        <Link
                          key={t.key}
                          href={`/profile/${profile.username}?tab=${t.key}`}
                          className={`min-w-[112px] shrink-0 rounded-md border py-1.5 pl-2.5 pr-3 leading-tight ${
                            isTeam ? "border-l-[3px] border-l-primary" : "border-l-[3px] border-l-[#E8B94A]"
                          } ${active ? "border-text bg-card" : "border-border bg-surface"}`}
                        >
                          <span
                            className={`block text-[9.5px] font-bold uppercase tracking-wide ${
                              isTeam ? "text-primary" : "text-[#E8B94A]"
                            }`}
                          >
                            {isTeam ? "TeamYard" : "PlayerYard"}
                          </span>
                          <span
                            className="block max-w-[160px] truncate text-[12.5px] font-semibold text-text"
                            title={t.label}
                          >
                            {t.label}
                          </span>
                        </Link>
                      );
                    }
                    return (
                      <Link
                        key={t.key}
                        href={`/profile/${profile.username}?tab=${t.key}`}
                        className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-2 text-[12.5px] font-semibold transition-colors ${
                          active
                            ? "border-text bg-card text-text"
                            : "border-border bg-surface text-muted hover:text-text"
                        }`}
                      >
                        {t.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {activeTab === "looking" ? (
          lookingFor.length === 0 ? (
            <p className="text-sm text-muted">No wishlist requests yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {lookingFor.map((entry) => (
                <WishlistRequestCard
                  key={entry.id}
                  entry={entry}
                  isOwner={entry.user_id === user?.id}
                  ownerUsername={profile.username}
                  ownerAvatarUrl={profile.avatar_url}
                  ownerAllowsContact={profile.allow_contact}
                />
              ))}
            </div>
          )
        ) : activeTab === "collection" && collectionHiddenFromViewer ? (
          <p className="text-sm text-muted">
            This user doesn&rsquo;t show their Personal Collection publicly.
          </p>
        ) : activeTab === "baseyard" ? (
          showBaseYardAlbum ? (
            <div>
              <Link
                href={`/profile/${profile.username}?tab=baseyard`}
                className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
              >
                &larr; Back to BaseYard overview
              </Link>
              <ChecklistAlbum cards={baseYardAlbumCards} targetUserId={profile.id} readOnly mode="base" />
            </div>
          ) : baseYardProgress.length === 0 ? (
            <p className="text-sm text-muted">No Base checklist data available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {baseYardProgress.map((set) => {
                const pct = set.total > 0 ? Math.round((set.owned / set.total) * 100) : 0;
                // The owner drills into the full interactive album on
                // /collection (Add Card etc. only make sense there); a
                // visitor drills into a read-only album right here.
                const tileHref = isOwnProfile
                  ? `/collection?yard=base&baseSet=${encodeURIComponent(set.setName)}`
                  : `/profile/${profile.username}?tab=baseyard&baseSet=${encodeURIComponent(set.setName)}`;
                return (
                  <Link
                    key={set.setName}
                    href={tileHref}
                    className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-text">{set.setName}</span>
                      <span className="text-muted">{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-card">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted">
                      {set.owned} / {set.total} collected
                    </p>
                  </Link>
                );
              })}
            </div>
          )
        ) : activeTab === "insertyard" ? (
          showInsertYardAlbum ? (
            <div>
              <Link
                href={`/profile/${profile.username}?tab=insertyard&insertYardSet=${encodeURIComponent(insertYardSet ?? "")}`}
                className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
              >
                &larr; Back to insert sets
              </Link>
              <ChecklistAlbum cards={insertYardAlbumCards} targetUserId={profile.id} readOnly mode="insert" />
            </div>
          ) : showInsertYardSetDetail ? (
            <div>
              <Link
                href={`/profile/${profile.username}?tab=insertyard`}
                className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
              >
                &larr; Back to InsertYard overview
              </Link>
              {insertYardByInsertSet.filter((i) => i.setName === insertYardSet).length === 0 ? (
                <p className="text-sm text-muted">No insert sets found for this set.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {insertYardByInsertSet
                    .filter((i) => i.setName === insertYardSet)
                    .map((insert) => {
                      const pct = insert.total > 0 ? Math.round((insert.owned / insert.total) * 100) : 0;
                      const href = `/profile/${profile.username}?tab=insertyard&insertYardSet=${encodeURIComponent(insert.setName)}&insertYardInsert=${encodeURIComponent(insert.insertSet)}`;
                      return (
                        <Link
                          key={insert.insertSet}
                          href={href}
                          className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40"
                        >
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span className="font-medium text-text">{insert.insertSet}</span>
                            <span className="text-muted">{pct}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-card">
                            <div
                              className="h-full rounded-full bg-primary transition-[width]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-muted">
                            {insert.owned} / {insert.total} collected
                          </p>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          ) : insertYardBySet.length === 0 ? (
            <p className="text-sm text-muted">No Insert Set checklist data available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {insertYardBySet.map((set) => {
                const pct = set.total > 0 ? Math.round((set.owned / set.total) * 100) : 0;
                // The owner drills straight into the full interactive album
                // on /collection; a visitor drills into the Insert-Set
                // tiles for that Set, right here.
                const tileHref = isOwnProfile
                  ? `/collection?yard=insert&insertYardSet=${encodeURIComponent(set.setName)}`
                  : `/profile/${profile.username}?tab=insertyard&insertYardSet=${encodeURIComponent(set.setName)}`;
                return (
                  <Link
                    key={set.setName}
                    href={tileHref}
                    className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-text">{set.setName}</span>
                      <span className="text-muted">{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-card">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted">
                      {set.owned} / {set.total} collected · {set.insertSetCount}{" "}
                      {set.insertSetCount === 1 ? "insert set" : "insert sets"}
                    </p>
                  </Link>
                );
              })}
            </div>
          )
        ) : activeTab === "teamyard" ? (
          isOwnProfile ? (
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-text">{profile.personal_team_yard}</span>
                <span className="text-muted">
                  {teamYardProgress.total > 0
                    ? Math.round((teamYardProgress.owned / teamYardProgress.total) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-card">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{
                    width: `${teamYardProgress.total > 0 ? Math.round((teamYardProgress.owned / teamYardProgress.total) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {teamYardProgress.owned} / {teamYardProgress.total} collected
              </p>
              <Link href="/collection?yard=teamyard" className="mt-3 inline-block text-sm text-primary hover:underline">
                Zum interaktiven Album →
              </Link>
            </div>
          ) : (
            <PersonalYardAlbum
              cards={teamYardAlbumCards}
              targetUserId={profile.id}
              readOnly
              mode="team"
              value={profile.personal_team_yard ?? ""}
            />
          )
        ) : activeTab === "playeryard" ? (
          isOwnProfile ? (
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-text">{profile.personal_player_yard}</span>
                <span className="text-muted">
                  {playerYardProgress.total > 0
                    ? Math.round((playerYardProgress.owned / playerYardProgress.total) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-card">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{
                    width: `${playerYardProgress.total > 0 ? Math.round((playerYardProgress.owned / playerYardProgress.total) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {playerYardProgress.owned} / {playerYardProgress.total} collected
              </p>
              <Link href="/collection?yard=playeryard" className="mt-3 inline-block text-sm text-primary hover:underline">
                Zum interaktiven Album →
              </Link>
            </div>
          ) : (
            <PersonalYardAlbum
              cards={playerYardAlbumCards}
              targetUserId={profile.id}
              readOnly
              mode="player"
              value={profile.personal_player_yard ?? ""}
            />
          )
        ) : cards.length === 0 ? (
          <>
            {activeTab === "collection" && isOwnProfile && (
              <div className="mb-4">
                <VisibilityToggle profileId={profile.id} initialValue={profile.show_personal_collection} />
              </div>
            )}
            <p className="text-sm text-muted">No cards to show yet.</p>
          </>
        ) : (
          <>
            {activeTab === "collection" && isOwnProfile && (
              <div className="mb-4">
                <VisibilityToggle profileId={profile.id} initialValue={profile.show_personal_collection} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {cards.map((card) => (
                <TradingCard
                  key={card.id}
                  card={card}
                  isOwner={isOwnProfile}
                  ownerAllowsContact={profile.allow_contact}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
