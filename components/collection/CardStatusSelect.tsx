"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import type { Card, CardStatus } from "@/lib/types/database";

interface CardStatusSelectProps {
  card: Card;
}

const STATUS_OPTIONS: { value: CardStatus; label: string }[] = [
  { value: "personal_collection", label: "Personal Collection" },
  { value: "for_trade", label: "For Trade" },
  { value: "traded", label: "Traded" },
];

// Owner-only status control, split out of the old combined
// CardDetailActions so it can render between the description and the
// owner-link box instead of below Edit/Delete — see CardHeaderActions for
// those, now up in the title row next to the player name.
export function CardStatusSelect({ card }: CardStatusSelectProps) {
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<CardStatus>(card.status);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: CardStatus) {
    setUpdating(true);
    setError(null);

    // Preserve the original traded_at across edits that don't touch status;
    // stamp a fresh one on the transition into "traded", clear it otherwise
    // — same rule CardForm uses for the Add/Edit Card status field.
    const tradedAt = next === "traded" ? (card.traded_at ?? new Date().toISOString()) : null;

    const { data, error: updateError } = await supabase
      .from("cards")
      .update({ status: next, traded_at: tradedAt })
      .eq("id", card.id)
      .select("status")
      .single();

    if (updateError || !data) {
      setError(updateError?.message ?? "Failed to update status.");
      setUpdating(false);
      return;
    }

    setStatus(data.status);
    setUpdating(false);
    router.refresh();
  }

  return (
    <div className="mt-4">
      <label htmlFor="cardStatus" className="mb-1.5 block text-sm font-medium text-text">
        Status
      </label>
      <Select
        id="cardStatus"
        value={status}
        onChange={(e) => handleChange(e.target.value as CardStatus)}
        disabled={updating}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
    </div>
  );
}
