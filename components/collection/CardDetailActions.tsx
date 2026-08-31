"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { findOrCreateConversation } from "@/lib/supabase/conversations";
import type { Card, CardStatus } from "@/lib/types/database";

interface CardDetailActionsProps {
  card: Card;
  isOwner: boolean;
  ownerUsername: string;
  ownerAllowsContact: boolean;
}

const STATUS_OPTIONS: { value: CardStatus; label: string }[] = [
  { value: "personal_collection", label: "Personal Collection" },
  { value: "for_trade", label: "For Trade" },
  { value: "traded", label: "Traded" },
];

export function CardDetailActions({
  card,
  isOwner,
  ownerUsername,
  ownerAllowsContact,
}: CardDetailActionsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<CardStatus>(card.status);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [contacting, setContacting] = useState(false);

  async function handleStatusChange(next: CardStatus) {
    setUpdatingStatus(true);
    setStatusError(null);

    // Preserve the original traded_at across edits that don't touch status;
    // stamp a fresh one on the transition into "traded", clear it otherwise
    // — same rule CardForm uses for the Add/Edit Card status field.
    const tradedAt = next === "traded" ? (card.traded_at ?? new Date().toISOString()) : null;

    const { data, error } = await supabase
      .from("cards")
      .update({ status: next, traded_at: tradedAt })
      .eq("id", card.id)
      .select("status")
      .single();

    if (error || !data) {
      setStatusError(error?.message ?? "Failed to update status.");
      setUpdatingStatus(false);
      return;
    }

    setStatus(data.status);
    setUpdatingStatus(false);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    const { error } = await supabase.from("cards").delete().eq("id", card.id);

    if (error) {
      setDeleteError(error.message);
      setDeleting(false);
      return;
    }

    router.push("/collection");
    router.refresh();
  }

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

  if (isOwner) {
    return (
      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="cardStatus" className="mb-1.5 block text-sm font-medium text-text">
            Status
          </label>
          <Select
            id="cardStatus"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as CardStatus)}
            disabled={updatingStatus}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {statusError && <p className="mt-1.5 text-sm text-red-400">{statusError}</p>}
        </div>

        <div className="flex gap-2">
          <Link href={`/collection/${card.id}/edit`} className="btn-secondary flex-1">
            <Pencil className="h-4 w-4" />
            Edit Card
          </Link>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete Card
          </button>
        </div>

        <ConfirmDialog
          open={confirmOpen}
          title="Delete this card?"
          description={
            <>
              This will permanently remove {card.player_name} from your collection. This
              can’t be undone.
              {deleteError && <span className="mt-2 block text-red-400">{deleteError}</span>}
            </>
          }
          confirmLabel="Delete"
          confirming={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    );
  }

  if (status === "for_trade" && ownerAllowsContact) {
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

  if (status === "for_trade" && !ownerAllowsContact) {
    return (
      <p className="mt-6 text-sm text-muted">
        @{ownerUsername} isn&rsquo;t accepting contact requests right now.
      </p>
    );
  }

  if (status === "traded") {
    return <p className="mt-6 text-sm text-muted">This card has already been traded.</p>;
  }

  return (
    <p className="mt-6 text-sm text-muted">
      This card is part of @{ownerUsername}&rsquo;s personal collection and isn&rsquo;t
      available to trade.
    </p>
  );
}
