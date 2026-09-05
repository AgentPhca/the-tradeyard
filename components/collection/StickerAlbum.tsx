"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, ChevronUp, ImageOff, Lock } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import { NFL_DIVISIONS } from "@/lib/data/nflDivisions";
import { ownershipKey } from "@/lib/utils/baseyard";
import type { Card, CardCatalogEntry } from "@/lib/types/database";

type BaseCatalogRow = Pick<
  CardCatalogEntry,
  | "id"
  | "set_name"
  | "team"
  | "player_name"
  | "card_number"
  | "is_rookie"
  | "insert_set"
  | "class_segment"
>;

// A row's "tier" for display, e.g. Finest's Common/Uncommon/Rare or
// Signature Class's Rookie Class/Veterans Class — there isn't one single
// column that carries this for every set. Signature Class Football puts it
// cleanly in class_segment ("Rookie Class"/"Veterans Class"); Finest has no
// class_segment at all and instead encodes it as a suffix on insert_set
// ("BASE CARDS COMMON"/"BASE CARDS UNCOMMON"/"BASE CARDS RARE" — verified
// against the real checklist import data). Sets with neither just show no
// badge, which is the expected/correct fallback.
function tierLabel(row: BaseCatalogRow): string | null {
  if (row.class_segment) return row.class_segment;
  const insertSet = row.insert_set?.toUpperCase() ?? "";
  if (insertSet.endsWith("RARE")) return "Rare";
  if (insertSet.endsWith("UNCOMMON")) return "Uncommon";
  if (insertSet.endsWith("COMMON")) return "Common";
  return null;
}

// A subtle diagonal hatch, built from the muted token (#8B949E) rather than
// a flat fill, so a locked slot reads as "not yet collected" without
// looking like an error state.
const lockedPatternStyle = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(139,148,158,0.08) 0px, rgba(139,148,158,0.08) 6px, transparent 6px, transparent 12px)",
};

const tileInactiveClass = "border-border bg-surface text-muted hover:border-primary/40 hover:text-text";
const tileSelectedClass = "border-primary/30 bg-primary/10 text-primary";

interface StickerAlbumProps {
  cards: Card[];
  // Whose album this is — StickerAlbum trusts the `cards` prop is already
  // scoped to this user (as /collection/page.tsx and the profile page both
  // do), but re-filters by it anyway rather than assuming: this component
  // is now reachable from a "viewing someone else's data" context (a
  // visitor's read-only view on a public profile), which is exactly the
  // kind of boundary worth double-checking at.
  targetUserId: string;
  // Read-only mode for a visitor browsing another user's public BaseYard:
  // empty slots render as plain locked tiles instead of a link to Add Card
  // (a visitor can't add cards to someone else's collection), everything
  // else — Set/Division/Team browsing, owned-card tiles, progress bar —
  // stays interactive.
  readOnly?: boolean;
}

