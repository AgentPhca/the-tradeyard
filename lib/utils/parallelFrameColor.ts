// Derives a card's photo-frame color purely from its parallel/insert name —
// no new DB field, works automatically for every set. Used by the Card
// Detail page only.
//
// Resolution order (first match wins):
//  1. Color word(s) found in the name — one match -> solid, 2+ -> gradient
//     in the order they appear (e.g. "Red, White, and Blue Refractor").
//  2. A known color-word-free exception (Superfractor -> gold).
//  3. A known pattern parallel (Rainbow Foil, Kaleidoscope, Holo Foil,
//     Prism(s), Tie-Dye...) -> a real rainbow gradient, with two themed
//     overrides: Camo -> olive/brown, Union Jack -> Union Jack colors.
//  4. Fallback for anything else (plain "Refractor", "X-Fractor", "Molten
//     Mercury", "Frozenfractor", "Nucleus Refractor", ...) -> silver/chrome.
export type ParallelFrameColor =
  | { type: "solid"; c1: string; c2: string }
  | { type: "gradient"; colors: string[] };

interface ColorPair {
  c1: string;
  c2: string;
}

const GOLD: ColorPair = { c1: "#E8B94A", c2: "#3A2E12" };
const SILVER: ColorPair = { c1: "#C0C6CC", c2: "#30363D" };

// Compound color phrases must be listed here (not just their parts) so a
// name like "Lime Green X-Fractor" resolves to one blended solid color
// instead of a 2-stop gradient of plain "lime" + plain "green" — the same
// reasoning that makes "Hot Pink" its own entry rather than falling back
// to plain "pink".
const COLOR_KEYWORDS: Record<string, ColorPair> = {
  red: { c1: "#F87171", c2: "#7F1D1D" },
  orange: { c1: "#F97316", c2: "#7C2D0E" },
  yellow: { c1: "#FACC15", c2: "#713F12" },
  green: { c1: "#4ADE80", c2: "#14532D" },
  "lime green": { c1: "#84CC16", c2: "#3F6212" },
  blue: { c1: "#60A5FA", c2: "#1E3A5F" },
  purple: { c1: "#A78BFA", c2: "#3C2E5C" },
  pink: { c1: "#F472B6", c2: "#701A43" },
  "hot pink": { c1: "#F472B6", c2: "#701A43" },
  black: { c1: "#6B7280", c2: "#000000" },
  white: { c1: "#F5F5F5", c2: "#9CA3AF" },
  gold: GOLD,
  silver: SILVER,
  bronze: { c1: "#CD7F32", c2: "#3F2A12" },
  teal: { c1: "#2DD4BF", c2: "#134E4A" },
  cyan: { c1: "#22D3EE", c2: "#083344" },
  magenta: { c1: "#E879F9", c2: "#4A044E" },
  lime: { c1: "#A3E635", c2: "#365314" },
  navy: { c1: "#3B4B6B", c2: "#0F172A" },
  maroon: { c1: "#9F1239", c2: "#3F0D1A" },
  turquoise: { c1: "#2DD4BF", c2: "#0F4C4C" },
  copper: { c1: "#C77B4A", c2: "#4A2A12" },
  platinum: { c1: "#E5E7EB", c2: "#4B5563" },
  emerald: { c1: "#34D399", c2: "#064E3B" },
  ruby: { c1: "#F43F5E", c2: "#4C0519" },
  sapphire: { c1: "#3B82F6", c2: "#1E3A8A" },
  amber: { c1: "#FBBF24", c2: "#78350F" },
  coral: { c1: "#FB7185", c2: "#7F1D1D" },
  crimson: { c1: "#DC143C", c2: "#4C0519" },
  mint: { c1: "#6EE7B7", c2: "#065F46" },
  olive: { c1: "#808000", c2: "#3F3F1F" },
  tan: { c1: "#D2B48C", c2: "#5C4A30" },
  beige: { c1: "#F5F0DC", c2: "#6B6045" },
  ivory: { c1: "#FFFFF0", c2: "#8A8A70" },
  charcoal: { c1: "#4B5563", c2: "#1F2937" },
  slate: { c1: "#94A3B8", c2: "#1E293B" },
  peach: { c1: "#FFCBA4", c2: "#7A4A30" },
  lavender: { c1: "#C4B5FD", c2: "#4C3A75" },
  fuchsia: { c1: "#E879F9", c2: "#701A75" },
  aqua: { c1: "#67E8F9", c2: "#164E63" },
};

