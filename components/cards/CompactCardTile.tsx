import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";

interface CompactCardTileProps {
  href: string;
  imageUrl: string | null;
  title: string;
  subtitle?: string | null;
  tag?: string | null;
}

// A small, non-interactive card tile for a horizontally-scrolling row —
// "Also in your collection" and "You might also like" on the Card Detail
// page both use this, rather than the full TradingCard (which carries
// owner actions/save-button state this context doesn't need).
export function CompactCardTile({ href, imageUrl, title, subtitle, tag }: CompactCardTileProps) {
  return (
    <Link
      href={href}
      className="flex w-28 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/40"
    >
      <div className="relative aspect-[5/7] w-full bg-surface">
        {imageUrl ? (
          <Image src={imageUrl} alt={title} fill sizes="112px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-6 w-6 text-muted" />
          </div>
        )}
        {tag && (
          <span className="absolute bottom-1 left-1 right-1 truncate rounded-full bg-background/80 px-1.5 py-0.5 text-center text-[9px] font-medium text-primary">
            {tag}
          </span>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="truncate text-xs font-medium text-text" title={title}>
          {title}
        </p>
        {subtitle && (
          <p className="truncate text-[10px] text-muted" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
