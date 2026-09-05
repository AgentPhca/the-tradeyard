"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Gem, LayoutGrid, Layers, PenTool, Sparkles } from "lucide-react";
import { TradingCard } from "@/components/cards/TradingCard";
import { FilterSelectRow, type FilterSelectOption } from "@/components/cards/FilterSelectRow";
import { ChecklistAlbum } from "@/components/collection/ChecklistAlbum";
import { Select } from "@/components/ui/Select";
import { titleCase } from "@/lib/utils/text";
import type { Card } from "@/lib/types/database";

type YardKey = "rookie" | "base" | "insert" | "auto" | "grail";

type SortKey = "recent" | "player" | "cardNumber" | "team";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Recently added" },
  { value: "player", label: "Player name" },
  { value: "cardNumber", label: "Card number" },
  { value: "team", label: "Team" },
];

// SuperFractors/1-of-1s and other short print runs are what "grail" means
// to a collector — any relic/patch card counts too, regardless of print
// run, since a memorabilia card is inherently a chase card even unnumbered.
const GRAIL_PRINT_RUN_MAX = 50;

interface Yard {
  key: YardKey;
  label: string;
  description: string;
  icon: typeof Sparkles;
  test: (card: Card) => boolean;
  badgeClass: string;
  tileBorderClass: string;
  // Checklist-style yards (BaseYard, InsertYard) show every card_catalog
  // slot — owned or not — via ChecklistAlbum, unlike the simple filtered
  // lists the other yards are. Drives the small "Sticker Album" tag on the
  // hub tile so that distinction is visible before picking a yard.
  isAlbum?: boolean;
}

const YARDS: Yard[] = [
  {
    key: "rookie",
    label: "RookieYard",
    description: "Rookie cards from your collection",
    icon: Sparkles,
    test: (c) => c.is_rookie,
    badgeClass: "bg-primary/10 text-primary",
    tileBorderClass: "border-border",
  },
  {
    key: "base",
    label: "BaseYard",
    description: "Base cards from the checklist",
    icon: Layers,
    // Driven by card_catalog.category (mirrored onto cards.category on
    // catalog-match autofill) rather than deriving "base-ness" from other
    // fields — a card with no catalog match has category = null and won't
    // show up here.
    test: (c) => c.category === "Base",
    badgeClass: "bg-sky-500/10 text-sky-400",
    tileBorderClass: "border-border",
    isAlbum: true,
  },
  {
    key: "insert",
    label: "InsertYard",
    description: "Insert sets from the checklist",
    icon: LayoutGrid,
    // The plain base checklist rows are tagged insert_set='BASE CARDS' in
    // the source data, so category (not insert_set alone) is what actually
    // distinguishes "a real insert set" from "the base checklist".
    test: (c) => c.insert_set != null && c.category !== "Base",
    badgeClass: "bg-teal-500/10 text-teal-400",
    tileBorderClass: "border-border",
    isAlbum: true,
  },
  {
    key: "auto",
    label: "AutoYard",
    description: "Autographed cards",
    icon: PenTool,
    test: (c) => c.is_autograph,
    badgeClass: "bg-violet-500/10 text-violet-400",
    tileBorderClass: "border-border",
  },
  {
    key: "grail",
    label: "GrailYard",
    description: `Your rarest pulls · print run < ${GRAIL_PRINT_RUN_MAX} or relic/patch`,
    icon: Gem,
    test: (c) => (c.print_run != null && c.print_run < GRAIL_PRINT_RUN_MAX) || c.is_relic,
    // GrailYard is the "special" one — a distinct amber/gold accent on the
    // tile border itself, not just the icon badge, sets it apart from the
    // other three.
    badgeClass: "bg-amber-500/10 text-amber-400",
    tileBorderClass: "border-amber-500/30",
  },
];

function uniqueOptions(values: (string | null)[], label: (value: string) => string): FilterSelectOption[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (value) seen.add(value);
  }
  return Array.from(seen)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: label(value) }));
}

interface CollectionBrowserProps {
  cards: Card[];
  // Passed through to ChecklistAlbum (BaseYard/InsertYard) — see its
  // targetUserId prop. Empty when logged out, but cards is always [] in
  // that case too (see the early return below), so ChecklistAlbum never
  // actually mounts with it.
  currentUserId: string;
}

