import { CardForm } from "@/components/cards/CardForm";

export default async function AddCardPage({
  searchParams,
}: {
  searchParams: Promise<{ catalogId?: string }>;
}) {
  const { catalogId } = await searchParams;
  return <CardForm mode="create" initialCatalogId={catalogId} />;
}
