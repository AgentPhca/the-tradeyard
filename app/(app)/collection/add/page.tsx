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
    personalCategory?: string;
    status?: string;
  }>;
}) {
  const { catalogId, set, team, insertSet, personalTeam, personalPlayer, personalCategory, status } =
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
  // (+&personalCategory=) for TeamYard/PlayerYard, alongside catalogId) —
  // saving should land back on that exact checklist, not just /collection,
  // so the user doesn't lose their place. personalCategory is optional
  // (omitted until a category tab is actually picked, same as
  // team/insertSet), so this still degrades to "just the Set restored" in
  // that case rather than sending a stale/empty category param through.
  let returnTo = "/collection";
  if (set && team) {
    returnTo = `/collection?yard=base&baseSet=${encodeURIComponent(set)}&baseTeam=${encodeURIComponent(team)}`;
  } else if (set && insertSet) {
    returnTo = `/collection?yard=insert&insertYardSet=${encodeURIComponent(set)}&insertYardInsert=${encodeURIComponent(insertSet)}`;
  } else if (set && personalTeam) {
    const categoryParam = personalCategory
      ? `&teamYardCategory=${encodeURIComponent(personalCategory)}`
      : "";
    returnTo = `/collection?yard=teamyard&teamYardSet=${encodeURIComponent(set)}${categoryParam}`;
  } else if (set && personalPlayer) {
    const categoryParam = personalCategory
      ? `&playerYardCategory=${encodeURIComponent(personalCategory)}`
      : "";
    returnTo = `/collection?yard=playeryard&playerYardSet=${encodeURIComponent(set)}${categoryParam}`;
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