export function CollectionBrowser({ cards, currentUserId }: CollectionBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const yardParam = searchParams.get("yard");
  const activeYard = YARDS.find((y) => y.key === yardParam) ?? null;

  function setYard(key: YardKey | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (key) params.set("yard", key);
    else params.delete("yard");
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  const [team, setTeam] = useState("");
  const [setName, setSetName] = useState("");
  const [insertSet, setInsertSet] = useState("");
  const [parallel, setParallel] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  function handleSetChange(value: string) {
    setSetName(value);
    setInsertSet("");
    setParallel("");
  }

  const stats = useMemo(() => {
    const sets = new Set(cards.map((c) => c.set_name).filter(Boolean));
    return {
      total: cards.length,
      sets: sets.size,
      rookies: cards.filter((c) => c.is_rookie).length,
      autos: cards.filter((c) => c.is_autograph).length,
    };
  }, [cards]);

  // Filter-bar option lists are scoped to the user's own collection, not
  // the global catalog (unlike Marketplace) — Insert Set / Parallel are
  // further scoped to the chosen Set, same cascading pattern as Marketplace.
  const teamOptions = useMemo(() => uniqueOptions(cards.map((c) => c.team), (v) => v), [cards]);
  const setOptions = useMemo(
    () => uniqueOptions(cards.map((c) => c.set_name), (v) => v),
    [cards]
  );
  const cardsInSet = useMemo(
    () => (setName ? cards.filter((c) => c.set_name === setName) : cards),
    [cards, setName]
  );
  const insertSetOptions = useMemo(
    () => uniqueOptions(cardsInSet.map((c) => c.insert_set), titleCase),
    [cardsInSet]
  );
  const parallelOptions = useMemo(
    () => uniqueOptions(cardsInSet.map((c) => c.parallel), (v) => v),
    [cardsInSet]
  );

  // Cards after the (always-visible) filter bar, before the active yard is
  // applied — used both for the final grid and for the yard tile counts, so
  // a filter-bar selection (e.g. a team) narrows what each yard's counter
  // shows too.
  const filterBarCards = useMemo(() => {
    return cards.filter((card) => {
      if (team && card.team !== team) return false;
      if (setName && card.set_name !== setName) return false;
      if (insertSet && card.insert_set !== insertSet) return false;
      if (parallel && card.parallel !== parallel) return false;
      return true;
    });
  }, [cards, team, setName, insertSet, parallel]);

  const yardCounts = useMemo(() => {
    const counts = new Map<YardKey, number>();
    for (const yard of YARDS) {
      counts.set(yard.key, filterBarCards.filter(yard.test).length);
    }
    return counts;
  }, [filterBarCards]);

  // Base and Insert cards are BaseYard's/InsertYard's own thing now
  // (checklist-completion games, not a "card in my collection" in the usual
  // sense) — they only show up in the default grid's own dedicated yard,
  // not mixed into the general list. RookieYard/AutoYard/GrailYard are
  // unaffected: their test() functions don't look at category/insert_set,
  // so a card that happens to also be a rookie/autograph/grail still shows
  // up there.
  const filteredCards = useMemo(() => {
    if (!activeYard) {
      return filterBarCards.filter((c) => c.category !== "Base" && c.insert_set == null);
    }
    return filterBarCards.filter(activeYard.test);
  }, [filterBarCards, activeYard]);

  // "Recently added" needs no re-sort — cards already arrive from the
  // server ordered by created_at desc, and filtering above preserves that
  // order.
  const sortedCards = useMemo(() => {
    if (sort === "recent") return filteredCards;
    const sorted = [...filteredCards];
    if (sort === "player") {
      sorted.sort((a, b) => a.player_name.localeCompare(b.player_name));
    } else if (sort === "cardNumber") {
      sorted.sort((a, b) =>
        (a.card_number ?? "").localeCompare(b.card_number ?? "", undefined, { numeric: true })
      );
    } else if (sort === "team") {
      sorted.sort((a, b) => (a.team ?? "").localeCompare(b.team ?? ""));
    }
    return sorted;
  }, [filteredCards, sort]);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-24 text-center">
        <Layers className="h-8 w-8 text-muted" />
        <p className="mt-4 text-sm text-muted">
          Your collection is empty. Add your first card to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        {stats.total} {stats.total === 1 ? "card" : "cards"} · {stats.sets}{" "}
        {stats.sets === 1 ? "set" : "sets"} · {stats.rookies} rookies · {stats.autos} autos
      </p>

      {activeYard ? (
        <div
          className={`mb-4 flex items-center justify-between gap-4 rounded-xl border ${activeYard.tileBorderClass} bg-surface p-4`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${activeYard.badgeClass}`}
            >
              <activeYard.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-text">{activeYard.label}</p>
              <p className="text-xs text-muted">{activeYard.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setYard(null)}
            className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            All yards
          </button>
        </div>
      ) : (
        <div className="mb-4 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {YARDS.map((yard) => (
            <button
              key={yard.key}
              type="button"
              onClick={() => setYard(yard.key)}
              className={`flex w-[150px] shrink-0 flex-col gap-3 rounded-xl border ${yard.tileBorderClass} bg-surface p-4 text-left transition-colors hover:border-primary/40`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${yard.badgeClass}`}
              >
                <yard.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-text">{yard.label}</p>
                <p className="text-xs text-muted">
                  {yardCounts.get(yard.key) ?? 0}{" "}
                  {(yardCounts.get(yard.key) ?? 0) === 1 ? "card" : "cards"}
                </p>
                {yard.isAlbum && (
                  <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[9px] font-medium text-muted">
                    <LayoutGrid className="h-2.5 w-2.5" />
                    Sticker Album
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {activeYard?.key === "base" || activeYard?.key === "insert" ? (
        // BaseYard/InsertYard are full Set(+Team/InsertSet) checklists, not
        // a filtered list of the user's own cards — the normal filter bar
        // doesn't apply here (ChecklistAlbum has its own Set/grouping
        // pickers), and it needs every owned card, not just whatever the
        // filter bar would have narrowed to.
        <ChecklistAlbum cards={cards} targetUserId={currentUserId} mode={activeYard.key} />
      ) : (
        <>
          <div className="mb-6 rounded-lg border border-border bg-surface p-4">
            <FilterSelectRow
              team={team}
              onTeamChange={setTeam}
              teamOptions={teamOptions}
              setName={setName}
              onSetChange={handleSetChange}
              setOptions={setOptions}
              insertSet={insertSet}
              onInsertSetChange={setInsertSet}
              insertSetOptions={insertSetOptions}
              parallel={parallel}
              onParallelChange={setParallel}
              parallelOptions={parallelOptions}
            />
          </div>

          {filteredCards.length > 0 && (
            <div className="mb-4 flex items-center justify-end gap-2">
              <label htmlFor="collectionSort" className="text-sm text-muted">
                Sort by
              </label>
              <Select
                id="collectionSort"
                className="w-auto"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {filteredCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-24 text-center">
              <Layers className="h-8 w-8 text-muted" />
              <p className="mt-4 text-sm text-muted">No cards match this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {sortedCards.map((card) => (
                <TradingCard key={card.id} card={card} isOwner />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
