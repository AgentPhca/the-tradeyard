import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Globe, Pencil, Plus, Radio, ShoppingBag, Tag } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { TradingCard } from "@/components/cards/TradingCard";
import { FollowButton } from "@/components/profile/FollowButton";
import { RatingWidget } from "@/components/profile/RatingWidget";
import { RoleBadges } from "@/components/profile/RoleBadges";
import { WishlistRequestCard } from "@/components/wishlist/WishlistRequestCard";
import { VisibilityToggle } from "@/components/profile/VisibilityToggle";
import { ChecklistAlbum } from "@/components/collection/ChecklistAlbum";
import { createClient } from "@/lib/supabase/server";
import { getPublicBaseYardProgress, type BaseYardSetProgress } from "@/lib/baseyard/getPublicBaseYardProgress";
import { getPublicInsertYardProgress } from "@/lib/insertyard/getPublicInsertYardProgress";
import type { Card, Wishlist } from "@/lib/types/database";

// BaseYard/InsertYard are filtered out below unless the profile has opted
// in (see show_baseyard_publicly/show_insertyard_publicly) — parallel to
// "My Collection", not nested inside it, since Base/Insert cards no longer
// show up in that tab at all.
const ALL_TABS = [
  { key: "collection", label: "My Collection" },
  { key: "baseyard", label: "BaseYard" },
  { key: "insertyard", label: "InsertYard" },
  { key: "trade", label: "For Trade" },
  { key: "traded", label: "Traded" },
  { key: "looking", label: "Looking For" },
] as const;

type TabKey = (typeof ALL_TABS)[number]["key"];

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

  const TABS = ALL_TABS.filter((t) => {
    if (t.key === "baseyard") return profile.show_baseyard_publicly;
    if (t.key === "insertyard") return profile.show_insertyard_publicly;
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
    const { data } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", profile.id)
      .eq("category", "Base")
      .neq("status", "traded");
    baseYardAlbumCards = data ?? [];
  } else if (activeTab === "baseyard") {
    baseYardProgress = await getPublicBaseYardProgress(supabase, profile.id);
  } else if (activeTab === "insertyard" && showInsertYardAlbum) {
    // Covered by the cards RLS policy's InsertYard clause (see
    // insertyard_public_visibility.sql).
    const { data } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", profile.id)
      .not("insert_set", "is", null)
      .or("category.is.null,category.neq.Base")
      .neq("status", "traded");
    insertYardAlbumCards = data ?? [];
  } else if (activeTab === "insertyard") {
    // Covers both the Set-level overview and (once a Set is picked) the
    // Insert-Set-level tiles — one fetch, sliced two ways in the JSX below.
    const progress = await getPublicInsertYardProgress(supabase, profile.id);
    insertYardBySet = progress.bySet;
    insertYardByInsertSet = progress.byInsertSet;
  } else if (!(activeTab === "collection" && collectionHiddenFromViewer)) {
    const status =
      activeTab === "trade" ? "for_trade" : activeTab === "traded" ? "traded" : "personal_collection";
    let query = supabase
      .from("cards")
      .select("*")
      .eq("owner_id", profile.id)
      .eq("status", status);
    // Base and Insert cards are BaseYard's/InsertYard's own thing (see the
    // dedicated tabs) — "My Collection" no longer mixes them in, for owner
    // and visitors alike. .neq("category", "Base") alone would also
    // silently drop every card with category = null (NULL <> 'Base' is
    // NULL, not true, in SQL's three-valued logic) — most non-catalog-
    // matched cards — so null has to be let through explicitly.
    if (activeTab === "collection") {
      query = query.or("category.is.null,category.neq.Base").is("insert_set", null);
    }
    const { data } = await query.order(activeTab === "traded" ? "traded_at" : "created_at", {
      ascending: false,
    });
    cards = data ?? [];
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
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/profile/${profile.username}?tab=${t.key}`}
              className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "border-b-2 border-primary text-text"
                  : "text-muted hover:text-text"
              }`}
            >
              {t.label}
            </Link>
          ))}
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
