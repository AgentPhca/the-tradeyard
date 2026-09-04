"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { VisibilityToggle } from "@/components/profile/VisibilityToggle";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABEL, SELECTABLE_ROLES } from "@/lib/utils/roles";
import type { Profile, UserRole } from "@/lib/types/database";

interface ProfileFormProps {
  profile: Profile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState(profile.username);
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [roles, setRoles] = useState<UserRole[]>(profile.role);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [twitchUrl, setTwitchUrl] = useState(profile.twitch_url ?? "");
  const [whatnotUrl, setWhatnotUrl] = useState(profile.whatnot_url ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url ?? "");
  const [instagramUrl, setInstagramUrl] = useState(profile.instagram_url ?? "");
  const [ebayUrl, setEbayUrl] = useState(profile.ebay_url ?? "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (avatar && avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarPreview]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAvatar(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : profile.avatar_url);
  }

  function toggleRole(role: UserRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (roles.length === 0) {
      setError("Select at least one role.");
      return;
    }

    setSubmitting(true);

    let avatarUrl = profile.avatar_url;

    if (avatar) {
      const path = `${profile.id}/${crypto.randomUUID()}-${avatar.name}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatar);

      if (uploadError) {
        setError(uploadError.message);
        setSubmitting(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = publicUrl;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username,
        full_name: fullName || null,
        role: roles,
        bio: bio || null,
        twitch_url: twitchUrl || null,
        whatnot_url: whatnotUrl || null,
        website_url: websiteUrl || null,
        instagram_url: instagramUrl || null,
        ebay_url: ebayUrl || null,
        avatar_url: avatarUrl,
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    router.push(`/profile/${username}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-text">Edit Profile</h1>
      <p className="mt-1 text-sm text-muted">Update how other collectors see you.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="avatar">
            Avatar
          </label>
          <label
            htmlFor="avatar"
            className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border bg-surface text-muted hover:border-primary/40"
          >
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar preview"
                width={96}
                height={96}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </label>
          <input
            id="avatar"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div>
          <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-text">
            Username
          </label>
          <Input
            id="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-text">
            Full name
          </label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-text">Role</span>
          <div className="flex flex-wrap items-center gap-6">
            {SELECTABLE_ROLES.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={roles.includes(option)}
                  onChange={() => toggleRole(option)}
                  className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-1 focus:ring-primary"
                />
                {ROLE_LABEL[option]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-text">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell other collectors about yourself..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="twitchUrl" className="mb-1.5 block text-sm font-medium text-text">
            Twitch
          </label>
          <Input
            id="twitchUrl"
            type="url"
            value={twitchUrl}
            onChange={(e) => setTwitchUrl(e.target.value)}
            placeholder="https://twitch.tv/yourname"
          />
        </div>

        <div>
          <label htmlFor="whatnotUrl" className="mb-1.5 block text-sm font-medium text-text">
            Whatnot
          </label>
          <Input
            id="whatnotUrl"
            type="url"
            value={whatnotUrl}
            onChange={(e) => setWhatnotUrl(e.target.value)}
            placeholder="https://whatnot.com/user/yourname"
          />
        </div>

        <div>
          <label htmlFor="websiteUrl" className="mb-1.5 block text-sm font-medium text-text">
            Website
          </label>
          <Input
            id="websiteUrl"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yoursite.com"
          />
        </div>

        <div>
          <label htmlFor="instagramUrl" className="mb-1.5 block text-sm font-medium text-text">
            Instagram
          </label>
          <Input
            id="instagramUrl"
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourname"
          />
        </div>

        <div>
          <label htmlFor="ebayUrl" className="mb-1.5 block text-sm font-medium text-text">
            eBay
          </label>
          <Input
            id="ebayUrl"
            type="url"
            value={ebayUrl}
            onChange={(e) => setEbayUrl(e.target.value)}
            placeholder="https://ebay.com/usr/yourname"
          />
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <VisibilityToggle profileId={profile.id} initialValue={profile.show_personal_collection} />
          <p className="mt-2 text-xs text-muted">
            When on, other users can see the cards in your &ldquo;Personal Collection&rdquo; —
            but they still can&rsquo;t contact you about them. Kontakt is only ever available
            for &ldquo;For Trade&rdquo; cards.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Saving changes..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
