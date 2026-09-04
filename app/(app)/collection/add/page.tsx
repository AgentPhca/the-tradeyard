import { CardForm } from "@/components/cards/CardForm";

export default async function AddCardPage({
  searchParams,
}: {
  searchParams: Promise<{ catalogId?: string; set?: string; team?: string }>;
}) {
  const { catalogId, set, team } = await searchParams;

  // Coming from a BaseYard sticker-album empty slot (?set=&team= alongside
  // catalogId) — saving should land back on that exact Set+Team checklist,
  // not just /collection, so the user doesn't lose their place.
  const returnTo =
    set && team
      ? `/collection?yard=base&baseSet=${encodeURIComponent(set)}&baseTeam=${encodeURIComponent(team)}`
      : "/collection";

  return <CardForm mode="create" initialCatalogId={catalogId} returnTo={returnTo} />;
}