const RAINBOW_COLORS = ["#EF4444", "#F97316", "#FACC15", "#22C55E", "#3B82F6", "#A855F7"];
const CAMO_COLORS = ["#4B5320", "#3F3F1F", "#6B4423"];
const UNION_JACK_COLORS = ["#C8102E", "#FFFFFF", "#012169"];

// Pattern parallels checked by substring — matched *after* color words and
// the Superfractor exception, and only reached at all when the name has
// no color word in it (e.g. plain "Camo" or "Union Jack Rainbow Foil").
const RAINBOW_PATTERN_KEYWORDS = [
  "rainbow foil",
  "kaleidoscope",
  "holo foil",
  "prism refractor",
  "prism",
  "tie-dye geometric refractor",
  "tie-dye",
];

interface ColorMatch {
  keyword: string;
  index: number;
}

// Scans for every color keyword as a whole word/phrase, longest keyword
// first so a compound like "hot pink" claims its span before plain "pink"
// gets a chance at the same text, and skips any candidate whose span
// overlaps one already claimed. Word boundaries avoid false positives like
// "tan" inside "Titanium" or "red" inside "Credit".
function findColorMatches(name: string): ColorMatch[] {
  const claimed: [number, number][] = [];
  const matches: ColorMatch[] = [];
  const orderedKeywords = Object.keys(COLOR_KEYWORDS).sort((a, b) => b.length - a.length);

  for (const keyword of orderedKeywords) {
    const pattern = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "g");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(name)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = claimed.some(([s, e]) => start < e && end > s);
      if (!overlaps) {
        claimed.push([start, end]);
        matches.push({ keyword, index: start });
      }
    }
  }

  return matches.sort((a, b) => a.index - b.index);
}

export function getParallelFrameColor(parallelName: string): ParallelFrameColor {
  const name = parallelName.toLowerCase();

  // 1) Color word(s) in the name.
  const colorMatches = findColorMatches(name);
  if (colorMatches.length === 1) {
    const pair = COLOR_KEYWORDS[colorMatches[0].keyword];
    return { type: "solid", c1: pair.c1, c2: pair.c2 };
  }
  if (colorMatches.length >= 2) {
    return { type: "gradient", colors: colorMatches.map((m) => COLOR_KEYWORDS[m.keyword].c1) };
  }

  // 2) Known exception with no color word.
  if (name.includes("superfractor")) {
    return { type: "solid", c1: GOLD.c1, c2: GOLD.c2 };
  }

  // 3) Pattern parallels, with two themed overrides.
  if (name.includes("union jack")) {
    return { type: "gradient", colors: UNION_JACK_COLORS };
  }
  if (name.includes("camo")) {
    return { type: "gradient", colors: CAMO_COLORS };
  }
  if (RAINBOW_PATTERN_KEYWORDS.some((keyword) => name.includes(keyword))) {
    return { type: "gradient", colors: RAINBOW_COLORS };
  }

  // 4) Fallback — plain "Refractor", "X-Fractor", "Molten Mercury",
  // "Frozenfractor", "Nucleus Refractor", "Football Leather Refractor",
  // and any other parallel with no recognizable color or pattern.
  return { type: "solid", c1: SILVER.c1, c2: SILVER.c2 };
}

// The CSS background for the frame, matching the app's existing gradient
// border style (a 3-stop diagonal fade into the border token for solids;
// a straight diagonal sweep across every listed color for gradients/
// patterns).
export function parallelFrameBackground(color: ParallelFrameColor): string {
  if (color.type === "solid") {
    return `linear-gradient(155deg, ${color.c1} 0%, ${color.c2} 55%, #30363D 100%)`;
  }
  return `linear-gradient(135deg, ${color.colors.join(", ")})`;
}
