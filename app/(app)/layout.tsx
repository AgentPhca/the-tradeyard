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
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;

    const { data: count } = await supabase.rpc("unread_message_count");
    unreadCount = count ?? 0;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar profile={profile} initialUnreadCount={unreadCount} />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
