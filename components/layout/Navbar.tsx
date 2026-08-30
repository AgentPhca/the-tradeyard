"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LayoutDashboard, Layers, Store } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/lib/types/database";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
];

interface NavbarProps {
  profile?: Pick<Profile, "username" | "avatar_url"> | null;
}

export function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname();

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

        <Link
          href={profile ? `/profile/${profile.username}` : "/login"}
          className="flex items-center gap-2 rounded-full border border-transparent p-0.5 transition-colors hover:border-border"
        >
          <Avatar src={profile?.avatar_url} alt={profile?.username ?? "Account"} size={36} />
        </Link>
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
