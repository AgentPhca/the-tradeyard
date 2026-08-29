import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { TradingCard } from "@/components/cards/TradingCard";
import { createClient } from "@/lib/supabase/server";
import type { Card } from "@/lib/types/database";

const ROLE_LABEL: Record<string, string> = {
  collector: "Collector",
  retailer: "Retailer",
  streamer: "Streamer",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
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

  const { data } = await supabase
    .from("cards")
    .select("*")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false });

  const cards: Card[] = data ?? [];

  return (
    <div>
      <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-center">
        <Avatar src={profile.avatar_url} alt={profile.username} size={72} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text">{profile.full_name || profile.username}</h1>
            <Badge>{ROLE_LABEL[profile.role] ?? profile.role}</Badge>
          </div>
          <p className="text-sm text-muted">@{profile.username}</p>
          {profile.bio && <p className="mt-2 max-w-xl text-sm text-text">{profile.bio}</p>}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Collection</h2>
          {isOwnProfile && (
            <Link href="/collection/add" className="btn-primary">
              <Plus className="h-4 w-4" />
              Add Card
            </Link>
          )}
        </div>
        {cards.length === 0 ? (
          <p className="text-sm text-muted">No cards to show yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((card) => (
              <TradingCard key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
