"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ImageOff, Lock } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import type { Card, CardCatalogEntry } from "@/lib/types/database";

type BaseCatalogRow = Pick<
  CardCatalogEntry,
  "id" | "set_name" | "team" | "player_name" | "card_number" | "is_rookie"
>;

// A subtle diagonal hatch, built from the muted token (#8B949E) rather than
// a flat fill, so a locked slot reads as "not yet collected" without
// looking like an error state.
const lockedPatternStyle = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(139,148,158,0.08) 0px, rgba(139,148,158,0.08) 6px, transparent 6px, transparent 12px)",
};

const chipBaseClass =
  "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors";
const chipInactiveClass = "border-border bg-surface text-muted hover:border-primary/40 hover:text-text";
const chipActiveClass = "border-primary/30 bg-primary/10 text-primary";

interface StickerAlbumProps {
  cards: Card[];
}

// BaseYard's "sticker album" mode: a full Set+Team checklist pulled from
// card_catalog (category='Base'), with the user's own cards overlaid onto
// the slots they've filled. This is deliberately a from-scratch UI rather
// than the normal filter-bar + card grid the other yards use — a checklist
// needs to show *every* catalog slot (owned or not), not just the cards the
// user actually has.
export function StickerAlbum({ cards }: StickerAlbumProps) {
  const supabase = createClient();
  const [rows, setRows] = useState<BaseCatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [setName, setSetName] = useState("");
  const [team, setTeam] = useState("");
  const [defaultSetPicked, setDefaultSetPicked] = useState(false);

  // Fetched once — every Base-category catalog row, across all sets. A few
  // thousand rows at most, and it's a one-time load rather than a query per
  // Set/Team click, which keeps switching between sets/teams instant.
  //
  // is_variation_of_base = false excludes photo-variation rows (e.g. "TEAM
  // CAMO VARIATION", "LIGHTBOARD LOGO VARIATION") that the checklist import
  // also tagged category='Base' — without this, the same player/card_number
  // shows up 2-3x (once per variation) instead of once per real checklist
  // slot. The explicit .limit(10000) matters just as much: Base rows alone
  // total ~3,400 across all sets, well past PostgREST's default 1000-row
  // cap, so without it the query silently truncated (ordered by set_name)
  // and several sets never made it into `rows` at all — that's why the Set
  // dropdown was missing sets, not because it was reading from `cards`.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("card_catalog")
        .select("id, set_name, team, player_name, card_number, is_rookie")
        .eq("category", "Base")
        .eq("is_variation_of_base", false)
        .order("set_name")
        .order("team")
        .order("player_name")
        .order("card_number")
        .limit(10000);
      if (!cancelled) {
        setRows(data ?? []);
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
    for (const c of cards) {
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
  }

  const rowsInSet = useMemo(
    () => rows.filter((row) => row.set_name === setName),
    [rows, setName]
  );

  const teamOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rowsInSet) {
      if (row.team) seen.add(row.team);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [rowsInSet]);

  const checklist = useMemo(
    () => (team ? rowsInSet.filter((row) => row.team === team) : []),
    [rowsInSet, team]
  );

  // A catalog row counts as owned when the user has a card flagged
  // category='Base' whose player/team/set matches — not just cards linked
  // via catalog_id. This also picks up cards that were manually flagged
  // "Base Set" with no catalog match at all (no catalog_id), which
  // catalog_id-only matching would otherwise miss entirely.
  function ownershipKey(playerName: string, team: string | null, set: string) {
    return `${playerName}|${team ?? ""}|${set}`;
  }

  const ownedByKey = useMemo(() => {
    const map = new Map<string, Card>();
    for (const c of cards) {
      if (c.category !== "Base" || !c.set_name) continue;
      const key = ownershipKey(c.player_name, c.team, c.set_name);
      if (!map.has(key)) map.set(key, c);
    }
    return map;
  }, [cards]);

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

      {teamOptions.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {teamOptions.map((t) => {
            const active = team === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTeam(active ? "" : t)}
                className={`${chipBaseClass} ${active ? chipActiveClass : chipInactiveClass}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      {!team ? (
        <p className="text-sm text-muted">Pick a team to see its checklist.</p>
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
                    <p className="truncate px-2 py-1.5 text-xs font-medium text-text">
                      {row.player_name}
                    </p>
                  </Link>
                );
              }

              return (
                <Link
                  key={row.id}
                  href={`/collection/add?catalogId=${row.id}`}
                  className="flex flex-col overflow-hidden rounded-lg border border-dashed border-border bg-surface transition-colors hover:border-primary/40"
                >
                  <div
                    className="flex aspect-[5/7] w-full items-center justify-center"
                    style={lockedPatternStyle}
                  >
                    <Lock className="h-5 w-5 text-muted" />
                  </div>
                  <p className="truncate px-2 py-1.5 text-xs text-muted">{row.player_name}</p>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
