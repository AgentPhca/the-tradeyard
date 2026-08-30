"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { titleCase } from "@/lib/utils/text";
import type { Wishlist } from "@/lib/types/database";

interface WishlistRequestCardProps {
  entry: Wishlist;
  isOwner?: boolean;
  ownerUsername?: string;
  ownerAvatarUrl?: string | null;
}

export function WishlistRequestCard({
  entry,
  isOwner = false,
  ownerUsername,
  ownerAvatarUrl,
}: WishlistRequestCardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const details = [
    entry.team,
    entry.set_name,
    entry.insert_set ? titleCase(entry.insert_set) : null,
    entry.parallel,
  ].filter(Boolean);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    const { error } = await supabase.from("wishlist").delete().eq("id", entry.id);

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
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-text">{entry.player_name}</h3>
        {isOwner && (
          <button
            type="button"
            title="Remove request"
            onClick={() => setConfirmOpen(true)}
            className="text-muted transition-colors hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {details.length > 0 && <p className="text-sm text-muted">{details.join(" · ")}</p>}
      {entry.notes && <p className="text-sm text-text">{entry.notes}</p>}

      {!isOwner && ownerUsername && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-3">
          <Link
            href={`/profile/${ownerUsername}`}
            className="flex items-center gap-2 text-sm text-muted hover:text-text"
          >
            <Avatar src={ownerAvatarUrl} alt={ownerUsername} size={24} />
            @{ownerUsername}
          </Link>
          <button type="button" className="btn-secondary">
            <MessageCircle className="h-4 w-4" />
            Kontakt
          </button>
        </div>
      )}

      {isOwner && (
        <ConfirmDialog
          open={confirmOpen}
          title="Remove this request?"
          description={
            <>
              This will remove your &ldquo;{entry.player_name}&rdquo; request from Looking For.
              {deleteError && <span className="mt-2 block text-red-400">{deleteError}</span>}
            </>
          }
          confirmLabel="Remove"
          confirming={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
