"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import { NFL_TEAMS } from "@/lib/data/nflTeams";
import { CARD_SETS, PARALLELS, AUTO_PARALLELS, CONDITIONS } from "@/lib/data/cardCatalog";
import { titleCase } from "@/lib/utils/text";
import type {
  Card,
  CardCatalogEntry,
  CardCatalogInsertSet,
  CardStatus,
  UserRole,
} from "@/lib/types/database";

type CatalogMatch = Pick<
  CardCatalogEntry,
  | "id"
  | "player_name"
  | "team"
  | "set_name"
  | "card_number"
  | "category"
  | "insert_set"
  | "is_variation_of_base"
  | "is_autograph"
  | "is_relic"
>;

interface CardFormProps {
  mode: "create" | "edit";
  card?: Card;
}

export function CardForm({ mode, card }: CardFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [playerName, setPlayerName] = useState(card?.player_name ?? "");
  const [team, setTeam] = useState(card?.team ?? "");
  const [setName, setSetName] = useState(card?.set_name ?? "");
  const [insertSet, setInsertSet] = useState(card?.insert_set ?? "");
  const [isVariationOfBase, setIsVariationOfBase] = useState(card?.is_variation_of_base ?? false);
  const [parallel, setParallel] = useState(card?.parallel ?? "");
  const [serialNumber, setSerialNumber] = useState(card?.serial_number ?? "");
  const [printRun, setPrintRun] = useState(card?.print_run != null ? String(card.print_run) : "");
  const [condition, setCondition] = useState(card?.condition ?? "");
  const [isAutograph, setIsAutograph] = useState(card?.is_autograph ?? false);
  const [isRelic, setIsRelic] = useState(card?.is_relic ?? false);
  const [status, setStatus] = useState<CardStatus>(card?.status ?? "personal_collection");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(card?.image_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [catalogMatches, setCatalogMatches] = useState<CatalogMatch[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const [insertSetOptions, setInsertSetOptions] = useState<CardCatalogInsertSet[]>([]);
  const suppressLookup = useRef(Boolean(card));
  const suppressSetReset = useRef(Boolean(card));

  useEffect(() => {
    return () => {
      if (photo && photoPreview) URL.revokeObjectURL(photoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoPreview]);

  // Look up the player against the real Topps checklist (card_catalog) as
  // the user types, so picking a match can auto-fill team + set instead of
  // typing them by hand.
  useEffect(() => {
    if (suppressLookup.current) {
      suppressLookup.current = false;
      return;
    }
    if (playerName.trim().length < 3) {
      setCatalogMatches([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("card_catalog")
        .select(
          "id, player_name, team, set_name, card_number, category, insert_set, is_variation_of_base, is_autograph, is_relic"
        )
        .ilike("player_name", `%${playerName.trim()}%`)
        .order("player_name")
        .limit(8);
      setCatalogMatches(data ?? []);
      setShowMatches(true);
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName]);

  // Populate the Insert Set dropdown from the real checklist data, scoped
  // to whichever Set is currently chosen.
  useEffect(() => {
    if (!setName) {
      setInsertSetOptions([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("card_catalog_insert_sets")
        .select("set_name, insert_set, category, is_variation_of_base, is_autograph, is_relic")
        .eq("set_name", setName)
        .order("insert_set");
      if (!cancelled) setInsertSetOptions(data ?? []);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setName]);

  // Changing the Set manually (not via a catalog pick, and not on initial
  // load of an existing card) means the previous Insert Set / Auto / Relic
  // selections no longer apply.
  useEffect(() => {
    if (suppressSetReset.current) {
      suppressSetReset.current = false;
      return;
    }
    setInsertSet("");
    setIsAutograph(false);
    setIsRelic(false);
    setIsVariationOfBase(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setName]);

  function selectCatalogMatch(match: CatalogMatch) {
    suppressLookup.current = true;
    suppressSetReset.current = true;
    setPlayerName(match.player_name);
    setTeam(match.team ?? "");
    setSetName(match.set_name);
    setInsertSet(match.insert_set ?? "");
    setIsAutograph(match.is_autograph);
    setIsRelic(match.is_relic);
    setIsVariationOfBase(match.is_variation_of_base);
    setShowMatches(false);
    setCatalogMatches([]);
  }

  function handleInsertSetChange(value: string) {
    setInsertSet(value);
    const option = insertSetOptions.find((o) => o.insert_set === value);
    setIsAutograph(option?.is_autograph ?? false);
    setIsRelic(option?.is_relic ?? false);
    setIsVariationOfBase(option?.is_variation_of_base ?? false);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : card?.image_url ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be logged in to save a card.");
      setSubmitting(false);
      return;
    }

    if (mode === "create") {
      // cards.owner_id references profiles(id), not auth.users(id) directly.
      // Accounts created before the on_auth_user_created trigger existed
      // (see schema.sql) have a user in auth.users but no matching profiles
      // row, which would otherwise fail the insert below with a foreign key
      // violation. Self-heal by provisioning the missing profile here.
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        const fallbackUsername = user.email
          ? `${user.email.split("@")[0]}-${user.id.slice(0, 6)}`
          : `user-${user.id.slice(0, 8)}`;

        const { error: profileError } = await supabase.from("profiles").insert({
          id: user.id,
          username: (user.user_metadata?.username as string | undefined) || fallbackUsername,
          role: (user.user_metadata?.role as UserRole | undefined) || "collector",
        });

        if (profileError) {
          setError(profileError.message);
          setSubmitting(false);
          return;
        }
      }
    }

    let imageUrl: string | null = card?.image_url ?? null;

    if (photo) {
      const path = `${user.id}/${crypto.randomUUID()}-${photo.name}`;
      const { error: uploadError } = await supabase.storage
        .from("card-photos")
        .upload(path, photo);

      if (uploadError) {
        setError(uploadError.message);
        setSubmitting(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("card-photos").getPublicUrl(path);
      imageUrl = publicUrl;
    }

    // Keep the original traded_at when the card was already traded and stays
    // traded; only stamp a fresh timestamp on the transition into "traded",
    // and clear it if the status is changed away from "traded".
    let tradedAt: string | null = null;
    if (status === "traded") {
      tradedAt = card?.status === "traded" ? (card.traded_at ?? new Date().toISOString()) : new Date().toISOString();
    }

    const payload = {
      player_name: playerName,
      team: team || null,
      set_name: setName || null,
      insert_set: insertSet || null,
      is_variation_of_base: isVariationOfBase,
      parallel: parallel || null,
      serial_number: serialNumber || null,
      print_run: printRun ? Number(printRun) : null,
      condition: condition || null,
      is_autograph: isAutograph,
      is_relic: isRelic,
      status,
      image_url: imageUrl,
      traded_at: tradedAt,
    };

    const { error: saveError } =
      mode === "edit" && card
        ? await supabase.from("cards").update(payload).eq("id", card.id)
        : await supabase.from("cards").insert({ ...payload, owner_id: user.id });

    if (saveError) {
      setError(saveError.message);
      setSubmitting(false);
      return;
    }

    router.push("/collection");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/collection"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Collection
      </Link>

      <h1 className="text-2xl font-bold text-text">
        {mode === "edit" ? "Edit Card" : "Add a Card"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "edit"
          ? "Update this card's details, photo, or trade status."
          : "Add a card to your collection, or list it as available for trade."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text" htmlFor="photo">
            Photo
          </label>
          <label
            htmlFor="photo"
            className="flex aspect-[5/7] w-40 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface text-muted hover:border-primary/40"
          >
            {photoPreview ? (
              <Image
                src={photoPreview}
                alt="Card preview"
                width={160}
                height={224}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-2 px-4 text-center text-xs">
                <ImagePlus className="h-6 w-6" />
                Upload photo
              </span>
            )}
          </label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        <div className="relative">
          <label htmlFor="playerName" className="mb-1.5 block text-sm font-medium text-text">
            Player name
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              id="playerName"
              required
              autoComplete="off"
              className="pl-9"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onFocus={() => catalogMatches.length > 0 && setShowMatches(true)}
              onBlur={() => setTimeout(() => setShowMatches(false), 150)}
              placeholder="Search the 2025/2026 Topps checklist..."
            />
          </div>
          {showMatches && catalogMatches.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
              {catalogMatches.map((match) => (
                <li key={match.id}>
                  <button
                    type="button"
                    onMouseDown={() => selectCatalogMatch(match)}
                    className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-card"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-text">
                        {match.player_name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {match.team ?? "Team unknown"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block truncate text-xs text-text">
                        {match.insert_set ? titleCase(match.insert_set) : match.set_name}
                      </span>
                      <span className="block text-xs text-muted">
                        {match.card_number ? `#${match.card_number}` : "No card #"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="team" className="mb-1.5 block text-sm font-medium text-text">
              Team
            </label>
            <Select id="team" value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">Select a team</option>
              {NFL_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="setName" className="mb-1.5 block text-sm font-medium text-text">
              Set
            </label>
            <Select id="setName" value={setName} onChange={(e) => setSetName(e.target.value)}>
              <option value="">Select a set</option>
              {CARD_SETS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label htmlFor="insertSet" className="mb-1.5 block text-sm font-medium text-text">
            Insert Set
          </label>
          <Select
            id="insertSet"
            value={insertSet}
            onChange={(e) => handleInsertSetChange(e.target.value)}
            disabled={!setName}
          >
            <option value="">{setName ? "Base (no insert set)" : "Select a set first"}</option>
            {insertSetOptions.map((option) => (
              <option key={option.insert_set} value={option.insert_set}>
                {titleCase(option.insert_set)}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={isAutograph}
              onChange={(e) => setIsAutograph(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-1 focus:ring-primary"
            />
            Autographed
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={isRelic}
              onChange={(e) => setIsRelic(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-1 focus:ring-primary"
            />
            Relic / patch
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="parallel" className="mb-1.5 block text-sm font-medium text-text">
              Parallel
            </label>
            <Select id="parallel" value={parallel} onChange={(e) => setParallel(e.target.value)}>
              <option value="">Select a parallel</option>
              <optgroup label="Parallels">
                {PARALLELS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Autograph parallels">
                {AUTO_PARALLELS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>

          <div>
            <label htmlFor="serialNumber" className="mb-1.5 block text-sm font-medium text-text">
              Serial number
            </label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. 12"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="printRun" className="mb-1.5 block text-sm font-medium text-text">
              Print run
            </label>
            <Input
              id="printRun"
              type="number"
              min={1}
              value={printRun}
              onChange={(e) => setPrintRun(e.target.value)}
              placeholder="e.g. 99"
            />
          </div>

          <div>
            <label htmlFor="condition" className="mb-1.5 block text-sm font-medium text-text">
              Condition
            </label>
            <Select
              id="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="">Select condition</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-text">
            Status
          </label>
          <Select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CardStatus)}
          >
            <option value="personal_collection">Personal Collection</option>
            <option value="for_trade">For Trade</option>
            <option value="traded">Traded</option>
          </Select>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {mode === "edit"
            ? submitting
              ? "Saving changes..."
              : "Save changes"
            : submitting
              ? "Adding card..."
              : "Add card"}
        </button>
      </form>
    </div>
  );
}
