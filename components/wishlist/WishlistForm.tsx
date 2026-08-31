"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import { NFL_TEAMS } from "@/lib/data/nflTeams";
import { CARD_SETS } from "@/lib/data/cardCatalog";
import { useParallelsForSet } from "@/lib/hooks/useParallelsForSet";
import { parallelLabel, titleCase } from "@/lib/utils/text";
import type { CardCatalogInsertSet } from "@/lib/types/database";

export function WishlistForm() {
  const router = useRouter();
  const supabase = createClient();

  const [playerName, setPlayerName] = useState("");
  const [team, setTeam] = useState("");
  const [setName, setSetName] = useState("");
  const [insertSet, setInsertSet] = useState("");
  const [parallel, setParallel] = useState("");
  const [tier, setTier] = useState("");
  const [baseType, setBaseType] = useState("");
  const [notes, setNotes] = useState("");
  const [insertSetOptions, setInsertSetOptions] = useState<CardCatalogInsertSet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { parallels: filteredParallels, isFinestSet, isSignatureClassSet } = useParallelsForSet(
    setName,
    tier,
    baseType
  );

  const parallelDisabled =
    !setName || (isFinestSet && !tier) || (isSignatureClassSet && !baseType);

  const parallelPlaceholder = !setName
    ? "Select a set first"
    : isFinestSet && !tier
      ? "Select a tier first"
      : isSignatureClassSet && !baseType
        ? "Select a base type first"
        : "Any parallel";

  useEffect(() => {
    if (!setName) {
      setInsertSetOptions([]);
      setInsertSet("");
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

  // Changing the Set means the previous Parallel / Tier / Base Type
  // selections no longer apply, same as the Add Card form.
  useEffect(() => {
    setParallel("");
    setTier("");
    setBaseType("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be logged in to add a wishlist request.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("wishlist").insert({
      user_id: user.id,
      player_name: playerName,
      team: team || null,
      set_name: setName || null,
      insert_set: insertSet || null,
      parallel: parallel || null,
      notes: notes || null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setPlayerName("");
    setTeam("");
    setSetName("");
    setInsertSet("");
    setParallel("");
    setNotes("");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4"
    >
      <div>
        <label htmlFor="wlPlayerName" className="mb-1.5 block text-sm font-medium text-text">
          Player name
        </label>
        <Input
          id="wlPlayerName"
          required
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Who are you looking for?"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="wlTeam" className="mb-1.5 block text-sm font-medium text-text">
            Team
          </label>
          <Select id="wlTeam" value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">Any team</option>
            {NFL_TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="wlSet" className="mb-1.5 block text-sm font-medium text-text">
            Set
          </label>
          <Select id="wlSet" value={setName} onChange={(e) => setSetName(e.target.value)}>
            <option value="">Any set</option>
            {CARD_SETS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label htmlFor="wlInsertSet" className="mb-1.5 block text-sm font-medium text-text">
          Insert Set
        </label>
        <Select
          id="wlInsertSet"
          value={insertSet}
          onChange={(e) => setInsertSet(e.target.value)}
          disabled={!setName}
        >
          <option value="">{setName ? "Any insert set" : "Select a set first"}</option>
          {insertSetOptions.map((option) => (
            <option key={option.insert_set} value={option.insert_set}>
              {titleCase(option.insert_set)}
            </option>
          ))}
        </Select>
      </div>

      {isFinestSet && (
        <div>
          <label htmlFor="wlTier" className="mb-1.5 block text-sm font-medium text-text">
            Tier
          </label>
          <Select id="wlTier" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="">Select a tier</option>
            <option value="Common">Common</option>
            <option value="Uncommon">Uncommon</option>
            <option value="Rare">Rare</option>
          </Select>
        </div>
      )}

      {isSignatureClassSet && (
        <div>
          <label htmlFor="wlBaseType" className="mb-1.5 block text-sm font-medium text-text">
            Base Type
          </label>
          <Select id="wlBaseType" value={baseType} onChange={(e) => setBaseType(e.target.value)}>
            <option value="">Select a base type</option>
            <option value="Chrome">Chrome</option>
            <option value="Paper">Paper</option>
          </Select>
        </div>
      )}

      <div>
        <label htmlFor="wlParallel" className="mb-1.5 block text-sm font-medium text-text">
          Parallel
        </label>
        <Select
          id="wlParallel"
          value={parallel}
          onChange={(e) => setParallel(e.target.value)}
          disabled={parallelDisabled}
        >
          <option value="">{parallelPlaceholder}</option>
          {filteredParallels.map((p) => (
            <option key={p.id} value={p.parallel_name}>
              {parallelLabel(p)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="wlNotes" className="mb-1.5 block text-sm font-medium text-text">
          Notes
        </label>
        <textarea
          id="wlNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any extra detail — condition, print run, what you'd trade..."
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button type="submit" className="btn-primary self-start" disabled={submitting}>
        <Plus className="h-4 w-4" />
        {submitting ? "Adding..." : "Add to Looking For"}
      </button>
    </form>
  );
}
