"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import { NFL_TEAMS } from "@/lib/data/nflTeams";
import { CARD_SETS, CONDITIONS } from "@/lib/data/cardCatalog";
import { useParallelsForSet } from "@/lib/hooks/useParallelsForSet";
import { parallelLabel, titleCase } from "@/lib/utils/text";
import { buildTokenOrFilters, tokenizeSearch } from "@/lib/utils/search";
import { catalogRowDisplayLabel, findMultiPlayerKeys } from "@/lib/utils/multiPlayerCard";
import type {
  Card,
  CardCatalogEntry,
  CardCatalogInsertSet,
  CardStatus,
  UserRole,
} from "@/lib/types/database";

const MAX_PHOTOS = 5;

interface PhotoSlot {
  // Stable key for list rendering — a real photo's storage URL, or a
  // random id for a newly picked file that has no URL yet.
  key: string;
  // An already-uploaded storage URL, or an object-URL preview of a file
  // that hasn't been uploaded yet.
  previewUrl: string;
  // Set only for a newly picked file pending upload on submit — absent for
  // an existing photo carried over unchanged from the loaded card.
  file?: File;
}

type CatalogMatch = Pick<
  CardCatalogEntry,
  | "id"
  | "player_name"
  | "team"
  | "set_name"
  | "card_number"
  | "category"
  | "insert_set"
  | "card_title"
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
  // The specific name printed on a multi-player card (e.g. "AFC Rec
  // Leaders"), copied from an exact catalog match — see
  // lib/utils/multiPlayerCard.ts. Null for single-player cards and for a
  // manual Insert Set pick (handleInsertSetChange), since the aggregate
  // insertSetOptions view has no single card_title to offer once several
  // card numbers share one insert_set bracket.
  const [cardTitle, setCardTitle] = useState<string | null>(card?.card_title ?? null);
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
  const [photos, setPhotos] = useState<PhotoSlot[]>(() => {
    const existingUrls = card?.image_urls?.length ? card.image_urls : card?.image_url ? [card.image_url] : [];
    return existingUrls.map((url) => ({ key: url, previewUrl: url }));
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [catalogMatches, setCatalogMatches] = useState<CatalogMatch[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  // Display label per match id — the insert/card name instead of the raw
  // player_name for a real multi-player card (e.g. "AFC REC Leaders"), so a
  // result you found by typing one of its players is still recognizable in
  // the dropdown. See lib/utils/multiPlayerCard.ts.
  const [matchDisplayLabels, setMatchDisplayLabels] = useState<Map<string, string>>(new Map());
  const [insertSetOptions, setInsertSetOptions] = useState<CardCatalogInsertSet[]>([]);
  const suppressLookup = useRef(Boolean(card));
  const suppressSetReset = useRef(Boolean(card));
  const suppressSerialReset = useRef(Boolean(card));

  // Revoke every newly-picked file's object URL on unmount — reads a ref
  // (kept current below) rather than closing over `photos` directly, since
  // an unmount cleanup only needs the latest snapshot, not to re-run on
  // every photo add/remove/reorder.
  const photosRef = useRef<PhotoSlot[]>(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => {
    return () => {
      for (const p of photosRef.current) {
        if (p.file) URL.revokeObjectURL(p.previewUrl);
      }
    };
  }, []);

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
          "id, player_name, team, set_name, card_number, category, insert_set, card_title, is_variation_of_base, is_rookie, is_autograph, is_relic"
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
      setMatchDisplayLabels(new Map());
      return;
    }

    const timeout = setTimeout(async () => {
      let query = supabase
        .from("card_catalog")
        .select(
          "id, player_name, team, set_name, card_number, category, insert_set, card_title, is_variation_of_base, is_rookie, is_autograph, is_relic"
        )
        .eq("needs_review", false);

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
      const diverse = pickDiverseMatches(data ?? []);
      setCatalogMatches(diverse);
      setShowMatches(true);

      // Multi-player detection: the search only matched rows containing
      // the typed token(s), so a 3-player card's other two rows (which
      // don't contain that token anywhere) never made it into `diverse` —
      // a second, narrow lookup restricted to just the (set, insert,
      // card number) combinations actually present in the results is
      // enough to find them, without re-scanning the whole catalog.
      const withInsert = diverse.filter((m) => m.insert_set && m.card_number);
      if (withInsert.length === 0) {
        setMatchDisplayLabels(new Map());
      } else {
        const setNames = Array.from(new Set(withInsert.map((m) => m.set_name)));
        const insertSets = Array.from(new Set(withInsert.map((m) => m.insert_set as string)));
        const cardNumbers = Array.from(new Set(withInsert.map((m) => m.card_number as string)));
        const { data: siblingRows } = await supabase
          .from("card_catalog")
          .select("set_name, insert_set, card_number, player_name")
          .in("set_name", setNames)
          .in("insert_set", insertSets)
          .in("card_number", cardNumbers);
        const multiPlayerKeys = findMultiPlayerKeys(siblingRows ?? []);
        const labels = new Map<string, string>();
        for (const match of diverse) {
          labels.set(match.id, catalogRowDisplayLabel(match, multiPlayerKeys));
        }
        setMatchDisplayLabels(labels);
      }
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName]);

  // Populate the Insert Set dropdown from the real checklist data, scoped
  // to whichever Set is currently chosen. Options are cleared immediately
  // (not just on setName becoming falsy) so a Set switch never briefly
  // shows the previous Set's insert sets while the new fetch is in
  // flight — without this, picking a catalog match from player search
  // (which sets setName + insertSet together) could leave the dropdown
  // listing the old Set's options until the new fetch resolves.
  useEffect(() => {
    setInsertSetOptions([]);
    if (!setName) return;

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
    setCardTitle(null);
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
    setCardTitle(match.card_title ?? null);
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
    // claim to be backed by an exact catalog_id or a specific card_title
    // (several different card numbers can share one insert_set bracket,
    // e.g. "LEAGUE LEADERS", each with its own card_title).
    setCatalogId(null);
    setCardTitle(null);
  }

  function handleAddPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    // Allow picking the same file again later (e.g. after removing it).
    e.target.value = "";
    if (files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - photos.length;
    const toAdd = files.slice(0, remainingSlots).map((file) => ({
      key: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
      file,
    }));
    setPhotos((prev) => [...prev, ...toAdd]);
  }

  function removePhoto(key: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target?.file) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  function movePhoto(key: string, direction: -1 | 1) {
    setPhotos((prev) => {
      const index = prev.findIndex((p) => p.key === key);
      const swapWith = index + direction;
      if (index === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
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

    // Upload every newly-picked photo (in slot order); an existing photo
    // carried over from the loaded card has no `file` and keeps its
    // current storage URL as-is.
    const imageUrls: string[] = [];
    for (const p of photos) {
      if (!p.file) {
        imageUrls.push(p.previewUrl);
        continue;
      }

      const path = `${user.id}/${crypto.randomUUID()}-${p.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("card-photos")
        .upload(path, p.file);

      if (uploadError) {
        setError(uploadError.message);
        setSubmitting(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("card-photos").getPublicUrl(path);
      imageUrls.push(publicUrl);
    }
    // image_url (singular) stays populated as the cover photo for any code
    // still reading the old fallback column — see lib/utils/cardPhotos.ts.
    const imageUrl: string | null = imageUrls[0] ?? null;

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
      card_title: cardTitle,
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
      image_urls: imageUrls,
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
          <label className="mb-1.5 block text-sm font-medium text-text">Photos</label>
          <div className="flex flex-wrap gap-3">
            {photos.map((p, i) => (
              <div
                key={p.key}
                className="relative aspect-[5/7] w-24 overflow-hidden rounded-lg border border-border bg-surface"
              >
                <Image
                  src={p.previewUrl}
                  alt={`Card photo ${i + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-medium text-primary-foreground">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(p.key)}
                  title="Remove photo"
                  className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-text backdrop-blur transition-colors hover:bg-background hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-1 left-1 right-1 flex justify-between">
                  <button
                    type="button"
                    onClick={() => movePhoto(p.key, -1)}
                    disabled={i === 0}
                    title="Move earlier"
                    className="rounded-full bg-background/80 p-1 text-text backdrop-blur transition-colors hover:bg-background hover:text-primary disabled:opacity-0"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePhoto(p.key, 1)}
                    disabled={i === photos.length - 1}
                    title="Move later"
                    className="rounded-full bg-background/80 p-1 text-text backdrop-blur transition-colors hover:bg-background hover:text-primary disabled:opacity-0"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <label
                htmlFor="photos"
                className="flex aspect-[5/7] w-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-surface text-muted hover:border-primary/40"
              >
                <ImagePlus className="h-5 w-5" />
                <span className="px-2 text-center text-[10px]">Add photo</span>
              </label>
            )}
          </div>
          <input
            id="photos"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleAddPhotos}
          />
          <p className="mt-1.5 text-xs text-muted">
            {photos.length >= MAX_PHOTOS
              ? "Maximum 5 photos"
              : `Front, back, close-ups — up to ${MAX_PHOTOS} photos. First photo is the cover shown everywhere else.`}
          </p>
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
                      <span
                        className="block truncate font-medium text-text"
                        title={matchDisplayLabels.get(match.id) ?? match.player_name}
                      >
                        {matchDisplayLabels.get(match.id) ?? match.player_name}
                      </span>
                      <span className="block truncate text-xs text-muted" title={match.team ?? undefined}>
                        {match.team ?? "Team unknown"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className="block truncate text-xs text-text"
                        title={match.insert_set ? titleCase(match.insert_set) : (match.set_name ?? undefined)}
                      >
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
