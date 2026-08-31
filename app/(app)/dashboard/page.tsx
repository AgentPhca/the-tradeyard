import Link from "next/link";
import { Layers, Repeat, Store, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username = "collector";
  let collectionCount = 0;
  let forTradeCount = 0;
  let pendingTradeCount = 0;
  let wishlistCount = 0;

  if (user) {
    const [{ data: profile }, { count: total }, { count: forTrade }, { count: pending }, { count: wishlist }] =
      await Promise.all([
        supabase.from("profiles").select("username").eq("id", user.id).single(),
        supabase
          .from("cards")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .neq("status", "traded"),
        supabase
          .from("cards")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .eq("status", "for_trade"),
        supabase
          .from("trades")
          .select("id", { count: "exact", head: true })
          .or(`initiator_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .eq("status", "pending"),
        supabase
          .from("wishlist")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

    username = profile?.username ?? username;
    collectionCount = total ?? 0;
    forTradeCount = forTrade ?? 0;
    pendingTradeCount = pending ?? 0;
    wishlistCount = wishlist ?? 0;
  }

  const stats = [
    { label: "Cards in collection", value: collectionCount, icon: Layers, href: "/collection" },
    { label: "Cards for trade", value: forTradeCount, icon: Store, href: "/marketplace" },
    { label: "Pending trades", value: pendingTradeCount, icon: Repeat, href: "/dashboard" },
    { label: "Wishlist items", value: wishlistCount, icon: Star, href: "/dashboard" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-text">Welcome back, {username}</h1>
      <p className="mt-1 text-sm text-muted">Here&apos;s what&apos;s happening on the Yard.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-primary/40"
          >
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-2xl font-bold text-text">{value}</p>
            <p className="mt-1 text-sm text-muted">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link href="/collection" className="btn-primary">
          Manage my collection
        </Link>
        <Link href="/marketplace" className="btn-secondary">
          Browse the marketplace
        </Link>
      </div>
    </div>
  );
}
