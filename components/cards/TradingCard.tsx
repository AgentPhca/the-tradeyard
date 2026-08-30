"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ImageOff, MessageCircle, Pencil, PenLine, Shirt, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { findOrCreateConversation } from "@/lib/supabase/conversations";
import { titleCase } from "@/lib/utils/text";
import type { Card as CardData } from "@/lib/types/database";

interface TradingCardProps {
  card: CardData;
  isOwner?: boolean;
  showSaveButton?: boolean;
  isSaved?: boolean;
  ownerUsername?: string;
  ownerAvatarUrl?: string | null;
  ownerAllowsContact?: boolean;
}

export function TradingCard({
  card,
  isOwner = false,
  showSaveButton = false,
  isSaved = false,
  ownerUsername,
  ownerAvatarUrl,
  ownerAllowsContact = true,
}: TradingCardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saved, setSaved] = useState(isSaved);
  const [togglingSave, setTogglingSave] = useState(false);
  const [contacting, setContacting] = useState(false);

  const forTrade = card.status === "for_trade";
  const serial =
    card.serial_number && card.print_run
      ? `${card.serial_number}/${card.print_run}`
      : card.serial_number ?? (card.print_run ? `/${card.print_run}` : null);
  const insertSetLabel = card.insert_set ? titleCase(card.insert_set) : null;

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    const { error } = await supabase.from("cards").delete().eq("id", card.id);

    if (error) {
      setDeleteError(error.message);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setConfirmOpen(false);
    router.refresh();
  }

  async function handleToggleSave() {
    setTogglingSave(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      setTogglingSave(false);
      return;
    }

    if (saved) {
      const { error } = await supabase
        .from("saved_cards")
        .delete()
        .eq("user_id", user.id)
        .eq("card_id", card.id);
      if (!error) setSaved(false);
    } else {
      const { error } = await supabase
        .from("saved_cards")
        .insert({ user_id: user.id, card_id: card.id });
      if (!error) setSaved(true);
    }

    setTogglingSave(false);
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

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40">
      <div className="relative aspect-[5/7] w-full bg-surface">
        {card.image_url ? (
          <Image
            src={card.image_url}
            alt={`${card.player_name} card`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted" />
          </div>
        )}
        {(isOwner || showSaveButton) && (
          <div className="absolute left-2 top-2 flex gap-1">
            {isOwner && (
              <>
                <Link
                  href={`/collection/${card.id}/edit`}
                  title="Edit card"
                  className="rounded-full bg-background/80 p-1.5 text-text backdrop-blur transition-colors hover:bg-background hover:text-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  title="Delete card"
                  onClick={() => setConfirmOpen(true)}
                  className="rounded-full bg-background/80 p-1.5 text-text backdrop-blur transition-colors hover:bg-background hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {showSaveButton && (
              <button
                type="button"
                title={saved ? "Remove from saved cards" : "Save card"}
                onClick={handleToggleSave}
                disabled={togglingSave}
                className="rounded-full bg-background/80 p-1.5 text-text backdrop-blur transition-colors hover:bg-background hover:text-primary disabled:opacity-60"
              >
                <Heart className={`h-3.5 w-3.5 ${saved ? "fill-primary text-primary" : ""}`} />
              </button>
            )}
          </div>
        )}
        <div className="absolute right-2 top-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-text ${
              forTrade ? "bg-[#14532D]" : "bg-[#21262D]"
            }`}
          >
            {forTrade ? "For Trade" : "Personal Collection"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-text">{card.player_name}</h3>
          {(card.is_autograph || card.is_relic) && (
            <span className="flex shrink-0 gap-1">
              {card.is_autograph && (
                <span title="Autographed" className="text-primary">
                  <PenLine className="h-4 w-4" />
                </span>
              )}
              {card.is_relic && (
                <span title="Relic / patch" className="text-primary">
                  <Shirt className="h-4 w-4" />
                </span>
              )}
            </span>
          )}
        </div>
        {card.team && <p className="truncate text-sm text-muted">{card.team}</p>}
        {card.set_name && <p className="text-sm text-text">{card.set_name}</p>}
        {insertSetLabel && <p className="text-xs text-muted">{insertSetLabel}</p>}
        {(card.parallel || serial) && (
          <p className="text-xs text-muted">
            {[card.parallel, serial].filter(Boolean).join(" · ")}
          </p>
        )}

        {!isOwner && ownerUsername && (
          <Link
            href={`/profile/${ownerUsername}`}
            className="mt-1 flex items-center gap-1.5 text-xs text-muted hover:text-text"
          >
            <Avatar src={ownerAvatarUrl} alt={ownerUsername} size={18} />
            @{ownerUsername}
          </Link>
        )}

        {forTrade && !isOwner && ownerAllowsContact && (
          <button
            type="button"
            onClick={handleContact}
            disabled={contacting}
            className="btn-primary mt-3 w-full disabled:opacity-60"
          >
            <MessageCircle className="h-4 w-4" />
            {contacting ? "Opening chat..." : "Kontakt"}
          </button>
        )}
      </div>

      {isOwner && (
        <ConfirmDialog
          open={confirmOpen}
          title="Delete this card?"
          description={
            <>
              This will permanently remove {card.player_name} from your collection. This can’t
              be undone.
              {deleteError && <span className="mt-2 block text-red-400">{deleteError}</span>}
            </>
          }
          confirmLabel="Delete"
          confirming={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
