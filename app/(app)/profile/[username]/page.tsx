import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Pencil, Plus, Radio, ShoppingBag } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { TradingCard } from "@/components/cards/TradingCard";
import { FollowButton } from "@/components/profile/FollowButton";
import { RatingWidget } from "@/components/profile/RatingWidget";
import { WishlistRequestCard } from "@/components/wishlist/WishlistRequestCard";
import { QuickVisibilityToggle } from "@/components/profile/QuickVisibilityToggle";
import { createClient } from "@/lib/supabase/server";
import type { Card, Wishlist } from "@/lib/types/database";

const ROLE_LABEL: Record<string, string> = {
  collector: "Collector",
  retailer: "Retailer",
  streamer: "Streamer",
};

const TABS = [
  { key: "collection", label: "My Collection" },
  { key: "trade", label: "For Trade" },
  { key: "traded", label: "Traded" },
  { key: "looking", label: "Looking For" },
] as const;

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  const activeTab = TABS.some((t) => t.key === tab) ? (tab as (typeof TABS)[number]["key"]) : "collection";

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

  if (activeTab === "looking") {
    const { data } = await supabase
      .from("wishlist")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });
    lookingFor = data ?? [];
  } else if (!(activeTab === "collection" && collectionHiddenFromViewer)) {
    const status =
      activeTab === "trade" ? "for_trade" : activeTab === "traded" ? "traded" : "personal_collection";
    const { data } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", profile.id)
      .eq("status", status)
      .order(activeTab === "traded" ? "traded_at" : "created_at", { ascending: false });
    cards = data ?? [];
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const socialLinks = [
    { url: profile.twitch_url, label: "Twitch", icon: Radio },
    { url: profile.whatnot_url, label: "Whatnot", icon: ShoppingBag },
    { url: profile.website_url, label: "Website", icon: Globe },
  ].filter((link) => link.url);

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-start">
        <Avatar src={profile.avatar_url} alt={profile.username} size={72} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-text">{profile.full_name || profile.username}</h1>
            <Badge>{ROLE_LABEL[profile.role] ?? profile.role}</Badge>
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
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
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
        ) : cards.length === 0 ? (
          <p className="text-sm text-muted">No cards to show yet.</p>
        ) : (
          <>
            {activeTab === "collection" && isOwnProfile && !profile.show_personal_collection && (
              <p className="mb-4 text-xs text-muted">
                Only visible to you. <QuickVisibilityToggle profileId={profile.id} />
              </p>
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