// BaseYard's "sticker album" mode: a full Set+Team checklist pulled from
// card_catalog (category='Base'), with the user's own cards overlaid onto
// the slots they've filled. This is deliberately a from-scratch UI rather
// than the normal filter-bar + card grid the other yards use — a checklist
// needs to show *every* catalog slot (owned or not), not just the cards the
// user actually has.
export function StickerAlbum({ cards, targetUserId, readOnly = false }: StickerAlbumProps) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ownCards = useMemo(
    () => cards.filter((c) => c.owner_id === targetUserId),
    [cards, targetUserId]
  );

  // Set/Team live in the URL (?baseSet=&baseTeam=) rather than being purely
  // local state, so returning here — e.g. after saving a card added from an
  // empty slot — lands back on the exact same checklist instead of
  // resetting to the "best owned set" default.
  const urlSet = searchParams.get("baseSet") ?? "";
  const urlTeam = searchParams.get("baseTeam") ?? "";

  const [rows, setRows] = useState<BaseCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [setName, setSetName] = useState(urlSet);
  const [team, setTeam] = useState(urlTeam);
  const [activeDivision, setActiveDivision] = useState<string | null>(() => {
    if (!urlTeam) return null;
    const division = NFL_DIVISIONS.find((d) => d.teams.some((t) => t === urlTeam));
    return division?.name ?? null;
  });
  const [defaultSetPicked, setDefaultSetPicked] = useState(Boolean(urlSet));

  function updateStickerParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, {
      scroll: false,
    });
  }

  // Fetched once — every Base-category catalog row, across all sets. A few
  // thousand rows at most, and it's a one-time load rather than a query per
  // Set/Team click, which keeps switching between sets/teams instant.
  //
  // is_variation_of_base = false excludes photo-variation rows (e.g. "TEAM
  // CAMO VARIATION", "LIGHTBOARD LOGO VARIATION") that the checklist import
  // also tagged category='Base' — without this, the same player/card_number
  // shows up 2-3x (once per variation) instead of once per real checklist
  // slot.
  //
  // Explicitly paginated with .range() rather than one .limit(10000) call —
  // a single request was still silently getting cut off well under 10000
  // (confirmed by counting the real import data: Chrome Black+Chrome+Cosmic
  // Chrome+Finest together total ~1,846 Base rows and were the only ones
  // showing up; Resurgence+Signature Class+Flagship, everything after that
  // in set_name order, were missing entirely — a client-side .limit() can't
  // raise a cap the server itself is enforcing, e.g. PostgREST's db-max-rows
  // project setting). Paging in chunks of 1000 sidesteps whatever that cap
  // actually is, since no single request asks for more than that.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const pageSize = 1000;
      const allRows: BaseCatalogRow[] = [];
      let from = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data } = await supabase
          .from("card_catalog")
          .select("id, set_name, team, player_name, card_number, is_rookie, insert_set, class_segment")
          .eq("category", "Base")
          .eq("is_variation_of_base", false)
          .order("set_name")
          .order("team")
          .order("player_name")
          .order("card_number")
          .range(from, from + pageSize - 1);

        const page = data ?? [];
        allRows.push(...page);
        if (cancelled || page.length < pageSize) break;
        from += pageSize;
      }

      if (!cancelled) {
        setRows(allRows);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rows) seen.add(row.set_name);
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Default to the Base-eligible set the user already owns the most cards
  // in, falling back to alphabetically first once the catalog rows (and
  // therefore the set list) have loaded.
  useEffect(() => {
    if (defaultSetPicked || setOptions.length === 0) return;

    const ownedCountBySet = new Map<string, number>();
    for (const c of ownCards) {
      if (!c.set_name) continue;
      ownedCountBySet.set(c.set_name, (ownedCountBySet.get(c.set_name) ?? 0) + 1);
    }

    const bestOwned = setOptions
      .map((s) => ({ set: s, owned: ownedCountBySet.get(s) ?? 0 }))
      .sort((a, b) => b.owned - a.owned)[0];

    setSetName(bestOwned && bestOwned.owned > 0 ? bestOwned.set : setOptions[0]);
    setDefaultSetPicked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setOptions, defaultSetPicked]);

  function handleSetChange(value: string) {
    setSetName(value);
    setTeam("");
    setActiveDivision(null);
    updateStickerParams({ baseSet: value, baseTeam: "" });
  }

  // Single-open accordion: clicking the already-active division collapses
  // it (the team it had selected, if any, is left as-is — collapsing is
  // just tidying up the picker, not undoing the pick). Clicking a
  // different division opens it and clears the team selection, since
  // "no team chosen yet" is exactly the state right after a division
  // switch.
  function handleDivisionClick(divisionName: string) {
    if (activeDivision === divisionName) {
      setActiveDivision(null);
    } else {
      setActiveDivision(divisionName);
      setTeam("");
      updateStickerParams({ baseTeam: "" });
    }
  }

  function handleTeamClick(t: string) {
    const next = team === t ? "" : t;
    setTeam(next);
    updateStickerParams({ baseSet: setName, baseTeam: next });
  }

  const rowsInSet = useMemo(
    () => rows.filter((row) => row.set_name === setName),
    [rows, setName]
  );

  const checklist = useMemo(
    () => (team ? rowsInSet.filter((row) => row.team === team) : []),
    [rowsInSet, team]
  );

  const ownedByKey = useMemo(() => {
    const map = new Map<string, Card>();
    for (const c of ownCards) {
      if (c.category !== "Base" || !c.set_name) continue;
      const key = ownershipKey(c.player_name, c.team, c.set_name);
      if (!map.has(key)) map.set(key, c);
    }
    return map;
  }, [ownCards]);

  function findOwnedCard(row: BaseCatalogRow) {
    return ownedByKey.get(ownershipKey(row.player_name, row.team, row.set_name));
  }

  const ownedCount = useMemo(
    () => checklist.filter((row) => findOwnedCard(row)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checklist, ownedByKey]
  );
  const progressPct = checklist.length > 0 ? Math.round((ownedCount / checklist.length) * 100) : 0;

  if (loading) {
    return <p className="text-sm text-muted">Loading checklist...</p>;
  }

  if (setOptions.length === 0) {
    return (
      <p className="text-sm text-muted">
        No Base checklist data is available yet for any set.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="stickerSet" className="mb-1.5 block text-sm font-medium text-text">
          Set
        </label>
        <Select id="stickerSet" value={setName} onChange={(e) => handleSetChange(e.target.value)}>
          {setOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <div className="mb-2 grid grid-cols-4 gap-2">
        {NFL_DIVISIONS.map((division) => {
          const active = activeDivision === division.name;
          return (
            <button
              key={division.name}
              type="button"
              onClick={() => handleDivisionClick(division.name)}
              className={`flex items-center justify-between gap-1 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-[#14532D] text-primary"
                  : "border-border bg-surface text-muted hover:border-primary/40 hover:text-text"
              }`}
            >
              <span className="truncate">{division.name}</span>
              {active ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {activeDivision && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-[#0F1520] p-3">
          <div className="grid grid-cols-4 gap-2">
            {NFL_DIVISIONS.find((d) => d.name === activeDivision)?.teams.map((t) => {
              const selected = team === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTeamClick(t)}
                  className={`truncate rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                    selected ? tileSelectedClass : tileInactiveClass
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!team ? (
        <p className="text-sm text-muted">Select a team above to see its checklist.</p>
      ) : (
        <>
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-text">
                {ownedCount} / {checklist.length} collected
              </span>
              <span className="text-muted">{progressPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {checklist.map((row) => {
              const ownedCard = findOwnedCard(row);
              const tier = tierLabel(row);

              if (ownedCard) {
                return (
                  <Link
                    key={row.id}
                    href={`/collection/${ownedCard.id}`}
                    className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
                  >
                    <div className="relative aspect-[5/7] w-full bg-surface">
                      {ownedCard.image_url ? (
                        <Image
                          src={ownedCard.image_url}
                          alt={`${row.player_name} card`}
                          fill
                          sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageOff className="h-6 w-6 text-muted" />
                        </div>
                      )}
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="truncate text-xs font-medium text-text">{row.player_name}</p>
                      <div className="mt-0.5 flex items-center gap-1">
                        {row.card_number && (
                          <span className="text-[10px] text-muted">#{row.card_number}</span>
                        )}
                        {tier && (
                          <span className="inline-flex items-center truncate rounded-full border border-primary/30 bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                            {tier}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              }

              const lockedTileContent = (
                <>
                  <div
                    className="flex aspect-[5/7] w-full items-center justify-center"
                    style={lockedPatternStyle}
                  >
                    <Lock className="h-5 w-5 text-muted" />
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="truncate text-xs text-muted">{row.player_name}</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      {row.card_number && (
                        <span className="text-[10px] text-muted">#{row.card_number}</span>
                      )}
                      {tier && (
                        <span className="inline-flex items-center truncate rounded-full border border-primary/30 bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                          {tier}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              );

              // Read-only (a visitor browsing someone else's BaseYard) can't
              // add cards to someone else's collection, so an empty slot is
              // just a static tile there instead of a link to Add Card.
              if (readOnly) {
                return (
                  <div
                    key={row.id}
                    className="flex flex-col overflow-hidden rounded-lg border border-dashed border-border bg-surface"
                  >
                    {lockedTileContent}
                  </div>
                );
              }

              return (
                <Link
                  key={row.id}
                  href={`/collection/add?catalogId=${row.id}&set=${encodeURIComponent(setName)}&team=${encodeURIComponent(team)}`}
                  className="flex flex-col overflow-hidden rounded-lg border border-dashed border-border bg-surface transition-colors hover:border-primary/40"
                >
                  {lockedTileContent}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
