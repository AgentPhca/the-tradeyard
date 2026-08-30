"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/types/database";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "collector", label: "Collector" },
  { value: "retailer", label: "Retailer" },
  { value: "streamer", label: "Streamer" },
];

interface ProfileFormProps {
  profile: Profile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState(profile.username);
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [role, setRole] = useState<UserRole>(profile.role);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [twitchUrl, setTwitchUrl] = useState(profile.twitch_url ?? "");
  const [whatnotUrl, setWhatnotUrl] = useState(profile.whatnot_url ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.website_url ?? "");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

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
        role,
        bio: bio || null,
        twitch_url: twitchUrl || null,
        whatnot_url: whatnotUrl || null,
        website_url: websiteUrl || null,
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

        <div className="grid grid-cols-2 gap-4">
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
            <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-text">
              Role
            </label>
            <Select id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
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

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Saving changes..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
