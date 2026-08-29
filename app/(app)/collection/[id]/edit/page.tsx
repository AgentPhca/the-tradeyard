import { notFound } from "next/navigation";
import { CardForm } from "@/components/cards/CardForm";
import { createClient } from "@/lib/supabase/server";

export default async function EditCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: card } = await supabase.from("cards").select("*").eq("id", id).single();

  if (!card || card.owner_id !== user.id) {
    notFound();
  }

  return <CardForm mode="edit" card={card} />;
}
