"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LayoutDashboard, Layers, Mail, Store } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
];

interface NavbarProps {
  profile?: Pick<Profile, "username" | "avatar_url" | "role" | "allow_contact"> | null;
  initialUnreadCount?: number;
  followerCount?: number;
  followingCount?: number;
}

export function Navbar({
  profile,
  initialUnreadCount = 0,
  followerCount = 0,
  followingCount = 0,
}: NavbarProps) {
  const pathname = usePathname();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    if (!profile) return;

    // RLS already scopes postgres_changes delivery to messages in
    // conversations this user participates in, so no client-side filter
    // on conversation ids is needed here.
    const channel = supabase
      .channel("inbox-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const senderId = (payload.new as { sender_id: string }).sender_id;
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && senderId !== user.id) {
              setUnreadCount((count) => count + 1);
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight text-text">
          The <span className="text-primary">Tradeyard</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-card text-text"
                    : "text-muted hover:bg-surface hover:text-text"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/messages"
            title="Messages"
            className={`relative rounded-md p-2 transition-colors ${
              pathname?.startsWith("/messages")
                ? "bg-card text-text"
                : "text-muted hover:bg-surface hover:text-text"
            }`}
          >
            <Mail className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>

          {profile ? (
            <ProfileMenu
              profile={profile}
              followerCount={followerCount}
              followingCount={followingCount}
            />
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full border border-transparent p-0.5 transition-colors hover:border-border"
            >
              <Avatar alt="Account" size={36} />
            </Link>
          )}
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 sm:hidden">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-card text-text" : "text-muted hover:bg-surface hover:text-text"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
