"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import { NFL_TEAMS } from "@/lib/data/nflTeams";
import { CARD_SETS, PARALLELS, AUTO_PARALLELS } from "@/lib/data/cardCatalog";
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
          onChange={(e) => updateParams({ set: e.target.value, insertSet: "" })}
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

        <Select value={parallel} onChange={(e) => updateParams({ parallel: e.target.value })}>
          <option value="">All parallels</option>
          <optgroup label="Parallels">
            {PARALLELS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </optgroup>
          <optgroup label="Autograph parallels">
            {AUTO_PARALLELS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </optgroup>
        </Select>

        <Select value={status} onChange={(e) => updateParams({ status: e.target.value })}>
          <option value="for_trade">For Trade</option>
          <option value="personal_collection">Personal Collection</option>
        </Select>
      </div>
    </div>
  );
}
