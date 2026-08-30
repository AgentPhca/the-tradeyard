import { Navbar } from "@/components/layout/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let unreadCount = 0;
  let followerCount = 0;
  let followingCount = 0;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, role, allow_contact")
      .eq("id", user.id)
      .single();
    profile = data;

    const { data: count } = await supabase.rpc("unread_message_count");
    unreadCount = count ?? 0;

    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("followee_id", user.id),
      supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id),
    ]);
    followerCount = followers ?? 0;
    followingCount = following ?? 0;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        profile={profile}
        initialUnreadCount={unreadCount}
        followerCount={followerCount}
        followingCount={followingCount}
      />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
