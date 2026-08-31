"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
export function useParallelsForSet(
  setName: string,
  tier?: string,
  baseType?: string
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
      const { data } = await supabase
        .from("parallels")
        .select("id, set_name, parallel_name, print_run, sku_exclusivity, tier, base_type, sort_order")
        .eq("set_name", setName)
        .order("sort_order");
      if (!cancelled) setRawParallels(data ?? []);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setName]);

  const isFinestSet = setName === FINEST_SET_NAME;
  const isSignatureClassSet = setName === SIGNATURE_CLASS_SET_NAME;

  const parallels = isFinestSet
    ? rawParallels.filter((p) => p.tier === tier)
    : isSignatureClassSet
      ? rawParallels.filter((p) => p.base_type === baseType)
      : rawParallels;

  return { rawParallels, parallels, isFinestSet, isSignatureClassSet };
}
