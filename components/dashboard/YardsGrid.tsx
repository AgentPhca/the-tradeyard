import Link from "next/link";
import { Layers, LayoutGrid, Plus, Shapes, Sparkles, Star, User, Users } from "lucide-react";
import type { YardsSummary } from "@/lib/dashboard/getYardsSummary";

interface YardsGridProps {
  summary: YardsSummary;
  username: string;
}

function ProgressTile({
  href,
  icon: Icon,
  label,
  pct,
}: {
  href: string;
  icon: typeof Layers;
  label: string;
  pct: number;
}) {
  return (
    <Link href={href} className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
          <Icon className="h-3.5 w-3.5 text-muted" />
          {label}
        </span>
        <span className="text-xs font-bold text-primary">{pct}%</span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}

function CountTile({
  href,
  icon: Icon,
  label,
  count,
  sub,
}: {
  href: string;
  icon: typeof Layers;
  label: string;
  count: number;
  sub: string;
}) {
  return (
    <Link href={href} className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
          <Icon className="h-3.5 w-3.5 text-muted" />
          {label}
        </span>
        <span className="text-xs font-bold text-[#E8B94A]">{count}</span>
      </div>
      <p className="text-[11px] text-muted">{sub}</p>
    </Link>
  );
}

// "Deine Yards" — the tile grid that replaced the old 4 flat stat tiles.
// BaseYard/InsertYard are real per-set checklists so they get a % bar;
// ValueYard/RookieYard/ParallelYard are plain filtered lists with no fixed
// target size, so they're a count instead (see getYardsSummary.ts's note
// on why ParallelYard in particular can't be a checklist %). TeamYard and
// PlayerYard are independent — 0, 1, or 2 extra tiles depending on what's
// configured; the dashed "+" setup tile only shows when neither is set
// (once at least one exists, there's nothing left to "add" from here —
// the other one, if wanted, is still just a field away in Edit Profile).
export function YardsGrid({ summary, username }: YardsGridProps) {
  const profileEditHref = `/profile/${username}/edit`;
  const hasAnyPersonalYard = Boolean(summary.teamYard || summary.playerYard);

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <ProgressTile href="/collection?yard=base" icon={Layers} label="BaseYard" pct={summary.baseYard.pct} />
      <ProgressTile href="/collection?yard=insert" icon={LayoutGrid} label="InsertYard" pct={summary.insertYard.pct} />
      <CountTile
        href="/collection?yard=parallel"
        icon={Shapes}
        label="ParallelYard"
        count={summary.parallelYardCount}
        sub="Karten mit Parallel"
      />
      <CountTile
        href="/collection?yard=value"
        icon={Star}
        label="ValueYard"
        count={summary.valueYardCount}
        sub="seltene Karten"
      />
      <CountTile
        href="/collection?yard=rookie"
        icon={Sparkles}
        label="RookieYard"
        count={summary.rookieYardCount}
        sub="Rookie Cards"
      />
      {summary.teamYard && (
        <ProgressTile href="/collection?yard=teamyard" icon={Users} label={summary.teamYard.value} pct={summary.teamYard.pct} />
      )}
      {summary.playerYard && (
        <ProgressTile
          href="/collection?yard=playeryard"
          icon={User}
          label={summary.playerYard.value}
          pct={summary.playerYard.pct}
        />
      )}
      {!hasAnyPersonalYard && (
        <Link
          href={profileEditHref}
          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border p-3 text-center text-xs font-semibold text-muted transition-colors hover:border-primary/40 hover:text-text"
        >
          <Plus className="h-[18px] w-[18px]" />
          Personal Yard
        </Link>
      )}
    </div>
  );
}
