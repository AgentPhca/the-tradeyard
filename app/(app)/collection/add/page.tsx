import { CardForm } from "@/components/cards/CardForm";
import type { CardStatus } from "@/lib/types/database";

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
    status?: string;
  }>;
}) {
  const { catalogId, set, team, insertSet, personalTeam, personalPlayer, status } =
    await searchParams;

  // From the "Looking For" success CTA (?status=for_trade) — starts the
  // form with a trade offer already selected instead of the usual
  // personal_collection default, since that's the whole point of arriving
  // here from that link. Validated against the real CardStatus values
  // rather than passed through as a raw string, since it's untrusted
  // user-controlled query-param input.
  const initialStatus: CardStatus | undefined =
    status === "for_trade" || status === "personal_collection" || status === "traded"
      ? status
      : undefined;

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

  return (
    <CardForm
      mode="create"
      initialCatalogId={catalogId}
      returnTo={returnTo}
      initialStatus={initialStatus}
    />
  );
}
