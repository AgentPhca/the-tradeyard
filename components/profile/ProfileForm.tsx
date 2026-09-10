"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { VisibilityToggle } from "@/components/profile/VisibilityToggle";
import { createClient } from "@/lib/supabase/client";
import { NFL_TEAMS } from "@/lib/data/nflTeams";
import { buildTokenOrFilters, tokenizeSearch } from "@/lib/utils/search";
import { ROLE_LABEL, SELECTABLE_ROLES } from "@/lib/utils/roles";
import type { Profile, UserRole } from "@/lib/types/database";

const PLAYER_SEARCH_MAX_RESULTS = 12;

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

  const [teamYard, setTeamYard] = useState(profile.personal_team_yard ?? "");
  const [playerYard, setPlayerYard] = useState(profile.personal_player_yard ?? "");
  const [playerYardMatches, setPlayerYardMatches] = useState<string[]>([]);
  const [showPlayerYardMatches, setShowPlayerYardMatches] = useState(false);

  useEffect(() => {
    return () => {
      if (avatar && avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarPreview]);

  // Debounced player-name search against the card catalog, same
  // token-substring matching CardForm's own player search uses — but
  // simpler, since a Personal Yard just needs an existing player_name
  // string, not a specific printed card to prefill from.
  useEffect(() => {
    const tokens = tokenizeSearch(playerYard);
    if (playerYard.trim().length < 3 || tokens.length === 0) {
      setPlayerYardMatches([]);
      return;
    }

    const timeout = setTimeout(async () => {
      let query = supabase.from("card_catalog").select("player_name").limit(300);
      for (const filter of buildTokenOrFilters(tokens, ["player_name"])) {
        query = query.or(filter);
      }
      const { data } = await query;
      const distinct = Array.from(new Set((data ?? []).map((row) => row.player_name))).sort((a, b) =>
        a.localeCompare(b)
      );
      setPlayerYardMatches(distinct.slice(0, PLAYER_SEARCH_MAX_RESULTS));
      // CardForm's equivalent search does this too (see selectCatalogMatch's
      // sibling effect) — without it, the dropdown never (re-)opens once new
      // async matches land, since onFocus only flips it on for whatever
      // matches already existed at focus time (typically none yet).
      setShowPlayerYardMatches(true);
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerYard]);

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

    const trimmedPlayerYard = playerYard.trim();
    if (trimmedPlayerYard) {
      // playerYard is freetext (typed, or picked from the search dropdown),
      // not a constrained <select> like teamYard — validate it matches a
      // real card_catalog player before saving, so a typo or an
      // unconfirmed in-progress search term never silently becomes an
      // unmatchable PlayerYard (0 owned/0 total forever).
      const { data: playerMatch } = await supabase
        .from("card_catalog")
        .select("player_name")
        .eq("player_name", trimmedPlayerYard)
        .limit(1)
        .maybeSingle();

      if (!playerMatch) {
        setError(
          `"${trimmedPlayerYard}" wurde nicht im Katalog gefunden — bitte einen Namen aus den Vorschlägen auswählen.`
        );
        return;
      }
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
        personal_team_yard: teamYard || null,
        personal_player_yard: trimmedPlayerYard || null,
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
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
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

        <div className="rounded-md border border-border bg-surface p-4">
          <VisibilityToggle
            profileId={profile.id}
            initialValue={profile.show_baseyard_publicly}
            field="show_baseyard_publicly"
          />
          <p className="mt-2 text-xs text-muted">
            When on, a separate &ldquo;BaseYard&rdquo; section appears on your public
            profile showing your Base set-completion progress — independent of your
            Personal Collection setting above.
          </p>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <VisibilityToggle
            profileId={profile.id}
            initialValue={profile.show_insertyard_publicly}
            field="show_insertyard_publicly"
          />
          <p className="mt-2 text-xs text-muted">
            When on, a separate &ldquo;InsertYard&rdquo; section appears on your public
            profile showing your Insert Set completion progress — independent of the
            settings above.
          </p>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-medium text-text">Personal Yards</p>

          <div className="mb-4">
            <label htmlFor="teamYard" className="mb-1.5 block text-sm font-medium text-text">
              Team
            </label>
            <Select id="teamYard" value={teamYard} onChange={(e) => setTeamYard(e.target.value)}>
              <option value="">— Kein Team —</option>
              {NFL_TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </Select>
            <div className="mt-2">
              <VisibilityToggle
                profileId={profile.id}
                initialValue={profile.show_teamyard_publicly}
                field="show_teamyard_publicly"
              />
            </div>
          </div>

          <div className="relative">
            <label htmlFor="playerYard" className="mb-1.5 block text-sm font-medium text-text">
              Spieler
            </label>
            <Input
              id="playerYard"
              autoComplete="off"
              value={playerYard}
              onChange={(e) => setPlayerYard(e.target.value)}
              onFocus={() => playerYardMatches.length > 0 && setShowPlayerYardMatches(true)}
              onBlur={() => setTimeout(() => setShowPlayerYardMatches(false), 150)}
              placeholder="Spielername suchen..."
            />
            {showPlayerYardMatches && playerYardMatches.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
                {playerYardMatches.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onMouseDown={() => {
                        setPlayerYard(name);
                        setShowPlayerYardMatches(false);
                      }}
                      className="block w-full truncate px-3 py-2 text-left text-sm text-text hover:bg-card"
                      title={name}
                    >
                      {name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2">
              <VisibilityToggle
                profileId={profile.id}
                initialValue={profile.show_playeryard_publicly}
                field="show_playeryard_publicly"
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-muted">
            Ein TeamYard oder PlayerYard baut dir ein eigenes Stickeralbum aus dem Katalog —
            beide unabhängig voneinander, du kannst auch beide gleichzeitig setzen.
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
