import Link from "next/link";
import { Plus } from "lucide-react";
import { CollectionBrowser } from "@/components/collection/CollectionBrowser";
import { VisibilityToggle } from "@/components/profile/VisibilityToggle";
import { createClient } from "@/lib/supabase/server";
import type { Card } from "@/lib/types/database";

export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cards: Card[] = [];
  let showPersonalCollection = false;
  if (user) {
    const [{ data: cardData }, { data: profile }] = await Promise.all([
      supabase
        .from("cards")
        .select("*")
        .eq("owner_id", user.id)
        .neq("status", "traded")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("show_personal_collection").eq("id", user.id).single(),
    ]);
    cards = cardData ?? [];
    showPersonalCollection = profile?.show_personal_collection ?? false;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">My Collection</h1>
          <p className="mt-1 text-sm text-muted">Every card you own, all in one place.</p>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <VisibilityToggle profileId={user.id} initialValue={showPersonalCollection} />
          )}
          <Link href="/collection/add" className="btn-primary">
            <Plus className="h-4 w-4" />
            Add Card
          </Link>
        </div>
      </div>

      <CollectionBrowser cards={cards} />
    </div>
  );
}
