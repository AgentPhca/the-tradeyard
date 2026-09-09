"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ImageOff, Lock } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import { coverPhoto } from "@/lib/utils/cardPhotos";
import { insertOwnershipKey } from "@/lib/utils/checklist";
import { catalogRowDisplayLabel, findMultiPlayerKeys, groupIntoSlots, type RowSlot } from "@/lib/utils/multiPlayerCard";
import { isInsert, isParallel } from "@/lib/utils/cardClassification";
import type { Card } from "@/lib/types/database";

type PersonalYardMode = "team" | "player";
type PersonalYardCategory = "Base" | "Insert" | "Value" | "Parallel";

// Only the columns the category derivation + ownership key need.
interface PersonalCatalogRow {
  id: string;
  set_name: string;
  team: string | null;
  player_name: string;
  card_number: string | null;
  insert_set: string | null;
  card_title: string | null;
  parallel: string | null;
  is_variation_of_base: boolean;
  is_autograph: boolean;
  is_relic: boolean;
  print_run: number | null;
  category: string | null;
}

// One rendered tile: either a single catalog row, or — for a multi-player
// card — every row sharing the same (set_name, insert_set, card_number),
// grouped into one slot instead of one tile per co-featured player. See
// groupIntoSlots in lib/utils/multiPlayerCard.ts (shared with
// ChecklistAlbum.tsx, which needs the exact same grouping).
type PersonalYardSlot = RowSlot<PersonalCatalogRow>;

// A slot counts as owned if the user owns ANY of its constituent rows —
// the physical card is the same regardless of which co-featured player's
// name was picked when it was added.
function ownedCardForRows(rows: PersonalCatalogRow[], ownedByKey: Map<string, Card>): Card | undefined {
  for (const row of rows) {
    const key = insertOwnershipKey(row.player_name, row.team, row.set_name, row.insert_set ?? "", row.card_number);
    const owned = ownedByKey.get(key);
    if (owned) return owned;
  }
  return undefined;
}

// A catalog row's bucket within its Set, in priority order — see
// lib/utils/cardClassification.ts for the underlying rules. A Parallel
// (photo/design variation, a manually-tagged numbered chase parallel, or a
// CHROME-as-second-Base-tier row) wins over everything else; a numbered/
// autograph/relic row is "Value" (same definition ValueYard uses,
// including print_run — an autograph-variation row that isParallel already
// excluded via its category='Autograph' check lands here instead); a real
// insert set (including Autograph/Relic-category ones, same broadened rule
// InsertYard uses) is "Insert"; everything else is "Base" — only reachable
// in PlayerYard mode ("alles" by design), never TeamYard (whose own
// catalog query already excludes plain Base rows entirely).
function rowCategory(row: PersonalCatalogRow): PersonalYardCategory {
  if (isParallel(row)) return "Parallel";
  if (row.print_run != null || row.is_autograph || row.is_relic) return "Value";
  if (isInsert(row)) return "Insert";
  return "Base";
}

const CATEGORY_ORDER: PersonalYardCategory[] = ["Base", "Insert", "Value", "Parallel"];

const lockedPatternStyle = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(139,148,158,0.08) 0px, rgba(139,148,158,0.08) 6px, transparent 6px, transparent 12px)",
};

const tileInactiveClass = "border-border bg-surface text-muted hover:border-primary/40 hover:text-text";
const tileSelectedClass = "border-primary/30 bg-primary/10 text-primary";

interface PersonalYardAlbumProps {
  cards: Card[];
  targetUserId: string;
  readOnly?: boolean;
  // "team": TeamYard — every non-base catalog slot for this team (parallel/
  // insert/autograph/relic — see the catalog query below). "player":
  // PlayerYard — every catalog slot for this player, no restriction at all.
  mode: PersonalYardMode;
  value: string;
}

