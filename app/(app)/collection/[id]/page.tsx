import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageOff, PenLine, Shirt } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { BackButton } from "@/components/collection/BackButton";
import { CardDetailActions } from "@/components/collection/CardDetailActions";
import { createClient } from "@/lib/supabase/server";
import { titleCase } from "@/lib/utils/text";

const ROLE_LABEL: Record<string, string> = {
  collector: "Collector",
  retailer: "Retailer",
  streamer: "Streamer",
};

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: card } = await supabase.from("cards").select("*").eq("id", id).single();

  if (!card) {
    notFound();
  }

  const isOwner = user?.id === card.owner_id;

  const { data: owner } = await supabase
    .from("profiles")
    .select("username, avatar_url, role, allow_contact, show_personal_collection")
    .eq("id", card.owner_id)
    .single();

  if (!owner) {
    notFound();
  }

  // Personal-collection cards are private to their owner unless the owner
  // has opted in via show_personal_collection — the same rule the cards
  // RLS policy enforces at the database level, and the same rule the
  // Profile page's "My Collection" tab now uses, so this route and the
  // profile grid stay consistent.
  if (!isOwner && card.status === "personal_collection" && !owner.show_personal_collection) {
    notFound();
  }

  const forTrade = card.status === "for_trade";
  const traded = card.status === "traded";
  const serial =
    card.serial_number && card.print_run
      ? `${card.serial_number}/${card.print_run}`
      : card.serial_number ?? (card.print_run ? `/${card.print_run}` : null);

  const details: { label: string; value: string }[] = [
    { label: "Set", value: card.set_name ?? "" },
    { label: "Insert Set", value: card.insert_set ? titleCase(card.insert_set) : "" },
    { label: "Parallel", value: card.parallel ?? "" },
    { label: "Serial Number", value: serial ?? "" },
    { label: "Condition", value: card.condition ?? "" },
  ].filter((row) => row.value);

  return (
    <div>
      <BackButton />

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="w-full lg:max-w-sm">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-surface">
            {card.image_url ? (
              <Image
                src={card.image_url}
                alt={`${card.player_name} card`}
                fill
                sizes="(min-width: 1024px) 384px, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff className="h-10 w-10 text-muted" />
              </div>
            )}
            <div className="absolute right-2 top-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  traded
                    ? "bg-[#30363D] text-muted"
                    : forTrade
                      ? "bg-[#14532D] text-text"
                      : "bg-[#21262D] text-text"
                }`}
              >
                {traded ? "Traded" : forTrade ? "For Trade" : "Personal Collection"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-text">{card.player_name}</h1>
              {card.team && <p className="mt-1 text-base text-muted">{card.team}</p>}
            </div>
            {(card.is_autograph || card.is_relic) && (
              <div className="flex shrink-0 gap-2">
                {card.is_autograph && (
                  <span
                    title="Autographed"
                    className="flex items-center gap-1 text-xs text-primary"
                  >
                    <PenLine className="h-4 w-4" />
                    Auto
                  </span>
                )}
                {card.is_relic && (
                  <span
                    title="Relic / patch"
                    className="flex items-center gap-1 text-xs text-primary"
                  >
                    <Shirt className="h-4 w-4" />
                    Relic
                  </span>
                )}
              </div>
            )}
          </div>

          {details.length > 0 && (
            <dl className="mt-6 divide-y divide-border rounded-lg border border-border">
              {details.map((row) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-3 text-sm">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="font-medium text-text">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <Link
            href={`/profile/${owner.username}`}
            className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary/40"
          >
            <Avatar src={owner.avatar_url} alt={owner.username} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">@{owner.username}</p>
              <Badge className="mt-1">{ROLE_LABEL[owner.role] ?? owner.role}</Badge>
            </div>
          </Link>

          <CardDetailActions
            card={card}
            isOwner={isOwner}
            ownerUsername={owner.username}
            ownerAllowsContact={owner.allow_contact}
          />
        </div>
      </div>
    </div>
  );
}
