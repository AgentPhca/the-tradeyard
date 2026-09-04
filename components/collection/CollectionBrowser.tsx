"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Gem, Layers, PenTool, Sparkles } from "lucide-react";
import { TradingCard } from "@/components/cards/TradingCard";
import { FilterSelectRow, type FilterSelectOption } from "@/components/cards/FilterSelectRow";
import { StickerAlbum } from "@/components/collection/StickerAlbum";
import { titleCase } from "@/lib/utils/text";
import type { Card } from "@/lib/types/database";

type YardKey = "rookie" | "base" | "auto" | "grail";

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
}

export function CollectionBrowser({ cards }: CollectionBrowserProps) {
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

  const filteredCards = useMemo(() => {
    if (!activeYard) return filterBarCards;
    return filterBarCards.filter(activeYard.test);
  }, [filterBarCards, activeYard]);

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
        <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
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
              </div>
            </button>
          ))}
        </div>
      )}

      {activeYard?.key === "base" ? (
        // BaseYard is a full Set+Team checklist, not a filtered list of the
        // user's own cards — the normal filter bar doesn't apply here
        // (StickerAlbum has its own Set/Team pickers), and it needs every
        // owned card, not just whatever the filter bar would have narrowed
        // to.
        <StickerAlbum cards={cards} />
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

          {filteredCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-24 text-center">
              <Layers className="h-8 w-8 text-muted" />
              <p className="mt-4 text-sm text-muted">No cards match this filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filteredCards.map((card) => (
                <TradingCard key={card.id} card={card} isOwner />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
