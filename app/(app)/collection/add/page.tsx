import { CardForm } from "@/components/cards/CardForm";

export default async function AddCardPage({
  searchParams,
}: {
  searchParams: Promise<{
    catalogId?: string;
    set?: string;
    team?: string;
    insertSet?: string;
    personalTeam?: string;
    personalPlayer?: string;
  }>;
}) {
  const { catalogId, set, team, insertSet, personalTeam, personalPlayer } = await searchParams;

  // Coming from a checklist album's empty slot (?set=&team= for BaseYard,
  // ?set=&insertSet= for InsertYard, ?set=&personalTeam=/&personalPlayer=
  // for TeamYard/PlayerYard, alongside catalogId) — saving should land back
  // on that exact checklist, not just /collection, so the user doesn't
  // lose their place. Category (Base/Insert/Value/Parallel) isn't known
  // here — PersonalYardAlbum re-derives it itself once it re-fetches the
  // catalog row, same as how BaseYard/InsertYard's own return links only
  // carry Set+grouping, not which checklist row was picked.
  let returnTo = "/collection";
  if (set && team) {
    returnTo = `/collection?yard=base&baseSet=${encodeURIComponent(set)}&baseTeam=${encodeURIComponent(team)}`;
  } else if (set && insertSet) {
    returnTo = `/collection?yard=insert&insertYardSet=${encodeURIComponent(set)}&insertYardInsert=${encodeURIComponent(insertSet)}`;
  } else if (set && personalTeam) {
    returnTo = `/collection?yard=teamyard&teamYardSet=${encodeURIComponent(set)}`;
  } else if (set && personalPlayer) {
    returnTo = `/collection?yard=playeryard&playerYardSet=${encodeURIComponent(set)}`;
  }

  return <CardForm mode="create" initialCatalogId={catalogId} returnTo={returnTo} />;
}
