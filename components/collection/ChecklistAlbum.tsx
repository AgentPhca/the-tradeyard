"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, ChevronUp, ImageOff, Lock } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import { NFL_DIVISIONS } from "@/lib/data/nflDivisions";
import { insertOwnershipKey, ownershipKey } from "@/lib/utils/checklist";
import type { Card, CardCatalogEntry } from "@/lib/types/database";

type ChecklistCatalogRow = Pick<
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
// against the real checklist import data). Rows with neither just show no
// badge, which is the expected/correct fallback — true of most Insert rows.
function tierLabel(row: ChecklistCatalogRow): string | null {
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

type ChecklistMode = "base" | "insert";

interface ChecklistAlbumProps {
  cards: Card[];
  // Whose album this is — ChecklistAlbum trusts the `cards` prop is already
  // scoped to this user (as /collection/page.tsx and the profile page both
  // do), but re-filters by it anyway rather than assuming: this component
  // is reachable from a "viewing someone else's data" context (a visitor's
  // read-only view on a public profile), which is exactly the kind of
  // boundary worth double-checking at.
  targetUserId: string;
  // Read-only mode for a visitor browsing another user's public Base/Insert
  // Yard: empty slots render as plain locked tiles instead of a link to Add
  // Card (a visitor can't add cards to someone else's collection),
  // everything else — Set/Team or Set/Insert-Set browsing, owned-card
  // tiles, progress bar — stays interactive.
  readOnly?: boolean;
  // "base": BaseYard — Set, then NFL division/team, checklist scoped to
  // category='Base'. "insert": InsertYard — Set, then Insert Set (no team
  // level, insert sets aren't team-organized), checklist scoped to
  // insert_set is not null and category <> 'Base'.
  mode: ChecklistMode;
}

// The checklist-style yards (BaseYard, InsertYard): a full Set(+grouping)
// checklist pulled from card_catalog, with the user's own cards overlaid
// onto the slots they've filled. This is deliberately a from-scratch UI
// rather than the normal filter-bar + card grid the other yards use — a
// checklist needs to show *every* catalog slot (owned or not), not just the
// cards the user actually has.
export function ChecklistAlbum({ cards, targetUserId, readOnly = false, mode }: ChecklistAlbumProps) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ownCards = useMemo(
    () => cards.filter((c) => c.owner_id === targetUserId),
    [cards, targetUserId]
  );

  // Set/grouping live in the URL rather than being purely local state, so
  // returning here — e.g. after saving a card added from an empty slot —
  // lands back on the exact same checklist instead of resetting to the
  // "best owned set" default. BaseYard and InsertYard use distinct param
  // names so switching between the two yards (or having both linked to from
  // elsewhere) never collides.
  const setParamKey = mode === "base" ? "baseSet" : "insertYardSet";
  const groupParamKey = mode === "base" ? "baseTeam" : "insertYardInsert";

  const urlSet = searchParams.get(setParamKey) ?? "";
  const urlGroup = searchParams.get(groupParamKey) ?? "";

  const [rows, setRows] = useState<ChecklistCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [setName, setSetName] = useState(urlSet);
  // "Team" for BaseYard, "Insert Set" for InsertYard.
  const [groupValue, setGroupValue] = useState(urlGroup);
  const [activeDivision, setActiveDivision] = useState<string | null>(() => {
    if (mode !== "base" || !urlGroup) return null;
    const division = NFL_DIVISIONS.find((d) => d.teams.some((t) => t === urlGroup));
    return division?.name ?? null;
  });
  const [defaultSetPicked, setDefaultSetPicked] = useState(Boolean(urlSet));

  function updateAlbumParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, {
      scroll: false,
    });
  }

  // Fetched once — every catalog row this yard's checklist can ever need,
  // across all sets. A few thousand rows at most, and it's a one-time load
  // rather than a query per Set/grouping click, which keeps switching
  // instant.
  //
  // BaseYard: category='Base', is_variation_of_base=false excludes
  // photo-variation rows (e.g. "TEAM CAMO VARIATION") that the checklist
  // import also tagged category='Base' — without this, the same
  // player/card_number shows up 2-3x instead of once per real checklist
  // slot.
  // InsertYard: insert_set is not null and category<>'Base' — the plain
  // base checklist rows are tagged insert_set='BASE CARDS' in the source
  // data, so category is what actually distinguishes "a real insert set"
  // from "the base checklist", not insert_set alone. Guards the category
  // comparison against null the same null-safe way as everywhere else in
  // this app (NULL <> 'Base' is NULL, not true, in SQL's three-valued
  // logic — a plain .neq() would silently drop any row with no category at
  // all).
  //
  // Explicitly paginated with .range() rather than one .limit(10000) call —
  // a single request was still silently getting cut off well under 10000
  // (confirmed against the real import data — see git history). Paging in
  // chunks of 1000 sidesteps whatever cap the server enforces, since no
  // single request asks for more than that.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const pageSize = 1000;
      const allRows: ChecklistCatalogRow[] = [];
      let from = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        let query = supabase
          .from("card_catalog")
          .select("id, set_name, team, player_name, card_number, is_rookie, insert_set, class_segment")
          .eq("is_variation_of_base", false);

        query =
          mode === "base"
            ? query.eq("category", "Base")
            : query.not("insert_set", "is", null).or("category.is.null,category.neq.Base");

        const { data } = await query
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
  }, [mode]);

  const setOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rows) seen.add(row.set_name);
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Default to the set the user already owns the most (matching) cards in,
  // falling back to alphabetically first once the catalog rows (and
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
    setGroupValue("");
    setActiveDivision(null);
    updateAlbumParams({ [setParamKey]: value, [groupParamKey]: "" });
  }

  // Single-open accordion (BaseYard only): clicking the already-active
  // division collapses it (the team it had selected, if any, is left as-is
  // — collapsing is just tidying up the picker, not undoing the pick).
  // Clicking a different division opens it and clears the team selection,
  // since "no team chosen yet" is exactly the state right after a division
  // switch.
  function handleDivisionClick(divisionName: string) {
    if (activeDivision === divisionName) {
      setActiveDivision(null);
    } else {
      setActiveDivision(divisionName);
      setGroupValue("");
      updateAlbumParams({ [groupParamKey]: "" });
    }
  }

  function handleGroupClick(value: string) {
    const next = groupValue === value ? "" : value;
    setGroupValue(next);
    updateAlbumParams({ [setParamKey]: setName, [groupParamKey]: next });
  }

  const rowsInSet = useMemo(
    () => rows.filter((row) => row.set_name === setName),
    [rows, setName]
  );

  // InsertYard's flat list of insert sets available within the chosen Set
  // — sorted alphabetically, same convention as the Set dropdown itself.
  const insertSetOptions = useMemo(() => {
    if (mode !== "insert") return [];
    const seen = new Set<string>();
    for (const row of rowsInSet) {
      if (row.insert_set) seen.add(row.insert_set);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [mode, rowsInSet]);

  const checklist = useMemo(() => {
    if (!groupValue) return [];
    return mode === "base"
      ? rowsInSet.filter((row) => row.team === groupValue)
      : rowsInSet.filter((row) => row.insert_set === groupValue);
  }, [rowsInSet, groupValue, mode]);

  const ownedByKey = useMemo(() => {
    const map = new Map<string, Card>();
    for (const c of ownCards) {
      if (!c.set_name) continue;
      if (mode === "base") {
        if (c.category !== "Base") continue;
        const key = ownershipKey(c.player_name, c.team, c.set_name);
        if (!map.has(key)) map.set(key, c);
      } else {
        if (c.category === "Base" || !c.insert_set) continue;
        const key = insertOwnershipKey(c.player_name, c.team, c.set_name, c.insert_set, c.card_number);
        if (!map.has(key)) map.set(key, c);
      }
    }
    return map;
  }, [ownCards, mode]);

  function findOwnedCard(row: ChecklistCatalogRow) {
    const key =
      mode === "base"
        ? ownershipKey(row.player_name, row.team, row.set_name)
        : insertOwnershipKey(row.player_name, row.team, row.set_name, row.insert_set ?? "", row.card_number);
    return ownedByKey.get(key);
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
        {mode === "base"
          ? "No Base checklist data is available yet for any set."
          : "No Insert Set checklist data is available yet for any set."}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="checklistSet" className="mb-1.5 block text-sm font-medium text-text">
          Set
        </label>
        <Select id="checklistSet" value={setName} onChange={(e) => handleSetChange(e.target.value)}>
          {setOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {mode === "base" ? (
        <>
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
                  const selected = groupValue === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleGroupClick(t)}
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
        </>
      ) : (
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-text">Insert Set</label>
          {insertSetOptions.length === 0 ? (
            <p className="text-sm text-muted">No insert sets found for this set.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {insertSetOptions.map((option) => {
                const selected = groupValue === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleGroupClick(option)}
                    className={`truncate rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                      selected ? tileSelectedClass : tileInactiveClass
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!groupValue ? (
        <p className="text-sm text-muted">
          {mode === "base"
            ? "Select a team above to see its checklist."
            : "Select an insert set above to see its checklist."}
        </p>
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

              // Read-only (a visitor browsing someone else's yard) can't add
              // cards to someone else's collection, so an empty slot is
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

              const addCardHref =
                mode === "base"
                  ? `/collection/add?catalogId=${row.id}&set=${encodeURIComponent(setName)}&team=${encodeURIComponent(groupValue)}`
                  : `/collection/add?catalogId=${row.id}&set=${encodeURIComponent(setName)}&insertSet=${encodeURIComponent(groupValue)}`;

              return (
                <Link
                  key={row.id}
                  href={addCardHref}
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
