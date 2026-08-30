import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";

const TABS = [
  { key: "followers", label: "Followers" },
  { key: "following", label: "Following" },
] as const;

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "following" ? "following" : "followers";

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .single();

  if (!profile) {
    notFound();
  }

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

  let memberIds: string[] = [];
  if (activeTab === "followers") {
    const { data } = await supabase
      .from("followers")
      .select("follower_id")
      .eq("followee_id", profile.id)
      .order("created_at", { ascending: false });
    memberIds = (data ?? []).map((row) => row.follower_id);
  } else {
    const { data } = await supabase
      .from("followers")
      .select("followee_id")
      .eq("follower_id", profile.id)
      .order("created_at", { ascending: false });
    memberIds = (data ?? []).map((row) => row.followee_id);
  }

  let members: { id: string; username: string; avatar_url: string | null; role: string }[] = [];
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, role")
      .in("id", memberIds);
    const byId = new Map((data ?? []).map((m) => [m.id, m]));
    members = memberIds.map((id) => byId.get(id)).filter((m): m is NonNullable<typeof m> => Boolean(m));
  }

  const counts = { followers: followerCount ?? 0, following: followingCount ?? 0 };

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={`/profile/${username}`}
        className="mb-6 inline-block text-sm text-muted hover:text-text"
      >
        &larr; Back to @{username}
      </Link>

      <h1 className="text-2xl font-bold text-text">Community</h1>
      <p className="mt-1 text-sm text-muted">@{username}&rsquo;s network on the Yard.</p>

      <div className="mt-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/profile/${username}/community?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "border-b-2 border-primary text-text"
                : "text-muted hover:text-text"
            }`}
          >
            {t.label} ({counts[t.key]})
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-1">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Users className="h-6 w-6 text-muted" />
            <p className="text-sm text-muted">
              {activeTab === "followers" ? "No followers yet." : "Not following anyone yet."}
            </p>
          </div>
        ) : (
          members.map((member) => (
            <Link
              key={member.id}
              href={`/profile/${member.username}`}
              className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface"
            >
              <Avatar src={member.avatar_url} alt={member.username} size={40} />
              <span className="text-sm font-medium text-text">@{member.username}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
