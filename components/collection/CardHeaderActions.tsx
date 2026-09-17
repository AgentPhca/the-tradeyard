"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";

interface CardHeaderActionsProps {
  cardId: string;
  playerName: string;
  // Powers the "Add Parallel" button below — null for a freetext-entered
  // card with no card_catalog row to prefill from, in which case the
  // button is simply omitted rather than linking somewhere broken.
  catalogId: string | null;
  setName: string | null;
  team: string | null;
  insertSet: string | null;
  // From lib/utils/cardClassification.ts's isPureBase(card) — the actual
  // BaseYard-vs-InsertYard signal. NOT the same as "insertSet is filled":
  // plenty of genuine Base rows carry a raw PDF-section-heading insert_set
  // like "ROOKIES", so checking insertSet's presence instead of this would
  // send a Base card's parallel back to InsertYard.
  isPureBaseCard: boolean;
}

// Same (set, team)/(set, insertSet) query params BaseYard/InsertYard's own
// empty-slot links use (see ChecklistAlbum.tsx's addCardHref) — reusing
// them here is what makes app/(app)/collection/add/page.tsx's existing
// returnTo logic send the save back to the right checklist afterwards,
// instead of falling back to plain /collection.
function buildAddParallelHref(
  catalogId: string,
  setName: string | null,
  team: string | null,
  insertSet: string | null,
  isPureBaseCard: boolean
): string {
  const base = `/collection/add?catalogId=${catalogId}`;
  if (isPureBaseCard) {
    if (setName && team) {
      return `${base}&set=${encodeURIComponent(setName)}&team=${encodeURIComponent(team)}`;
    }
  } else if (setName && insertSet) {
    return `${base}&set=${encodeURIComponent(setName)}&insertSet=${encodeURIComponent(insertSet)}`;
  }
  return base;
}

// Owner-only Edit/Add Parallel/Delete, split out of the old combined
// CardDetailActions so it can render as small buttons next to the player
// name in the title row instead of as full-width buttons further down the
// page — see CardStatusSelect for the status control, now between the
// description and the owner-link box.
export function CardHeaderActions({
  cardId,
  playerName,
  catalogId,
  setName,
  team,
  insertSet,
  isPureBaseCard,
}: CardHeaderActionsProps) {
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
        {catalogId && (
          <Link
            href={buildAddParallelHref(catalogId, setName, team, insertSet, isPureBaseCard)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-text transition-colors hover:border-primary/40"
          >
            <Layers className="h-3.5 w-3.5" />
            Add Parallel
          </Link>
        )}
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
