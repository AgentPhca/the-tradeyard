"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";

interface CardHeaderActionsProps {
  cardId: string;
  playerName: string;
}

// Owner-only Edit/Delete, split out of the old combined CardDetailActions
// so it can render as small buttons next to the player name in the title
// row instead of as full-width buttons further down the page — see
// CardStatusSelect for the status control, now between the description
// and the owner-link box.
export function CardHeaderActions({ cardId, playerName }: CardHeaderActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    const { error } = await supabase.from("cards").delete().eq("id", cardId);

    if (error) {
      setDeleteError(error.message);
      setDeleting(false);
      return;
    }

    router.push("/collection");
    router.refresh();
  }

  return (
    <>
      <div className="flex shrink-0 gap-2 pt-1">
        <Link
          href={`/collection/${cardId}/edit`}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-text transition-colors hover:border-primary/40"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit Card
        </Link>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-red-500/35 bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this card?"
        description={
          <>
            This will permanently remove {playerName} from your collection. This can’t be
            undone.
            {deleteError && <span className="mt-2 block text-red-400">{deleteError}</span>}
          </>
        }
        confirmLabel="Delete"
        confirming={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
