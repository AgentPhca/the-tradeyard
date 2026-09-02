"use client";

import { useMemo, useState } from "react";
import { Layers } from "lucide-react";
import { TradingCard } from "@/components/cards/TradingCard";
import type { Card } from "@/lib/types/database";

type FolderKey = "rookie" | "auto" | "base" | "grail";

// SuperFractors/1-of-1s and other ultra-short print runs are what "grail"
// means to a collector — 25 is a deliberately generous cutoff (most Topps
// low-numbered parallels run in the low tens) so GrailYard reliably
// surfaces something for a typical collection instead of staying empty.
const GRAIL_PRINT_RUN_MAX = 25;

const FOLDERS: { key: FolderKey; label: string; test: (card: Card) => boolean }[] = [
  { key: "rookie", label: "RookieYard", test: (c) => c.is_rookie },
  { key: "auto", label: "AutoYard", test: (c) => c.is_autograph },
  // A "base" card here means none of the attributes that make a card
  // special — no parallel, and none of the rookie/autograph/relic flags.
  {
    key: "base",
    label: "BaseYard",
    test: (c) => !c.parallel && !c.is_rookie && !c.is_autograph && !c.is_relic,
  },
  {
    key: "grail",
    label: "GrailYard",
    test: (c) => c.print_run != null && c.print_run <= GRAIL_PRINT_RUN_MAX,
  },
];

// Beyond this many distinct teams, collapse the row behind a "+N more"
// toggle rather than letting it grow unbounded.
const TEAM_CHIP_LIMIT = 9;

const chipBaseClass =
  "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors";
const chipInactiveClass = "border-border bg-surface text-muted hover:border-primary/40 hover:text-text";
const chipActiveClass = "border-primary/30 bg-primary/10 text-primary";

interface CollectionBrowserProps {
  cards: Card[];
}

export function CollectionBrowser({ cards }: CollectionBrowserProps) {
  const [activeFolder, setActiveFolder] = useState<FolderKey | null>(null);
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [showAllTeams, setShowAllTeams] = useState(false);

  const stats = useMemo(() => {
    const sets = new Set(cards.map((c) => c.set_name).filter(Boolean));
    return {
      total: cards.length,
      sets: sets.size,
      rookies: cards.filter((c) => c.is_rookie).length,
      autos: cards.filter((c) => c.is_autograph).length,
    };
  }, [cards]);

  const folderCounts = useMemo(() => {
    const counts = new Map<FolderKey, number>();
    for (const folder of FOLDERS) {
      counts.set(folder.key, cards.filter(folder.test).length);
    }
    return counts;
  }, [cards]);

  const teamCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of cards) {
      if (!card.team) continue;
      counts.set(card.team, (counts.get(card.team) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([team, count]) => ({ team, count }))
      .sort((a, b) => b.count - a.count);
  }, [cards]);

  const visibleTeams = showAllTeams ? teamCounts : teamCounts.slice(0, TEAM_CHIP_LIMIT);

  const filteredCards = useMemo(() => {
    const folder = activeFolder ? FOLDERS.find((f) => f.key === activeFolder) : null;
    return cards.filter((card) => {
      if (folder && !folder.test(card)) return false;
      if (activeTeam && card.team !== activeTeam) return false;
      return true;
    });
  }, [cards, activeFolder, activeTeam]);

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

      <div className="mb-3 flex flex-wrap gap-2">
        {FOLDERS.map((folder) => {
          const active = activeFolder === folder.key;
          return (
            <button
              key={folder.key}
              type="button"
              onClick={() => setActiveFolder(active ? null : folder.key)}
              className={`${chipBaseClass} ${active ? chipActiveClass : chipInactiveClass}`}
            >
              {folder.label} ({folderCounts.get(folder.key) ?? 0})
            </button>
          );
        })}
      </div>

      {teamCounts.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 overflow-x-auto">
          {visibleTeams.map(({ team, count }) => {
            const active = activeTeam === team;
            return (
              <button
                key={team}
                type="button"
                onClick={() => setActiveTeam(active ? null : team)}
                className={`${chipBaseClass} ${active ? chipActiveClass : chipInactiveClass}`}
              >
                {team} ({count})
              </button>
            );
          })}
          {teamCounts.length > TEAM_CHIP_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAllTeams((v) => !v)}
              className="shrink-0 whitespace-nowrap text-xs font-medium text-muted underline hover:text-text"
            >
              {showAllTeams ? "Show less" : `+${teamCounts.length - TEAM_CHIP_LIMIT} more`}
            </button>
          )}
        </div>
      )}

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
    </div>
  );
}
