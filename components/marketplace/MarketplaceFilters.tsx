"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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

  const team = searchParams.get("team") ?? "";
  const setName = searchParams.get("set") ?? "";
  const insertSet = searchParams.get("insertSet") ?? "";
  const parallel = searchParams.get("parallel") ?? "";
  const status = searchParams.get("status") === "personal_collection" ? "personal_collection" : "for_trade";

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
          placeholder="Search by player name..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Select value={team} onChange={(e) => updateParams({ team: e.target.value })}>
          <option value="">All teams</option>
          {NFL_TEAMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <Select
          value={setName}
          onChange={(e) => updateParams({ set: e.target.value, insertSet: "", parallel: "" })}
        >
          <option value="">All sets</option>
          {CARD_SETS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Select
          value={insertSet}
          onChange={(e) => updateParams({ insertSet: e.target.value })}
          disabled={!setName}
        >
          <option value="">{setName ? "All insert sets" : "Select a set first"}</option>
          {insertSetOptions.map((option) => (
            <option key={option.insert_set} value={option.insert_set}>
              {titleCase(option.insert_set)}
            </option>
          ))}
        </Select>

        <Select
          value={parallel}
          onChange={(e) => updateParams({ parallel: e.target.value })}
          disabled={!setName}
        >
          <option value="">{setName ? "All parallels" : "Select a set first"}</option>
          {parallelOptions.map((p) => (
            <option key={p.id} value={p.parallel_name}>
              {p.parallel_name}
              {p.sku_exclusivity ? ` (${p.sku_exclusivity})` : ""}
            </option>
          ))}
        </Select>

        <Select value={status} onChange={(e) => updateParams({ status: e.target.value })}>
          <option value="for_trade">For Trade</option>
          <option value="personal_collection">Personal Collection</option>
        </Select>
      </div>
    </div>
  );
}