// TeamYard/PlayerYard's own sticker album — same paginated
// catalog-fetch-plus-ownership-overlay approach as ChecklistAlbum
// (BaseYard/InsertYard), but grouped Set -> category (Base/Insert/Value/
// Parallel) instead of Set -> Division/Team or Set -> Insert Set, since
// neither Team nor Player scopes to one grouping dimension the way the
// other two yards do. Kept as its own component rather than a third
// ChecklistAlbum mode: the grouping shape is different enough (and
// "category" here is derived from catalog-row attributes, not a single
// column) that forcing it through ChecklistAlbum's base/insert branching
// would touch nearly every line of that component for no shared benefit.
export function PersonalYardAlbum({ cards, targetUserId, readOnly = false, mode, value }: PersonalYardAlbumProps) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ownCards = useMemo(() => {
    const scoped = cards.filter((c) => c.owner_id === targetUserId);
    return mode === "team" ? scoped.filter((c) => c.team === value) : scoped.filter((c) => c.player_name === value);
  }, [cards, targetUserId, mode, value]);

  // Distinct param names per mode+level (a user can have a TeamYard and a
  // PlayerYard active in different tabs/links at once, so they can't share
  // one param namespace any more than baseSet/insertYardSet do).
  const setParamKey = mode === "team" ? "teamYardSet" : "playerYardSet";
  const categoryParamKey = mode === "team" ? "teamYardCategory" : "playerYardCategory";

  const urlSet = searchParams.get(setParamKey) ?? "";
  const urlCategory = (searchParams.get(categoryParamKey) ?? "") as PersonalYardCategory | "";

  const [rows, setRows] = useState<PersonalCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [setName, setSetName] = useState(urlSet);
  const [category, setCategory] = useState<PersonalYardCategory | "">(urlCategory);
  const [defaultSetPicked, setDefaultSetPicked] = useState(Boolean(urlSet));

  function updateAlbumParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val) params.set(key, val);
      else params.delete(key);
    }
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }

  // Fetched once per mode+value — see ChecklistAlbum for why .range()
  // chunking (not a single large .limit()) is required.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const pageSize = 1000;
      const allRows: PersonalCatalogRow[] = [];
      let from = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        let query = supabase
          .from("card_catalog")
          .select(
            "id, set_name, team, player_name, card_number, insert_set, card_title, parallel, is_variation_of_base, is_autograph, is_relic, print_run, category"
          )
          .eq(mode === "team" ? "team" : "player_name", value);

        if (mode === "team") {
          // Non-base only — "NOT pure Base" (see lib/utils/
          // cardClassification.ts's isPureBase), matching getTeamYardProgress
          // .ts's own catalog filter. Written out as the OR form directly
          // (De Morgan's) rather than a single .not() call, since PostgREST
          // has no clean way to negate an AND-of-two-columns filter.
          query = query.or("is_variation_of_base.eq.true,category.is.null,category.neq.Base");
        }
        // player mode: no further restriction — "alles" by design.

        const { data } = await query
          .order("set_name")
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
  }, [mode, value]);

  const setOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rows) seen.add(row.set_name);
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Default to the set already owned the most in, same convention as
  // ChecklistAlbum.
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

  function handleSetChange(next: string) {
    setSetName(next);
    setCategory("");
    updateAlbumParams({ [setParamKey]: next, [categoryParamKey]: "" });
  }

  function handleCategoryClick(next: PersonalYardCategory) {
    const nextValue = category === next ? "" : next;
    setCategory(nextValue);
    updateAlbumParams({ [setParamKey]: setName, [categoryParamKey]: nextValue });
  }

  const rowsInSet = useMemo(() => rows.filter((row) => row.set_name === setName), [rows, setName]);

  // Multi-player detection (e.g. "AFC REC Leaders") needs the OTHER
  // players' rows too, but `rows` is already scoped to this one
  // team/player — Ja'Marr Chase's and Zay Flowers' rows for the same
  // 3-player card never show up in a Patriots-scoped TeamYard fetch, only
  // Stefon Diggs' does. A second, narrow lookup restricted to just the
  // (insert, card number) combinations actually present in the CURRENTLY
  // VIEWED Set finds the co-featured players across every team — scoped
  // to one Set at a time (not the whole team/player's slate across every
  // set) both because that's all that's ever rendered at once and because
  // it keeps the .in() cross-product bounded. See lib/utils/multiPlayerCard.ts.
  const [multiPlayerKeys, setMultiPlayerKeys] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    const withInsert = rowsInSet.filter((row) => row.insert_set && row.card_number);
    if (withInsert.length === 0) {
      setMultiPlayerKeys(new Set());
      return;
    }

    (async () => {
      const insertSets = Array.from(new Set(withInsert.map((row) => row.insert_set as string)));
      const cardNumbers = Array.from(new Set(withInsert.map((row) => row.card_number as string)));
      const { data: siblingRows } = await supabase
        .from("card_catalog")
        .select("set_name, insert_set, card_number, player_name")
        .eq("set_name", setName)
        .in("insert_set", insertSets)
        .in("card_number", cardNumbers);
      if (!cancelled) setMultiPlayerKeys(findMultiPlayerKeys(siblingRows ?? []));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsInSet, setName]);
  const displayLabel = (row: PersonalCatalogRow) => catalogRowDisplayLabel(row, multiPlayerKeys);

  const categoriesInSet = useMemo(() => {
    const present = new Set<PersonalYardCategory>();
    for (const row of rowsInSet) present.add(rowCategory(row));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [rowsInSet]);

  const ownedByKey = useMemo(() => {
    const map = new Map<string, Card>();
    for (const c of ownCards) {
      if (!c.set_name) continue;
      const key = insertOwnershipKey(c.player_name, c.team, c.set_name, c.insert_set ?? "", c.card_number);
      if (!map.has(key)) map.set(key, c);
    }
    return map;
  }, [ownCards]);

  // Every row in the current Set, grouped into slots per category (Base/
  // Insert/Value/Parallel) — and, within each category, further grouped
  // by groupIntoSlots so a multi-player card's co-featured-player rows
  // become one slot instead of one tile each. Computed for every category
  // up front (not just the currently selected one) so a chip can show
  // "already 100%" without clicking into each one to check.
  const slotsByCategory = useMemo(() => {
    const rowsByCategory = new Map<PersonalYardCategory, PersonalCatalogRow[]>();
    for (const row of rowsInSet) {
      const cat = rowCategory(row);
      const catRows = rowsByCategory.get(cat);
      if (catRows) catRows.push(row);
      else rowsByCategory.set(cat, [row]);
    }
    const result = new Map<PersonalYardCategory, PersonalYardSlot[]>();
    rowsByCategory.forEach((catRows, cat) => result.set(cat, groupIntoSlots(catRows, multiPlayerKeys)));
    return result;
  }, [rowsInSet, multiPlayerKeys]);

  const categoryCompletion = useMemo(() => {
    const map = new Map<PersonalYardCategory, { owned: number; total: number }>();
    slotsByCategory.forEach((slots, cat) => {
      let owned = 0;
      for (const slot of slots) {
        if (ownedCardForRows(slot.rows, ownedByKey)) owned += 1;
      }
      map.set(cat, { owned, total: slots.length });
    });
    return map;
  }, [slotsByCategory, ownedByKey]);

  function isCategoryComplete(cat: PersonalYardCategory) {
    const entry = categoryCompletion.get(cat);
    return Boolean(entry && entry.total > 0 && entry.owned === entry.total);
  }

  function findOwnedCard(slot: PersonalYardSlot) {
    return ownedCardForRows(slot.rows, ownedByKey);
  }

  const checklist = useMemo(() => {
    if (!category) return [];
    return slotsByCategory.get(category) ?? [];
  }, [slotsByCategory, category]);

  const ownedCount = useMemo(
    () => checklist.filter((slot) => findOwnedCard(slot)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checklist, ownedByKey]
  );
  const progressPct = checklist.length > 0 ? Math.round((ownedCount / checklist.length) * 100) : 0;

  if (loading) {
    return <p className="text-sm text-muted">Loading checklist...</p>;
  }

  if (setOptions.length === 0) {
    return <p className="text-sm text-muted">No checklist data is available yet for {value}.</p>;
  }

  return (
    <div>
      <div className="mb-4">
        <label htmlFor="personalYardSet" className="mb-1.5 block text-sm font-medium text-text">
          Set
        </label>
        <Select id="personalYardSet" value={setName} onChange={(e) => handleSetChange(e.target.value)}>
          {setOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-text">Kategorie</label>
        {categoriesInSet.length === 0 ? (
          <p className="text-sm text-muted">No cards found for this set.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {categoriesInSet.map((cat) => {
              const selected = category === cat;
              const complete = isCategoryComplete(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className={`relative flex min-h-11 items-center justify-center rounded-md border px-2 py-1.5 text-center text-[11px] font-medium leading-tight transition-colors sm:text-xs ${
                    selected ? tileSelectedClass : tileInactiveClass
                  }`}
                >
                  {cat}
                  {complete && (
                    <span
                      title="100% collected"
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!category ? (
        <p className="text-sm text-muted">Select a category above to see its checklist.</p>
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
            {checklist.map((slot) => {
              const row = slot.rows[0];
              const ownedCard = findOwnedCard(slot);

              if (ownedCard) {
                const ownedCardImageUrl = coverPhoto(ownedCard);
                return (
                  <Link
                    key={slot.key}
                    href={`/collection/${ownedCard.id}`}
                    className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
                  >
                    <div className="relative aspect-[5/7] w-full bg-surface">
                      {ownedCardImageUrl ? (
                        <Image
                          src={ownedCardImageUrl}
                          alt={`${displayLabel(row)} card`}
                          fill
                          // Fixed widths matching this grid's actual rendered
                          // tile size at each breakpoint (grid-cols-3/4/6 —
                          // see the grid className below), same as
                          // ChecklistAlbum's identical grid.
                          sizes="(min-width: 1024px) 175px, (min-width: 640px) 235px, 190px"
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
                      <p className="truncate text-xs font-medium text-text" title={displayLabel(row)}>
                        {displayLabel(row)}
                      </p>
                      {row.card_number && <span className="text-[10px] text-muted">#{row.card_number}</span>}
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
                    <p className="truncate text-xs text-muted" title={displayLabel(row)}>
                      {displayLabel(row)}
                    </p>
                    {row.card_number && <span className="text-[10px] text-muted">#{row.card_number}</span>}
                  </div>
                </>
              );

              if (readOnly) {
                return (
                  <div
                    key={slot.key}
                    className="flex flex-col overflow-hidden rounded-lg border border-dashed border-border bg-surface"
                  >
                    {lockedTileContent}
                  </div>
                );
              }

              const addCardParam = mode === "team" ? "personalTeam" : "personalPlayer";
              const addCardHref = `/collection/add?catalogId=${row.id}&set=${encodeURIComponent(setName)}&${addCardParam}=${encodeURIComponent(value)}`;

              return (
                <Link
                  key={slot.key}
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
