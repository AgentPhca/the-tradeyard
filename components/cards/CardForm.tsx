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
import { CARD_SETS, CONDITIONS } from "@/lib/data/cardCatalog";
import { useParallelsForSet } from "@/lib/hooks/useParallelsForSet";
import { parallelLabel, titleCase } from "@/lib/utils/text";
import { buildTokenOrFilters, tokenizeSearch } from "@/lib/utils/search";
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
  | "is_rookie"
  | "is_autograph"
  | "is_relic"
>;

// Raw rows to pull per search: player_name is stored "First Last", so a
// common-surname search (e.g. "Williams") matches every player with that
// surname, ordered alphabetically by full name. A single popular rookie
// can have dozens of catalog rows (one per insert set/parallel/autograph
// variant across all 7 sets) — measured up to 95 for one player alone —
// so the raw fetch has to be big enough to read past that one player's
// whole block and reach the next different one.
const CATALOG_SEARCH_RAW_LIMIT = 300;
// Of the (up to 20) distinct players found, how many total rows to show —
// keeps the dropdown scannable while still surfacing several variants for
// a narrow/specific search that only matches one or two real players.
const CATALOG_SEARCH_MAX_PLAYERS = 20;
const CATALOG_SEARCH_MAX_ROWS = 25;

// Groups raw catalog rows by player identity (name + team, in case two
// different real people share a name) and round-robins across players
// when building the final list — round 1 gives every distinct player
// their first row before anyone gets a second, so a high-volume player
// can't crowd the dropdown with just their own variants and hide every
// other same-surname player. A search that only matches one or two real
// players still naturally fills up to CATALOG_SEARCH_MAX_ROWS from them,
// since round-robin just keeps cycling through however many players
// there are.
function pickDiverseMatches(rawMatches: CatalogMatch[]): CatalogMatch[] {
  const byPlayer = new Map<string, CatalogMatch[]>();
  for (const match of rawMatches) {
    const key = `${match.player_name}|${match.team ?? ""}`;
    const group = byPlayer.get(key);
    if (group) group.push(match);
    else byPlayer.set(key, [match]);
  }

  const players = Array.from(byPlayer.values()).slice(0, CATALOG_SEARCH_MAX_PLAYERS);

  const result: CatalogMatch[] = [];
  for (let round = 0; result.length < CATALOG_SEARCH_MAX_ROWS; round++) {
    let addedAny = false;
    for (const rows of players) {
      if (round >= rows.length) continue;
      result.push(rows[round]);
      addedAny = true;
      if (result.length >= CATALOG_SEARCH_MAX_ROWS) break;
    }
    if (!addedAny) break;
  }

  return result;
}

// Columns a search token is allowed to match against — lets a query like
// "Drake Maye Flagship" find rows where "Drake"/"Maye" match player_name
// and "Flagship" matches set_name, without requiring every token to hit
// the same column. card_number lets the printed number on the card (e.g.
// "VT-17") be searched directly, alone or combined with a player/set
// token — hyphens in values like "VT-17"/"RV-1" have no special meaning
// in an ilike pattern, so no extra escaping is needed for them.
const CATALOG_SEARCH_COLUMNS = [
  "player_name",
  "team",
  "set_name",
  "insert_set",
  "card_number",
] as const;

interface CardFormProps {
  mode: "create" | "edit";
  card?: Card;
  // A card_catalog row id to prefill from on load (e.g. clicking an empty
  // BaseYard sticker-album slot links here as ?catalogId=<row.id>). Reuses
  // the exact same prefill path as picking a player-search result.
  initialCatalogId?: string;
  // Where to navigate after a successful save. Defaults to /collection —
  // Add Card passes the BaseYard Set+Team the user came from (if any) so
  // saving doesn't strand them back on the generic collection view.
  returnTo?: string;
}

