import { CardForm } from "@/components/cards/CardForm";

export default async function AddCardPage({
  searchParams,
}: {
  searchParams: Promise<{ catalogId?: string; set?: string; team?: string; insertSet?: string }>;
}) {
  const { catalogId, set, team, insertSet } = await searchParams;

  // Coming from a checklist album's empty slot (?set=&team= for BaseYard,
  // ?set=&insertSet= for InsertYard, alongside catalogId) — saving should
  // land back on that exact checklist, not just /collection, so the user
  // doesn't lose their place.
  let returnTo = "/collection";
  if (set && team) {
    returnTo = `/collection?yard=base&baseSet=${encodeURIComponent(set)}&baseTeam=${encodeURIComponent(team)}`;
  } else if (set && insertSet) {
    returnTo = `/collection?yard=insert&insertYardSet=${encodeURIComponent(set)}&insertYardInsert=${encodeURIComponent(insertSet)}`;
  }

  return <CardForm mode="create" initialCatalogId={catalogId} returnTo={returnTo} />;
}
