"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { FilterSelectRow } from "@/components/cards/FilterSelectRow";
import { createClient } from "@/lib/supabase/client";
import { NFL_TEAMS } from "@/lib/data/nflTeams";
import { CARD_SETS } from "@/lib/data/cardCatalog";
import { useParallelsForSet } from "@/lib/hooks/useParallelsForSet";
import { titleCase } from "@/lib/utils/text";
import type { CardCatalogInsertSet } from "@/lib/types/database";

export function MarketplaceFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const tab = searchParams.get("tab") === "looking" ? "looking" : "for_trade";
  const team = searchParams.get("team") ?? "";
  const setName = searchParams.get("set") ?? "";
  const insertSet = searchParams.get("insertSet") ?? "";
  const parallel = searchParams.get("parallel") ?? "";
  const isRookie = searchParams.get("rookie") === "true";
  const isAutograph = searchParams.get("autograph") === "true";
  const isRelic = searchParams.get("relic") === "true";
  const isNumbered = searchParams.get("numbered") === "true";

  const [playerName, setPlayerName] = useState(searchParams.get("player") ?? "");
  const [insertSetOptions, setInsertSetOptions] = useState<CardCatalogInsertSet[]>([]);

  // Marketplace filtering only needs one row per parallel_name — unlike the
  // Add Card / Wishlist forms, it doesn't need the Finest tier / Signature
  // Class base_type split (a print run doesn't matter for "show me cards
  // with this parallel"), so this dedupes rawParallels instead of using the
  // hook's tier/base-type-filtered `parallels`.
  const { rawParallels } = useParallelsForSet(setName);
  const parallelOptions = useMemo(() => {
    const seen = new Set<string>();
    return rawParallels.filter((p) => {
      if (seen.has(p.parallel_name)) return false;
      seen.add(p.parallel_name);
      return true;
    });
  }, [rawParallels]);

  const teamSelectOptions = useMemo(() => NFL_TEAMS.map((t) => ({ value: t, label: t })), []);
  const setSelectOptions = useMemo(() => CARD_SETS.map((s) => ({ value: s, label: s })), []);
  const insertSetSelectOptions = useMemo(
    () =>
      insertSetOptions.map((option) => ({
        value: option.insert_set,
        label: titleCase(option.insert_set),
      })),
    [insertSetOptions]
  );
  const parallelSelectOptions = useMemo(
    () =>
      parallelOptions.map((p) => ({
        value: p.parallel_name,
        label: p.sku_exclusivity ? `${p.parallel_name} (${p.sku_exclusivity})` : p.parallel_name,
      })),
    [parallelOptions]
  );

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  // Debounce the player name search into the URL.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (playerName.trim() !== (searchParams.get("player") ?? "")) {
        updateParams({ player: playerName.trim() });
      }
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerName]);

  // Insert Set options are scoped to the chosen Set, same as the Add Card form.
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

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          className="pl-9"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder={
            tab === "for_trade"
              ? "Search by player, team, set, or card number..."
              : "Search by player, team, or set..."
          }
        />
      </div>

      <FilterSelectRow
        team={team}
        onTeamChange={(value) => updateParams({ team: value })}
        teamOptions={teamSelectOptions}
        setName={setName}
        onSetChange={(value) => updateParams({ set: value, insertSet: "", parallel: "" })}
        setOptions={setSelectOptions}
        insertSet={insertSet}
        onInsertSetChange={(value) => updateParams({ insertSet: value })}
        insertSetOptions={insertSetSelectOptions}
        parallel={parallel}
        onParallelChange={(value) => updateParams({ parallel: value })}
        parallelOptions={parallelSelectOptions}
      />

      {tab === "for_trade" && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={isRookie}
              onChange={(e) => updateParams({ rookie: e.target.checked ? "true" : "" })}
              className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-1 focus:ring-primary"
            />
            Rookie
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={isAutograph}
              onChange={(e) => updateParams({ autograph: e.target.checked ? "true" : "" })}
              className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-1 focus:ring-primary"
            />
            Autograph
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={isRelic}
              onChange={(e) => updateParams({ relic: e.target.checked ? "true" : "" })}
              className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-1 focus:ring-primary"
            />
            Patch
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={isNumbered}
              onChange={(e) => updateParams({ numbered: e.target.checked ? "true" : "" })}
              className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-1 focus:ring-primary"
            />
            Numbered
          </label>
        </div>
      )}
    </div>
  );
}
