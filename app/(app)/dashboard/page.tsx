import Image from "next/image";
import Link from "next/link";
import { Boxes, Layers } from "lucide-react";
import { HeroSlider } from "@/components/dashboard/HeroSlider";
import { MarketplaceFeedSection } from "@/components/dashboard/MarketplaceFeedSection";
import { MatchesCarousel } from "@/components/dashboard/MatchesCarousel";
import { PlatformPulseTiles } from "@/components/dashboard/PlatformPulseTiles";
import { YardsGrid } from "@/components/dashboard/YardsGrid";
import { getCardOfTheWeek } from "@/lib/dashboard/getCardOfTheWeek";
import { getMarketplaceFeed } from "@/lib/dashboard/getMarketplaceFeed";
import { getMatches } from "@/lib/dashboard/getMatches";
import { getPlatformPulse } from "@/lib/dashboard/getPlatformPulse";
import { getYardsSummary } from "@/lib/dashboard/getYardsSummary";
import { createClient } from "@/lib/supabase/server";
import { coverPhoto } from "@/lib/utils/cardPhotos";
import { titleCase } from "@/lib/utils/text";

// Section-to-section spacing is a fixed 28px everywhere (mobile stack AND
// each desktop column) — the mockup this page follows actually got this
// wrong on desktop (a missing closing tag collapsed two of its own
// sections together), which is exactly the trap gap-based spacing avoids:
// every section's spacing comes from the container's `gap`, never from a
// section's own margin, so there's no "forgot one" case.
const SECTION_GAP = "gap-7"; // 28px

