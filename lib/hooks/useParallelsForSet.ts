"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeSearchToken } from "@/lib/utils/search";
import type { Parallel } from "@/lib/types/database";

// The two sets whose parallel_name alone is ambiguous — see
// lib/supabase/parallels.sql. Finest's same color name carries a
// different print run per tier; Signature Class's per base_type.
export const FINEST_SET_NAME = "2025 Topps Finest Football";
export const SIGNATURE_CLASS_SET_NAME = "2025 Topps Signature Class Football";

interface UseParallelsForSetResult {
  // Every parallels row for `setName`, unfiltered — for Finest/Signature
  // Class this stacks all tiers/base_types together. Callers that don't
  // need the tier/base_type split (e.g. a marketplace filter showing one
  // entry per parallel_name) can dedupe this themselves instead of
  // rendering `parallels` directly.
  rawParallels: Parallel[];
  // `rawParallels` filtered down to the given tier/baseType for Finest /
  // Signature Class, or equal to `rawParallels` for every other set. This
  // is what a data-entry dropdown (Add Card, Wishlist) should render.
  parallels: Parallel[];
  isFinestSet: boolean;
  isSignatureClassSet: boolean;
}

// Fetches public.parallels scoped to `setName`, ordered by sort_order, and
// applies the Finest tier / Signature Class base_type filter shared by the
// Add Card and Wishlist forms. Pass `tier`/`baseType` once the caller has
// them selected; before that, `parallels` is empty for those two sets
// (same "pick tier/base type first" gating both forms already need).
//
// `insertSet` scopes the query itself (rather than a client-side filter
// like tier/baseType) to broadly-applicable rows (insert_set is null) plus
// whichever insert set is passed — an insert-only ladder like Mojo or
// Pressure Cookers should never appear while editing a card from a
// different insert, or a plain Base card. Only applied when a caller
// passes it AT ALL: MarketplaceFilters and the Wishlist form call this
// without an insertSet concept and want every parallel for the set
// (including every insert-specific ladder) to dedupe/filter themselves, so
// leaving the 4th argument out — `insertSet === undefined` — skips this
// filter entirely for them. CardForm always passes its own insertSet
// state, including "" for a plain Base card, which then shows only the
// broadly-applicable rows.
export function useParallelsForSet(
  setName: string,
  tier?: string,
  baseType?: string,
  insertSet?: string
): UseParallelsForSetResult {
  const supabase = createClient();
  const [rawParallels, setRawParallels] = useState<Parallel[]>([]);

  useEffect(() => {
    if (!setName) {
      setRawParallels([]);
      return;
    }

    let cancelled = false;

    (async () => {
      let query = supabase
        .from("parallels")
        .select(
          "id, set_name, parallel_name, print_run, sku_exclusivity, tier, base_type, insert_set, sort_order"
        )
        .eq("set_name", setName);

      if (insertSet !== undefined) {
        query = insertSet
          ? query.or(`insert_set.is.null,insert_set.eq.${sanitizeSearchToken(insertSet)}`)
          : query.is("insert_set", null);
      }

      const { data } = await query.order("sort_order");
      if (!cancelled) setRawParallels(data ?? []);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setName, insertSet]);

  const isFinestSet = setName === FINEST_SET_NAME;
  const isSignatureClassSet = setName === SIGNATURE_CLASS_SET_NAME;

  const parallels = isFinestSet
    ? rawParallels.filter((p) => p.tier === tier)
    : isSignatureClassSet
      ? rawParallels.filter((p) => p.base_type === baseType)
      : rawParallels;

  return { rawParallels, parallels, isFinestSet, isSignatureClassSet };
}
