"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { findOrCreateConversation } from "@/lib/supabase/conversations";
import type { Card } from "@/lib/types/database";

interface CardDetailActionsProps {
  card: Card;
  ownerUsername: string;
  ownerAllowsContact: boolean;
}

// Non-owner actions only — the owner's Status/Edit/Delete controls moved to
// CardStatusSelect (between the description and the owner-link box) and
// CardHeaderActions (next to the player name in the title row), so this
// component is only ever rendered for a visitor viewing someone else's
// card now.
export function CardDetailActions({ card, ownerUsername, ownerAllowsContact }: CardDetailActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [contacting, setContacting] = useState(false);

  async function handleContact() {
    setContacting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      setContacting(false);
      return;
    }

    try {
      const conversationId = await findOrCreateConversation(supabase, user.id, card.owner_id);
      router.push(`/messages?conversation=${conversationId}`);
    } finally {
      setContacting(false);
    }
  }

  if (card.status === "for_trade" && ownerAllowsContact) {
    return (
      <button
        type="button"
        onClick={handleContact}
        disabled={contacting}
        className="btn-primary mt-6 w-full disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" />
        {contacting ? "Opening chat..." : "Kontakt"}
      </button>
    );
  }

  if (card.status === "for_trade" && !ownerAllowsContact) {
    return (
      <p className="mt-6 text-sm text-muted">
        @{ownerUsername} isn&rsquo;t accepting contact requests right now.
      </p>
    );
  }

  if (card.status === "traded") {
    return <p className="mt-6 text-sm text-muted">This card has already been traded.</p>;
  }

  return (
    <p className="mt-6 text-sm text-muted">
      This card is part of @{ownerUsername}&rsquo;s personal collection and isn&rsquo;t
      available to trade.
    </p>
  );
}