function ProgressRing({ pct }: { pct: number }) {
  return (
    <div
      className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(#22C55E ${pct}%, #30363D ${pct}% 100%)` }}
    >
      <div className="absolute h-[50px] w-[50px] rounded-full bg-background" />
      <span className="relative font-display text-sm font-semibold text-text">{pct}%</span>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pulse = await getPlatformPulse(supabase);

  if (!user) {
    return (
      <div className={`flex flex-col ${SECTION_GAP}`}>
        <div>
          <h1 className="font-display text-2xl font-bold uppercase text-text">The Tradeyard</h1>
          <p className="mt-1 text-sm text-muted">Melde dich an, um dein Dashboard zu sehen.</p>
        </div>
        <PlatformPulseTiles pulse={pulse} />
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/login" className="btn-primary">
            Anmelden
          </Link>
          <Link href="/register" className="btn-secondary">
            Registrieren
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: profile }, { count: ownCardCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, personal_team_yard, personal_player_yard")
      .eq("id", user.id)
      .single(),
    supabase.from("cards").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
  ]);

  const username = profile?.username ?? "collector";
  const favoriteTeam = profile?.personal_team_yard ?? null;

  const [yardsSummary, marketplaceFeed, matches, cardOfTheWeek] = await Promise.all([
    getYardsSummary(supabase, user.id, {
      personal_team_yard: profile?.personal_team_yard ?? null,
      personal_player_yard: profile?.personal_player_yard ?? null,
    }),
    getMarketplaceFeed(supabase, user.id, favoriteTeam),
    getMatches(supabase, user.id),
    getCardOfTheWeek(supabase),
  ]);

  const wantedMatchCount = matches.items.filter((m) => m.type === "wanted").length;

  // --- Slide 1: Willkommen ---
  const hasAnyCards = (ownCardCount ?? 0) > 0;
  const welcomeSlide = !hasAnyCards ? (
    <>
      <ProgressRing pct={0} />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl font-bold leading-tight text-text">Starte deine erste Sammlung</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Füge deine erste Karte hinzu und dein Yard nimmt Form an.
        </p>
        <Link href="/collection" className="mt-2 inline-block text-[12.5px] font-bold text-primary">
          Zur Collection →
        </Link>
      </div>
    </>
  ) : yardsSummary.highestCompletionSet ? (
    <>
      <ProgressRing pct={yardsSummary.highestCompletionSet.pct} />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl font-bold leading-tight text-text">
          Willkommen zurück, <span className="text-primary">{titleCase(username)}</span>.
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Dein <b className="text-text">{yardsSummary.highestCompletionSet.label}</b> ist zu{" "}
          <b className="text-text">{yardsSummary.highestCompletionSet.pct}%</b> fertig
          {wantedMatchCount > 0 && (
            <>
              , und <b className="text-text">{wantedMatchCount} Sammler</b> suchen gerade Karten aus deiner Sammlung
            </>
          )}
          .
        </p>
      </div>
    </>
  ) : (
    <>
      <ProgressRing pct={0} />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl font-bold leading-tight text-text">
          Willkommen zurück, <span className="text-primary">{titleCase(username)}</span>.
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Deine Sammlung wächst — schau in deinen Yards vorbei.
        </p>
      </div>
    </>
  );

  // --- Slide 2: Personal Yard ---
  // Both Team and Player Yard can exist at once now — the slide picks
  // whichever has the LOWER completion %, since that one has more room to
  // motivate further collecting than an already-nearly-done yard would.
  const personalYardCandidate =
    yardsSummary.teamYard && yardsSummary.playerYard
      ? yardsSummary.teamYard.pct <= yardsSummary.playerYard.pct
        ? yardsSummary.teamYard
        : yardsSummary.playerYard
      : yardsSummary.teamYard ?? yardsSummary.playerYard;

  const personalYardSlide = personalYardCandidate ? (
    <>
      <ProgressRing pct={personalYardCandidate.pct} />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl font-bold leading-tight text-text">{personalYardCandidate.value}</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Dein Personal Yard ist zu <b className="text-text">{personalYardCandidate.pct}%</b> fertig (
          {personalYardCandidate.owned}/{personalYardCandidate.total} Karten).
        </p>
      </div>
    </>
  ) : (
    <>
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#E8B94A]/35 bg-[#3A2E12]/40 text-[#E8B94A]">
        <Boxes className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl font-bold leading-tight text-text">Dein eigenes Yard</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Wähle deinen Lieblingsspieler oder dein Team — wir bauen dir ein eigenes Stickeralbum daraus.
        </p>
        <Link href={`/profile/${username}/edit`} className="mt-2 inline-block text-[12.5px] font-bold text-primary">
          Personal Yard einrichten →
        </Link>
      </div>
    </>
  );

  // --- Slide 3: Card of the Week ---
  const cardOfTheWeekSlide = cardOfTheWeek ? (
    <>
      <div className="relative h-[84px] w-16 shrink-0 overflow-hidden rounded-lg border border-[#E8B94A]/40 bg-card">
        {coverPhoto(cardOfTheWeek.card) && (
          <Image src={coverPhoto(cardOfTheWeek.card)!} alt="" fill sizes="64px" className="object-cover" />
        )}
        <span className="absolute left-1 top-1 rounded bg-[#3A2E12] px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-[#E8B94A]">
          Woche {cardOfTheWeek.weekNumber}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl font-bold leading-tight text-text">Card of the Week</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          <b className="text-text">{cardOfTheWeek.card.player_name}</b> —{" "}
          {cardOfTheWeek.card.parallel ?? "Base"}
          {cardOfTheWeek.card.print_run != null && <b className="text-text"> /{cardOfTheWeek.card.print_run}</b>},
          angeboten von @{cardOfTheWeek.ownerUsername}.
        </p>
        <Link href={`/collection/${cardOfTheWeek.card.id}`} className="mt-2 inline-block text-[12.5px] font-bold text-primary">
          Karte ansehen →
        </Link>
      </div>
    </>
  ) : (
    <>
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#3B82F6]/35 bg-[#1e3a8a]/20 text-[#60A5FA]">
        <Layers className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-xl font-bold leading-tight text-text">Card of the Week</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Diese Woche noch keine besondere Karte im Marktplatz. Sei der Erste — stell eine ein.
        </p>
        <Link href="/collection/add" className="mt-2 inline-block text-[12.5px] font-bold text-primary">
          Karte einstellen →
        </Link>
      </div>
    </>
  );

  // Desktop grid: 2 columns, 3 explicitly row-paired rows (Hero/Pulse,
  // Feed/Yards, Matches/QuickActions), each item pinned via row-start +
  // col-start instead of relying on `order` + implicit auto-placement to
  // land in the right cell. `items-stretch` (grid's own default, spelled
  // out here since it's the whole point of the fix) makes the shorter
  // item in each row match the taller one's height automatically — no
  // per-row height math needed. When there's no Matches activity, row 3
  // has no left-hand pairing, so Quick Actions spans both columns instead
  // of leaving row 3's left half empty.
  return (
    <div
      className={`flex min-w-0 flex-col ${SECTION_GAP} min-[900px]:grid min-[900px]:grid-cols-[2.1fr_1fr] min-[900px]:grid-rows-[auto_auto_auto] min-[900px]:items-stretch min-[900px]:gap-x-6`}
    >
      <div className="order-1 min-w-0 min-[900px]:col-start-1 min-[900px]:row-start-1 min-[900px]:h-full">
        <HeroSlider
          slides={[
            { key: "welcome", className: "bg-gradient-to-br from-primary/10 to-transparent", content: welcomeSlide },
            {
              key: "personal-yard",
              className: "bg-gradient-to-br from-[#E8B94A]/10 to-transparent",
              content: personalYardSlide,
            },
            {
              key: "card-of-the-week",
              className: "bg-gradient-to-br from-[#3B82F6]/10 to-transparent",
              content: cardOfTheWeekSlide,
            },
          ]}
        />
      </div>

      <div className="order-2 min-w-0 min-[900px]:col-start-2 min-[900px]:row-start-1">
        <PlatformPulseTiles pulse={pulse} />
      </div>

      <div className="order-3 min-w-0 min-[900px]:col-start-1 min-[900px]:row-start-2">
        <MarketplaceFeedSection feed={marketplaceFeed} />
      </div>

      {matches.hasOwnActivity && (
        <div className="order-4 min-w-0 min-[900px]:col-start-1 min-[900px]:row-start-3">
          <MatchesCarousel matches={matches} />
        </div>
      )}

      <div className="order-5 min-w-0 min-[900px]:col-start-2 min-[900px]:row-start-2">
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <span className="text-base font-bold text-text">Deine Yards</span>
            <Link href="/collection" className="text-[12.5px] font-semibold text-primary">
              Zur Collection
            </Link>
          </div>
          <YardsGrid summary={yardsSummary} username={username} />
        </div>
      </div>

      <div
        className={`order-6 min-w-0 min-[900px]:row-start-3 ${
          matches.hasOwnActivity ? "min-[900px]:col-start-2" : "min-[900px]:col-span-2"
        }`}
      >
        <div className="flex gap-2.5">
          <Link href="/collection" className="btn-primary flex-1">
            Collection
          </Link>
          <Link href="/marketplace" className="btn-secondary flex-1">
            Marktplatz
          </Link>
        </div>
      </div>
    </div>
  );
}
