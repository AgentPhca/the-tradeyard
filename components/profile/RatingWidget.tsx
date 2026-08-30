"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface RatingWidgetProps {
  profileId: string;
  averageStars: number | null;
  ratingCount: number;
  unratedTradeIds: string[];
}

export function RatingWidget({
  profileId,
  averageStars,
  ratingCount,
  unratedTradeIds,
}: RatingWidgetProps) {
  const router = useRouter();
  const supabase = createClient();
  const [pendingTradeIds, setPendingTradeIds] = useState(unratedTradeIds);
  const [selectedStars, setSelectedStars] = useState<Record<string, number>>({});
  const [submittingTradeId, setSubmittingTradeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(tradeId: string) {
    const stars = selectedStars[tradeId] ?? 0;
    if (stars < 1) return;

    setSubmittingTradeId(tradeId);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      setSubmittingTradeId(null);
      return;
    }

    const { error: insertError } = await supabase.from("ratings").insert({
      trade_id: tradeId,
      rater_id: user.id,
      ratee_id: profileId,
      stars,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmittingTradeId(null);
      return;
    }

    setPendingTradeIds((ids) => ids.filter((id) => id !== tradeId));
    setSubmittingTradeId(null);
    router.refresh();
  }

  const rounded = averageStars ? Math.round(averageStars) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`h-4 w-4 ${n <= rounded ? "fill-primary text-primary" : "text-muted"}`}
          />
        ))}
        <span className="ml-1 text-sm text-muted">
          {ratingCount > 0 ? `${averageStars?.toFixed(1)} (${ratingCount})` : "No ratings yet"}
        </span>
      </div>

      {pendingTradeIds.map((tradeId) => (
        <div
          key={tradeId}
          className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface p-3"
        >
          <span className="text-sm text-text">Rate this trade:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                title={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setSelectedStars((s) => ({ ...s, [tradeId]: n }))}
                className="p-0.5"
              >
                <Star
                  className={`h-4 w-4 ${
                    n <= (selectedStars[tradeId] ?? 0) ? "fill-primary text-primary" : "text-muted"
                  }`}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn-primary ml-auto"
            disabled={submittingTradeId === tradeId || !selectedStars[tradeId]}
            onClick={() => handleSubmit(tradeId)}
          >
            Submit
          </button>
        </div>
      ))}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
