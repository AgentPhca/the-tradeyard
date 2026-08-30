"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageOff, MessageCircle, Pencil, PenLine, Shirt, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { titleCase } from "@/lib/utils/text";
import type { Card as CardData } from "@/lib/types/database";

interface TradingCardProps {
  card: CardData;
  isOwner?: boolean;
}

export function TradingCard({ card, isOwner = false }: TradingCardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        {isOwner && (
          <div className="absolute left-2 top-2 flex gap-1">
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

        {forTrade && (
          <button
            type="button"
            className="btn-primary mt-3 w-full"
          >
            <MessageCircle className="h-4 w-4" />
            Kontakt
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
