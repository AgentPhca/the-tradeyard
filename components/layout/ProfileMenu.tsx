"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Pencil, User, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Switch } from "@/components/ui/Switch";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

const ROLE_LABEL: Record<string, string> = {
  collector: "Collector",
  retailer: "Retailer",
  streamer: "Streamer",
};

interface ProfileMenuProps {
  profile: Pick<Profile, "username" | "avatar_url" | "role" | "allow_contact">;
  followerCount: number;
  followingCount: number;
}

export function ProfileMenu({ profile, followerCount, followingCount }: ProfileMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [allowContact, setAllowContact] = useState(profile.allow_contact ?? true);
  const [updatingContact, setUpdatingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Keep the toggle in sync with the server-provided value. profile is
  // refetched on every navigation/refresh (see AppLayout), but useState's
  // initializer only runs once on mount, so without this the switch could
  // keep showing a stale value from an earlier render.
  useEffect(() => {
    setAllowContact(profile.allow_contact ?? true);
  }, [profile.allow_contact]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleToggleContact() {
    const next = !allowContact;
    setUpdatingContact(true);
    setContactError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUpdatingContact(false);
      router.push("/login");
      return;
    }

    // Trust only what the server actually persisted rather than assuming
    // the write succeeded — an optimistic update here could otherwise show
    // a value the database never stored.
    const { data, error } = await supabase
      .from("profiles")
      .update({ allow_contact: next })
      .eq("id", user.id)
      .select("allow_contact")
      .single();

    if (error || !data) {
      setContactError(error?.message ?? "Failed to update.");
      setUpdatingContact(false);
      return;
    }

    setAllowContact(data.allow_contact);
    setUpdatingContact(false);
    router.refresh();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center rounded-full border border-transparent p-0.5 transition-colors hover:border-border"
      >
        <Avatar src={profile.avatar_url} alt={profile.username} size={36} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border border-border bg-surface shadow-lg">
          <div className="flex items-center gap-3 border-b border-border p-3">
            <Avatar src={profile.avatar_url} alt={profile.username} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">@{profile.username}</p>
              <p className="text-xs text-muted">{ROLE_LABEL[profile.role] ?? profile.role}</p>
            </div>
          </div>

          <div className="flex flex-col py-1">
            <Link
              href={`/profile/${profile.username}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text transition-colors hover:bg-primary/15 hover:text-primary"
            >
              <User className="h-4 w-4" />
              View Profile
            </Link>
            <Link
              href={`/profile/${profile.username}/edit`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text transition-colors hover:bg-primary/15 hover:text-primary"
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Link>
            <Link
              href={`/profile/${profile.username}/community`}
              onClick={() => setOpen(false)}
              className="flex flex-col gap-0.5 px-3 py-2 text-sm text-text transition-colors hover:bg-primary/15 hover:text-primary"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Community
              </span>
              <span className="pl-6 text-xs text-muted">
                {followerCount} followers &middot; {followingCount} following
              </span>
            </Link>
          </div>

          <div className="border-t border-border px-3 py-3">
            <label className="flex items-center justify-between gap-2 text-sm text-text">
              <span>Allow others to contact me</span>
              <Switch checked={allowContact} onChange={handleToggleContact} disabled={updatingContact} />
            </label>
            {contactError && <p className="mt-2 text-xs text-red-400">{contactError}</p>}
          </div>

          <div className="border-t border-border py-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text transition-colors hover:bg-primary/15 hover:text-primary"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