export function CardForm({ mode, card, initialCatalogId, returnTo }: CardFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [playerName, setPlayerName] = useState(card?.player_name ?? "");
  const [team, setTeam] = useState(card?.team ?? "");
  const [cardNumber, setCardNumber] = useState(card?.card_number ?? "");
  const [setName, setSetName] = useState(card?.set_name ?? "");
  const [insertSet, setInsertSet] = useState(card?.insert_set ?? "");
  const [isVariationOfBase, setIsVariationOfBase] = useState(card?.is_variation_of_base ?? false);
  const [parallel, setParallel] = useState(card?.parallel ?? "");
  const [tier, setTier] = useState("");
  const [baseType, setBaseType] = useState("");
  const [serialNumber, setSerialNumber] = useState(card?.serial_number ?? "");
  const [printRun, setPrintRun] = useState(card?.print_run != null ? String(card.print_run) : "");
  const [condition, setCondition] = useState(card?.condition ?? "");
  const [isRookie, setIsRookie] = useState(card?.is_rookie ?? false);
  const [isAutograph, setIsAutograph] = useState(card?.is_autograph ?? false);
  const [isRelic, setIsRelic] = useState(card?.is_relic ?? false);
  const [category, setCategory] = useState<string | null>(card?.category ?? null);
  // The exact card_catalog row this card was created from — set only when
  // the user picks a player-search result (selectCatalogMatch), never
  // guessed at afterwards. Stays null for the "Other"/free-text path or a
  // search with no match, same as category/is_rookie in that case.
  const [catalogId, setCatalogId] = useState<string | null>(card?.catalog_id ?? null);
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
  const suppressSerialReset = useRef(Boolean(card));

  useEffect(() => {
    return () => {
      if (photo && photoPreview) URL.revokeObjectURL(photoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoPreview]);

  // Prefill from a specific card_catalog row on load (?catalogId= from the
  // BaseYard sticker album's empty slots) — fetches that one row and feeds
  // it through selectCatalogMatch(), the exact same path a player-search
  // pick uses, so card_number/is_rookie/category/catalog_id all come from
  // it consistently.
  useEffect(() => {
    if (!initialCatalogId || mode !== "create") return;

    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("card_catalog")
        .select(
          "id, player_name, team, set_name, card_number, category, insert_set, is_variation_of_base, is_rookie, is_autograph, is_relic"
        )
        .eq("id", initialCatalogId)
        .maybeSingle();
      if (!cancelled && data) selectCatalogMatch(data);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Look up the player against the real Topps checklist (card_catalog) as
  // the user types, so picking a match can auto-fill team + set instead of
  // typing them by hand. Substring match (not prefix) is deliberate:
  // player_name is stored "First Last", so a prefix-only search for a
  // surname like "Williams" would never match anything at all.
  //
  // The input is split into whitespace-separated tokens, and a row only
  // counts as a match if EVERY token hits somewhere across player_name /
  // team / set_name / insert_set (not necessarily the same column) — so
  // "Drake Maye Flagship" finds "Drake"+"Maye" in player_name AND
  // "Flagship" in set_name, letting a set/team name narrow a player
  // search instead of just being ignored or (worse) required to also
  // appear in player_name where it never would.
  useEffect(() => {
    if (suppressLookup.current) {
      suppressLookup.current = false;
      return;
    }
    const tokens = tokenizeSearch(playerName);
    if (playerName.trim().length < 3 || tokens.length === 0) {
      setCatalogMatches([]);
      return;
    }

    const timeout = setTimeout(async () => {
      let query = supabase
        .from("card_catalog")
        .select(
          "id, player_name, team, set_name, card_number, category, insert_set, is_variation_of_base, is_rookie, is_autograph, is_relic"
        );

      for (const filter of buildTokenOrFilters(tokens, CATALOG_SEARCH_COLUMNS)) {
        query = query.or(filter);
      }

      const { data } = await query
        .order("player_name")
        // Deterministic tie-break for same-player rows, rather than
        // relying on whatever order Postgres happens to return ties in.
        // A side benefit: "2025 Topps Chrome Black Football" sorts first
        // alphabetically among all 7 sets, so a prolific player's Chrome
        // Black row lands early within their own group instead of being
        // pushed past CATALOG_SEARCH_MAX_ROWS by older/larger sets.
        .order("set_name")
        .order("card_number")
        .limit(CATALOG_SEARCH_RAW_LIMIT);
      setCatalogMatches(pickDiverseMatches(data ?? []));
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
  // / Parallel / Tier / Base Type selections no longer apply.
  useEffect(() => {
    if (suppressSetReset.current) {
      suppressSetReset.current = false;
      return;
    }
    setInsertSet("");
    setIsRookie(false);
    setIsAutograph(false);
    setIsRelic(false);
    setIsVariationOfBase(false);
    setCategory(null);
    setCatalogId(null);
    setParallel("");
    setTier("");
    setBaseType("");
    setPrintRun("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setName]);

  const hasPrintRun = printRun !== "" && Number(printRun) > 0;

  // "Numbered #" (serial_number) means nothing without a print run, so
  // clearing Print Run clears it too — but not on the initial load of an
  // existing card. A card can have serial_number set with print_run empty
  // as a data relic from before this coupling existed; loading that card
  // into the form shouldn't silently wipe it, only a live edit that
  // empties Print Run should.
  useEffect(() => {
    if (suppressSerialReset.current) {
      suppressSerialReset.current = false;
      return;
    }
    if (!hasPrintRun) {
      setSerialNumber("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printRun]);

  const { parallels: filteredParallels, isFinestSet, isSignatureClassSet } = useParallelsForSet(
    setName,
    tier,
    baseType
  );

  const parallelDisabled =
    !setName || (isFinestSet && !tier) || (isSignatureClassSet && !baseType);

  const parallelPlaceholder = !setName
    ? "Select a set first"
    : isFinestSet && !tier
      ? "Select a tier first"
      : isSignatureClassSet && !baseType
        ? "Select a base type first"
        : "Select a parallel";

  function handleParallelChange(value: string) {
    setParallel(value);
    const option = filteredParallels.find((p) => p.parallel_name === value);
    setPrintRun(option?.print_run != null ? String(option.print_run) : "");
  }

  function selectCatalogMatch(match: CatalogMatch) {
    suppressLookup.current = true;
    suppressSetReset.current = true;
    setPlayerName(match.player_name);
    setTeam(match.team ?? "");
    setCardNumber(match.card_number ?? "");
    setSetName(match.set_name);
    setInsertSet(match.insert_set ?? "");
    setIsRookie(match.is_rookie);
    setIsAutograph(match.is_autograph);
    setIsRelic(match.is_relic);
    setIsVariationOfBase(match.is_variation_of_base);
    setCategory(match.category);
    setCatalogId(match.id);
    setShowMatches(false);
    setCatalogMatches([]);
  }

  function handleInsertSetChange(value: string) {
    setInsertSet(value);
    const option = insertSetOptions.find((o) => o.insert_set === value);
    setIsAutograph(option?.is_autograph ?? false);
    setIsRelic(option?.is_relic ?? false);
    setIsVariationOfBase(option?.is_variation_of_base ?? false);
    setCategory(option?.category ?? null);
    // card_catalog_insert_sets is a set-level aggregate view, not one
    // specific card_catalog row, so a manual Insert Set pick can no longer
    // claim to be backed by an exact catalog_id.
    setCatalogId(null);
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
          role: [(user.user_metadata?.role as UserRole | undefined) || "collector"],
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
      card_number: cardNumber || null,
      set_name: setName || null,
      insert_set: insertSet || null,
      is_variation_of_base: isVariationOfBase,
      is_rookie: isRookie,
      parallel: parallel || null,
      serial_number: serialNumber || null,
      print_run: printRun ? Number(printRun) : null,
      condition: condition || null,
      is_autograph: isAutograph,
      is_relic: isRelic,
      category,
      catalog_id: catalogId,
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

    router.push(returnTo ?? "/collection");
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
          <label htmlFor="cardNumber" className="mb-1.5 block text-sm font-medium text-text">
            Card Number
          </label>
          <Input
            id="cardNumber"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="e.g. 88 or RC-15"
          />
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

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={isRookie}
              onChange={(e) => setIsRookie(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-1 focus:ring-primary"
            />
            Rookie
          </label>
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
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={category === "Base"}
              onChange={(e) => setCategory(e.target.checked ? "Base" : null)}
              className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-1 focus:ring-primary"
            />
            Base Set
          </label>
        </div>

        {isFinestSet && (
          <div>
            <label htmlFor="tier" className="mb-1.5 block text-sm font-medium text-text">
              Tier
            </label>
            <Select
              id="tier"
              value={tier}
              onChange={(e) => {
                setTier(e.target.value);
                setParallel("");
                setPrintRun("");
              }}
            >
              <option value="">Select a tier</option>
              <option value="Common">Common</option>
              <option value="Uncommon">Uncommon</option>
              <option value="Rare">Rare</option>
            </Select>
          </div>
        )}

        {isSignatureClassSet && (
          <div>
            <label htmlFor="baseType" className="mb-1.5 block text-sm font-medium text-text">
              Base Type
            </label>
            <Select
              id="baseType"
              value={baseType}
              onChange={(e) => {
                setBaseType(e.target.value);
                setParallel("");
                setPrintRun("");
              }}
            >
              <option value="">Select a base type</option>
              <option value="Chrome">Chrome</option>
              <option value="Paper">Paper</option>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="parallel" className="mb-1.5 block text-sm font-medium text-text">
              Parallel
            </label>
            <Select
              id="parallel"
              value={parallel}
              onChange={(e) => handleParallelChange(e.target.value)}
              disabled={parallelDisabled}
            >
              <option value="">{parallelPlaceholder}</option>
              {filteredParallels.map((p) => (
                <option key={p.id} value={p.parallel_name}>
                  {parallelLabel(p)}
                </option>
              ))}
            </Select>
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
              placeholder="e.g. 99 — leave blank if unnumbered"
            />
          </div>

          <div>
            <label htmlFor="serialNumber" className="mb-1.5 block text-sm font-medium text-text">
              Numbered #
            </label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="e.g. 10"
              disabled={!hasPrintRun}
            />
            <p className="mt-1 text-xs text-muted">
              {hasPrintRun
                ? `Will show as ${serialNumber || "10"}/${printRun}`
                : "Enter a print run first"}
            </p>
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
